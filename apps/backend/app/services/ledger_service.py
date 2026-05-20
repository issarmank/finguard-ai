import uuid
from math import ceil

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.account import Account
from app.models.journal import JournalEntry, LedgerLine
from app.schemas.ledger import JournalEntryCreate, JournalEntryResponse
from app.schemas.common import PaginatedResponse
from app.services import audit_service


async def get_entries(
    db: AsyncSession,
    tenant_id: uuid.UUID,
    page: int = 1,
    size: int = 50,
    status_filter: str | None = None,
) -> PaginatedResponse[JournalEntryResponse]:
    query = (
        select(JournalEntry)
        .where(JournalEntry.tenant_id == tenant_id)
        .options(selectinload(JournalEntry.lines))
        .order_by(JournalEntry.entry_date.desc(), JournalEntry.created_at.desc())
    )
    if status_filter:
        query = query.where(JournalEntry.status == status_filter)

    total = await db.scalar(
        select(func.count()).select_from(query.subquery())
    )
    total = total or 0
    results = await db.scalars(query.offset((page - 1) * size).limit(size))
    items = [JournalEntryResponse.model_validate(e) for e in results.all()]

    return PaginatedResponse(
        items=items,
        total=total,
        page=page,
        size=size,
        pages=ceil(total / size) if total else 0,
    )


async def get_entry(
    db: AsyncSession, tenant_id: uuid.UUID, entry_id: uuid.UUID
) -> JournalEntry:
    entry = await db.scalar(
        select(JournalEntry)
        .where(JournalEntry.id == entry_id, JournalEntry.tenant_id == tenant_id)
        .options(selectinload(JournalEntry.lines))
    )
    if not entry:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Journal entry not found")
    return entry


async def create_journal_entry(
    db: AsyncSession,
    tenant_id: uuid.UUID,
    user_id: uuid.UUID,
    payload: JournalEntryCreate,
) -> JournalEntry:
    account_ids = {line.account_id for line in payload.lines}
    accounts = await db.scalars(
        select(Account).where(
            Account.id.in_(account_ids),
            Account.tenant_id == tenant_id,
            Account.is_active.is_(True),
        )
    )
    found_ids = {a.id for a in accounts.all()}
    missing = account_ids - found_ids
    if missing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Accounts not found or inactive: {[str(i) for i in missing]}",
        )

    entry = JournalEntry(
        tenant_id=tenant_id,
        entry_date=payload.entry_date,
        description=payload.description,
        reference=payload.reference,
        status="posted",
        created_by=user_id,
    )
    db.add(entry)
    await db.flush()

    for line in payload.lines:
        db.add(
            LedgerLine(
                journal_entry_id=entry.id,
                account_id=line.account_id,
                side=line.side,
                amount=line.amount,
                memo=line.memo,
            )
        )

    await audit_service.log(
        db,
        tenant_id=tenant_id,
        user_id=user_id,
        action="entry.posted",
        entity_type="journal_entry",
        entity_id=entry.id,
        payload={"description": payload.description, "reference": payload.reference},
    )

    await db.commit()
    await db.refresh(entry)

    return await get_entry(db, tenant_id, entry.id)


async def void_journal_entry(
    db: AsyncSession,
    tenant_id: uuid.UUID,
    user_id: uuid.UUID,
    entry_id: uuid.UUID,
) -> JournalEntry:
    entry = await get_entry(db, tenant_id, entry_id)

    if entry.status == "voided":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Entry is already voided")
    if entry.is_locked:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Entry is locked and cannot be voided")

    entry.status = "voided"

    await audit_service.log(
        db,
        tenant_id=tenant_id,
        user_id=user_id,
        action="entry.voided",
        entity_type="journal_entry",
        entity_id=entry.id,
    )

    await db.commit()
    await db.refresh(entry)
    return await get_entry(db, tenant_id, entry.id)
