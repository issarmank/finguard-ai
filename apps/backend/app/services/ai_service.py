import json
import re
import uuid
from datetime import UTC, date, datetime, timedelta
from typing import Any

import sqlglot
from fastapi import HTTPException, status
from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.finance import Category, FinancialAccount, Transaction
from app.schemas.ai import (
    InsightFlag,
    InsightsResponse,
    MonthlyReportResponse,
    TextToSQLResponse,
)
from app.services.openrouter_client import chat_completion

MODEL = "google/gemini-2.5-flash"

# ---------------------------------------------------------------------------
# Schema context injected into every Text-to-SQL prompt
# ---------------------------------------------------------------------------

_SCHEMA_CONTEXT = """
Tables (already user-scoped — always filter by the provided user_id):

  financial_accounts(id, user_id, name, type, balance, currency, is_active, last_synced)
    type: checking | savings | credit | investment | loan | cash

  categories(id, user_id, name, icon, color, type)
    type: income | expense | transfer
    user_id may be NULL for system default categories

  transactions(id, user_id, account_id, category_id, amount, date, description, merchant, pending, notes, created_at)
    amount: NUMERIC — positive = expense/debit, negative = income/credit
    pending: BOOLEAN — exclude pending transactions from spend calculations

  budgets(id, user_id, category_id, month, amount)
    month: DATE — first day of month (e.g. '2024-01-01')

  goals(id, user_id, account_id, name, target_amount, current_amount, target_date, emoji, created_at)

  net_worth_snapshots(id, user_id, snapshot_at, assets, liabilities, net_worth)
    net_worth: NUMERIC GENERATED ALWAYS AS (assets - liabilities) STORED
"""

_SQL_RULES = """
RULES (violations will cause an error):
1. Only SELECT statements — no INSERT, UPDATE, DELETE, DROP, ALTER, CREATE, TRUNCATE.
2. JOINs and aggregations (SUM, COUNT, AVG, GROUP BY) are allowed.
3. Always include LIMIT ≤ 500.
4. Always filter by the provided user_id parameter using a literal UUID value in the WHERE clause.
5. Return ONLY the raw SQL — no markdown fences, no explanations.
6. This is PostgreSQL — use PostgreSQL date syntax only:
   - Relative dates: CURRENT_DATE - INTERVAL '30 days'  (NOT DATE('now','-30 days'))
   - Current timestamp: NOW()  (NOT datetime('now'))
   - Date truncation: DATE_TRUNC('month', date_column)
   - Never use SQLite functions like strftime(), julianday(), or DATE('now', modifier).
"""


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _strip_fences(raw: str) -> str:
    raw = raw.strip()
    raw = re.sub(r"^```(?:sql)?\s*", "", raw, flags=re.IGNORECASE)
    raw = re.sub(r"\s*```$", "", raw)
    return raw.strip().rstrip(";")


# Tables that hold user-owned data and MUST be constrained to the caller's
# user_id. Any table referenced here must carry a `user_id = '<uuid>'` predicate
# in the generated SQL. `categories` is exempt because system categories have a
# NULL user_id and are intentionally shared.
_USER_SCOPED_TABLES = frozenset(
    {
        "financial_accounts",
        "transactions",
        "budgets",
        "goals",
        "net_worth_snapshots",
    }
)

# Tables the model is never allowed to touch (auth/PII), regardless of scoping.
_FORBIDDEN_TABLES = frozenset({"users", "plaid_items", "audit_logs"})


def _validate_sql(sql: str, user_id: uuid.UUID) -> None:
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

    ast = statements[0]

    if not isinstance(ast, sqlglot.exp.Select):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Only SELECT statements are allowed",
        )

    upper = sql.upper()
    for kw in ("INSERT", "UPDATE", "DELETE", "DROP", "TRUNCATE", "ALTER", "CREATE", "GRANT", "REVOKE", "MERGE", "COPY"):
        if re.search(rf"\b{kw}\b", upper):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Forbidden SQL keyword detected: {kw}",
            )

    # --- Tenant-isolation enforcement -------------------------------------
    # Collect every real table referenced anywhere in the statement (including
    # subqueries, CTEs and joins) using the parsed AST rather than string
    # matching, which the model could otherwise evade.
    referenced_tables = {t.name.lower() for t in ast.find_all(sqlglot.exp.Table) if t.name}

    forbidden_hit = referenced_tables & _FORBIDDEN_TABLES
    if forbidden_hit:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Query references restricted table(s): {', '.join(sorted(forbidden_hit))}",
        )

    # Every user-scoped table in the query must be filtered by the caller's
    # own user_id, expressed as a literal in the SQL. We require the exact
    # `user_id = '<uuid>'` predicate to be present for each such table.
    scoped_tables_used = referenced_tables & _USER_SCOPED_TABLES
    if scoped_tables_used:
        expected = str(user_id)
        # Gather every literal that appears in an equality against a *user_id*
        # column anywhere in the AST.
        user_id_literals: set[str] = set()
        for eq in ast.find_all(sqlglot.exp.EQ):
            col = eq.find(sqlglot.exp.Column)
            lit = eq.find(sqlglot.exp.Literal)
            if col is not None and col.name.lower() == "user_id" and lit is not None:
                user_id_literals.add(lit.this)
        if expected not in user_id_literals:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Query must filter by the current user's user_id",
            )


# ---------------------------------------------------------------------------
# Text-to-SQL
# ---------------------------------------------------------------------------


async def text_to_sql(
    db: AsyncSession,
    user_id: uuid.UUID,
    query: str,
) -> TextToSQLResponse:
    system_prompt = (
        "You are a SQL expert for a personal finance application.\n"
        f"{_SCHEMA_CONTEXT}\n{_SQL_RULES}\n"
        f"The current user's UUID is: {user_id}"
    )

    raw = await chat_completion(
        model=MODEL,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": query},
        ],
    )

    sql = _strip_fences(raw)
    _validate_sql(sql, user_id)

    if "LIMIT" not in sql.upper():
        sql = f"{sql} LIMIT 500"

    # Execute inside a nested transaction that is ALWAYS rolled back, and force
    # the Postgres session to be read-only for the duration. This is defense in
    # depth: even if a data-modifying statement slipped past validation, it can
    # neither commit nor mutate rows.
    try:
        async with db.begin_nested() as nested:
            await db.execute(text("SET LOCAL transaction_read_only = on"))
            await db.execute(text("SET LOCAL statement_timeout = '10s'"))
            result = await db.execute(text(sql))
            rows = [dict(row._mapping) for row in result.fetchall()]
            await nested.rollback()
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"SQL execution failed: {e}",
        )

    return TextToSQLResponse(query=query, sql=sql, results=rows, row_count=len(rows))


# ---------------------------------------------------------------------------
# AI Insights (anomaly detection + proactive tips)
# ---------------------------------------------------------------------------


async def get_insights(
    db: AsyncSession,
    user_id: uuid.UUID,
    days_back: int = 30,
) -> InsightsResponse:
    cutoff = date.today() - timedelta(days=days_back)

    # Spending by category
    spending_rows = await db.execute(
        select(
            Category.name,
            func.sum(Transaction.amount).label("total"),
            func.count(Transaction.id).label("count"),
        )
        .join(Transaction, Transaction.category_id == Category.id)
        .where(
            Transaction.user_id == user_id,
            Transaction.date >= cutoff,
            Transaction.pending.is_(False),
        )
        .group_by(Category.name)
        .order_by(func.sum(Transaction.amount).desc())
    )
    spending = [{"category": r.name, "total": float(r.total or 0), "count": r.count} for r in spending_rows.all()]

    # Recent transactions for LLM
    recent_rows = await db.execute(
        select(Transaction, Category.name.label("cat_name"))
        .outerjoin(Category, Transaction.category_id == Category.id)
        .where(Transaction.user_id == user_id, Transaction.date >= cutoff)
        .order_by(Transaction.date.desc())
        .limit(50)
    )
    recent = [
        {
            "date": str(r.Transaction.date),
            "description": r.Transaction.description,
            "merchant": r.Transaction.merchant,
            "amount": float(r.Transaction.amount),
            "category": r.cat_name,
        }
        for r in recent_rows.all()
    ]

    # Account summary
    accounts_rows = await db.execute(
        select(FinancialAccount).where(
            FinancialAccount.user_id == user_id,
            FinancialAccount.is_active.is_(True),
        )
    )
    accounts = [{"name": a.name, "type": a.type, "balance": float(a.balance)} for a in accounts_rows.scalars().all()]

    context: dict[str, Any] = {
        "period_days": days_back,
        "spending_by_category": spending,
        "recent_transactions": recent,
        "accounts": accounts,
    }

    system_prompt = (
        "You are a personal finance AI coach analysing a user's spending patterns.\n"
        "Detect: duplicate charges, subscription price increases, unusual merchant activity, "
        "budget overspend risks, and recurring patterns worth flagging.\n"
        "Return a JSON object with exactly these fields:\n"
        '{"risk_score": <float 0.0-1.0>, "risk_level": <"low"|"medium"|"high">, '
        '"flags": [{"flag_type": <str>, "description": <str>}], '
        '"summary": <str>, "tips": [<str>]}\n'
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
        return InsightsResponse(
            risk_score=float(data["risk_score"]),
            risk_level=data["risk_level"],
            flags=[InsightFlag(**f) for f in data.get("flags", [])],
            summary=data["summary"],
            tips=data.get("tips", []),
            transactions_analyzed=len(recent),
        )
    except (KeyError, ValueError) as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"AI response parsing failed: {e}",
        )


# ---------------------------------------------------------------------------
# Monthly Report
# ---------------------------------------------------------------------------


async def generate_monthly_report(
    db: AsyncSession,
    user_id: uuid.UUID,
    month: date,
) -> MonthlyReportResponse:
    month_start = month.replace(day=1)
    if month_start.month == 12:
        month_end = month_start.replace(year=month_start.year + 1, month=1, day=1)
    else:
        month_end = month_start.replace(month=month_start.month + 1, day=1)

    # Spending by category
    spending_rows = await db.execute(
        select(
            Category.name,
            Category.type,
            func.sum(Transaction.amount).label("total"),
            func.count(Transaction.id).label("count"),
        )
        .join(Transaction, Transaction.category_id == Category.id)
        .where(
            Transaction.user_id == user_id,
            Transaction.date >= month_start,
            Transaction.date < month_end,
            Transaction.pending.is_(False),
        )
        .group_by(Category.name, Category.type)
        .order_by(func.sum(Transaction.amount).desc())
    )
    spending = [
        {
            "category": r.name,
            "type": r.type,
            "total": float(r.total or 0),
            "count": r.count,
        }
        for r in spending_rows.all()
    ]

    # Net worth snapshot for month
    from app.models.finance import NetWorthSnapshot

    nw_rows = await db.execute(
        select(NetWorthSnapshot)
        .where(
            NetWorthSnapshot.user_id == user_id,
            NetWorthSnapshot.snapshot_at >= month_start,
            NetWorthSnapshot.snapshot_at < month_end,
        )
        .order_by(NetWorthSnapshot.snapshot_at.desc())
        .limit(1)
    )
    nw = nw_rows.scalar_one_or_none()

    # Goals progress
    from app.models.finance import Goal

    goals_rows = await db.execute(select(Goal).where(Goal.user_id == user_id))
    goals = [
        {
            "name": g.name,
            "target": float(g.target_amount),
            "current": float(g.current_amount),
            "pct": min(100, int(float(g.current_amount) / float(g.target_amount) * 100)) if g.target_amount else 0,
        }
        for g in goals_rows.scalars().all()
    ]

    total_income = sum(abs(s["total"]) for s in spending if s["type"] == "income")
    total_expense = sum(s["total"] for s in spending if s["type"] == "expense")

    summary = {
        "month": month_start.isoformat(),
        "total_income": total_income,
        "total_expenses": total_expense,
        "net_cashflow": total_income - total_expense,
        "spending_by_category": spending,
        "net_worth": {
            "assets": float(nw.assets) if nw else None,
            "liabilities": float(nw.liabilities) if nw else None,
            "net_worth": float(nw.net_worth) if nw else None,
        },
        "goals": goals,
    }

    system_prompt = (
        "You are a personal finance advisor writing a friendly monthly money report.\n"
        "Generate a clear, structured markdown report with these sections:\n"
        "1. Money Health Score (out of 100, with brief reasoning)\n"
        "2. Cash Flow Summary\n"
        "3. Top Spending Categories\n"
        "4. Net Worth Update\n"
        "5. Goal Progress\n"
        "6. Tips for Next Month\n"
        "Be concise, encouraging, and actionable. Use markdown headers and bullet points."
    )

    report_md = await chat_completion(
        model=MODEL,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"Generate monthly report:\n{json.dumps(summary, indent=2)}"},
        ],
    )

    return MonthlyReportResponse(
        month=month_start,
        report_markdown=report_md,
        summary=summary,
        generated_at=datetime.now(UTC),
    )
