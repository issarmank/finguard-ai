import json
import re
import uuid
from datetime import date, datetime, timedelta, timezone

import sqlglot
from fastapi import HTTPException, status
from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.account import Account
from app.models.journal import JournalEntry, LedgerLine
from app.schemas.ai import (
    AuditReportResponse,
    FraudFlag,
    FraudScanResponse,
    TextToSQLResponse,
)
from app.services.openrouter_client import chat_completion

MODEL = "google/gemini-2.5-flash"

# ---------------------------------------------------------------------------
# Schema context injected into every Text-to-SQL prompt
# ---------------------------------------------------------------------------

_SCHEMA_CONTEXT = """
Tables (already tenant-scoped via Row-Level Security — do NOT filter by tenant_id):

  accounts(id, code, name, type, normal_side, is_active)
    type: asset | liability | equity | income | expense
    normal_side: debit | credit

  journal_entries(id, entry_date, description, reference, status, is_locked, created_at)
    status: draft | posted | voided

  ledger_lines(id, journal_entry_id, account_id, side, amount, memo)
    side: debit | credit
    amount: NUMERIC(19,4), always positive

  audit_logs(id, action, entity_type, entity_id, created_at)
"""

_SQL_RULES = """
RULES (violations will cause an error):
1. Only SELECT statements — no INSERT, UPDATE, DELETE, DROP, ALTER, CREATE, TRUNCATE.
2. JOINs and aggregations (SUM, COUNT, AVG, GROUP BY) are allowed.
3. Always include LIMIT ≤ 500.
4. Return ONLY the raw SQL — no markdown fences, no explanations.
"""


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _strip_fences(raw: str) -> str:
    raw = raw.strip()
    raw = re.sub(r"^```(?:sql)?\s*", "", raw, flags=re.IGNORECASE)
    raw = re.sub(r"\s*```$", "", raw)
    return raw.strip().rstrip(";")


def _validate_sql(sql: str) -> None:
    try:
        statements = sqlglot.parse(sql, dialect="postgres")
    except sqlglot.errors.ParseError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Generated SQL could not be parsed: {e}",
        )

    if len(statements) != 1 or statements[0] is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Expected exactly one SQL statement",
        )

    if not isinstance(statements[0], sqlglot.exp.Select):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Only SELECT statements are allowed",
        )

    upper = sql.upper()
    for kw in ("INSERT", "UPDATE", "DELETE", "DROP", "TRUNCATE", "ALTER", "CREATE", "GRANT", "REVOKE"):
        if re.search(rf"\b{kw}\b", upper):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Forbidden SQL keyword detected: {kw}",
            )


# ---------------------------------------------------------------------------
# Text-to-SQL
# ---------------------------------------------------------------------------

async def text_to_sql(
    db: AsyncSession,
    query: str,
) -> TextToSQLResponse:
    system_prompt = (
        "You are a SQL expert for a double-entry financial ledger.\n"
        f"{_SCHEMA_CONTEXT}\n{_SQL_RULES}"
    )

    raw = await chat_completion(
        model=MODEL,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": query},
        ],
    )

    sql = _strip_fences(raw)
    _validate_sql(sql)

    if "LIMIT" not in sql.upper():
        sql = f"{sql} LIMIT 500"

    try:
        result = await db.execute(text(sql))
        rows = [dict(row._mapping) for row in result.fetchall()]
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"SQL execution failed: {e}",
        )

    return TextToSQLResponse(query=query, sql=sql, results=rows, row_count=len(rows))


# ---------------------------------------------------------------------------
# Fraud Scan
# ---------------------------------------------------------------------------

async def fraud_scan(
    db: AsyncSession,
    tenant_id: uuid.UUID,
    days_back: int = 30,
) -> FraudScanResponse:
    cutoff = datetime.now(timezone.utc) - timedelta(days=days_back)

    # Total entries in window
    total = await db.scalar(
        select(func.count(JournalEntry.id)).where(
            JournalEntry.tenant_id == tenant_id,
            JournalEntry.created_at >= cutoff,
        )
    ) or 0

    # Round-amount signal: entries with any line that is a multiple of 1000 >= 1000
    round_count = await db.scalar(
        select(func.count(func.distinct(LedgerLine.journal_entry_id)))
        .join(JournalEntry, JournalEntry.id == LedgerLine.journal_entry_id)
        .where(
            JournalEntry.tenant_id == tenant_id,
            JournalEntry.created_at >= cutoff,
            func.mod(LedgerLine.amount, 1000) == 0,
            LedgerLine.amount >= 1000,
        )
    ) or 0

    # Off-hours signal: entries created between 11pm and 5am
    off_hours_count = await db.scalar(
        select(func.count(JournalEntry.id)).where(
            JournalEntry.tenant_id == tenant_id,
            JournalEntry.created_at >= cutoff,
            func.extract("hour", JournalEntry.created_at).in_(
                [23, 0, 1, 2, 3, 4]
            ),
        )
    ) or 0

    # Duplicate reference signal
    dup_refs = await db.scalar(
        select(func.count()).select_from(
            select(JournalEntry.reference)
            .where(
                JournalEntry.tenant_id == tenant_id,
                JournalEntry.created_at >= cutoff,
                JournalEntry.reference.isnot(None),
            )
            .group_by(JournalEntry.reference)
            .having(func.count(JournalEntry.id) > 1)
            .subquery()
        )
    ) or 0

    # Sample recent entries for LLM context
    recent = await db.scalars(
        select(JournalEntry)
        .where(JournalEntry.tenant_id == tenant_id, JournalEntry.created_at >= cutoff)
        .order_by(JournalEntry.created_at.desc())
        .limit(25)
    )

    context = {
        "period_days": days_back,
        "total_entries": total,
        "signals": {
            "round_amounts": int(round_count),
            "off_hours_entries": int(off_hours_count),
            "duplicate_references": int(dup_refs),
        },
        "recent_entries": [
            {
                "date": str(e.entry_date),
                "description": e.description,
                "reference": e.reference,
                "status": e.status,
                "created_at": e.created_at.isoformat() if e.created_at else None,
            }
            for e in recent.all()
        ],
    }

    system_prompt = (
        "You are a financial fraud detection expert analysing ledger transactions.\n"
        "Return a JSON object with exactly these fields:\n"
        '{"risk_score": <float 0.0-1.0>, "risk_level": <"low"|"medium"|"high"|"critical">, '
        '"flags": [{"flag_type": <str>, "description": <str>}], '
        '"explanation": <str>, "recommended_action": <str>}\n'
        "Return ONLY the JSON object."
    )

    raw = await chat_completion(
        model=MODEL,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"Analyse:\n{json.dumps(context, indent=2)}"},
        ],
        response_format={"type": "json_object"},
    )

    try:
        data = json.loads(raw)
        return FraudScanResponse(
            risk_score=float(data["risk_score"]),
            risk_level=data["risk_level"],
            flags=[FraudFlag(**f) for f in data.get("flags", [])],
            explanation=data["explanation"],
            recommended_action=data["recommended_action"],
            entries_analyzed=total,
        )
    except (KeyError, ValueError) as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"AI response parsing failed: {e}",
        )


# ---------------------------------------------------------------------------
# Audit Report
# ---------------------------------------------------------------------------

async def generate_audit_report(
    db: AsyncSession,
    tenant_id: uuid.UUID,
    date_from: date,
    date_to: date,
    include_voided: bool = False,
) -> AuditReportResponse:
    entry_query = select(func.count(JournalEntry.id)).where(
        JournalEntry.tenant_id == tenant_id,
        JournalEntry.entry_date >= date_from,
        JournalEntry.entry_date <= date_to,
    )
    total_entries = await db.scalar(entry_query) or 0

    voided_entries = await db.scalar(
        entry_query.where(JournalEntry.status == "voided")  # type: ignore[arg-type]
    ) or 0

    # Account activity for the period
    balance_rows = await db.execute(
        select(
            Account.code,
            Account.name,
            Account.type,
            func.coalesce(
                func.sum(LedgerLine.amount).filter(LedgerLine.side == "debit"), 0
            ).label("debits"),
            func.coalesce(
                func.sum(LedgerLine.amount).filter(LedgerLine.side == "credit"), 0
            ).label("credits"),
        )
        .join(LedgerLine, LedgerLine.account_id == Account.id)
        .join(JournalEntry, JournalEntry.id == LedgerLine.journal_entry_id)
        .where(
            Account.tenant_id == tenant_id,
            JournalEntry.entry_date >= date_from,
            JournalEntry.entry_date <= date_to,
        )
        .group_by(Account.code, Account.name, Account.type)
        .order_by(Account.code)
    )
    accounts = [
        {
            "code": r.code,
            "name": r.name,
            "type": r.type,
            "debits": float(r.debits),
            "credits": float(r.credits),
            "net": float(r.debits) - float(r.credits),
        }
        for r in balance_rows.all()
    ]

    total_volume = sum(a["debits"] for a in accounts)

    summary = {
        "date_from": str(date_from),
        "date_to": str(date_to),
        "total_entries": total_entries,
        "voided_entries": voided_entries,
        "total_debit_volume": total_volume,
        "account_activity": accounts,
    }

    system_prompt = (
        "You are a professional financial auditor writing a period audit report.\n"
        "Generate a clear, structured markdown report. Include:\n"
        "1. Executive Summary\n2. Period Activity\n3. Account Analysis\n"
        "4. Risk Observations\n5. Conclusion\n"
        "Be concise and professional. Use markdown headers and tables where useful."
    )

    report_md = await chat_completion(
        model=MODEL,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"Generate audit report:\n{json.dumps(summary, indent=2)}"},
        ],
    )

    return AuditReportResponse(
        date_from=date_from,
        date_to=date_to,
        report_markdown=report_md,
        summary=summary,
        generated_at=datetime.now(timezone.utc),
    )
