import uuid
from datetime import date
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.finance import Category, FinancialAccount, Transaction
from app.schemas.common import PaginatedResponse
from app.schemas.finance import TransactionOut


async def get_transactions(
    db: AsyncSession,
    user_id: uuid.UUID,
    page: int = 1,
    size: int = 50,
    date_from: date | None = None,
    date_to: date | None = None,
    account_id: uuid.UUID | None = None,
    category_id: uuid.UUID | None = None,
) -> PaginatedResponse:
    q = select(Transaction).where(Transaction.user_id == user_id)
    if date_from:
        q = q.where(Transaction.date >= date_from)
    if date_to:
        q = q.where(Transaction.date <= date_to)
    if account_id:
        q = q.where(Transaction.account_id == account_id)
    if category_id:
        q = q.where(Transaction.category_id == category_id)

    total_q = select(func.count()).select_from(q.subquery())
    total = await db.scalar(total_q) or 0

    q = q.order_by(Transaction.date.desc(), Transaction.created_at.desc())
    q = q.offset((page - 1) * size).limit(size)
    result = await db.execute(q)
    items = result.scalars().all()

    import math
    return PaginatedResponse(
        items=[TransactionOut.model_validate(t) for t in items],
        total=total,
        page=page,
        size=size,
        pages=max(1, math.ceil(total / size)),
    )


async def get_spending_summary(
    db: AsyncSession,
    user_id: uuid.UUID,
    date_from: date,
    date_to: date,
) -> list[dict[str, Any]]:
    result = await db.execute(
        select(
            Category.id,
            Category.name,
            Category.icon,
            Category.color,
            Category.type,
            func.sum(Transaction.amount).label("total"),
            func.count(Transaction.id).label("count"),
        )
        .join(Transaction, Transaction.category_id == Category.id)
        .where(
            Transaction.user_id == user_id,
            Transaction.date >= date_from,
            Transaction.date <= date_to,
            Transaction.pending.is_(False),
        )
        .group_by(Category.id, Category.name, Category.icon, Category.color, Category.type)
        .order_by(func.sum(Transaction.amount).desc())
    )
    rows = result.all()
    return [
        {
            "category_id": str(r.id),
            "name": r.name,
            "icon": r.icon,
            "color": r.color,
            "type": r.type,
            "total": float(r.total or 0),
            "count": r.count,
        }
        for r in rows
    ]


async def update_transaction(
    db: AsyncSession,
    user_id: uuid.UUID,
    tx_id: uuid.UUID,
    category_id: uuid.UUID | None,
    notes: str | None,
) -> Transaction | None:
    tx = await db.scalar(
        select(Transaction).where(Transaction.id == tx_id, Transaction.user_id == user_id)
    )
    if not tx:
        return None
    if category_id is not None:
        tx.category_id = category_id  # type: ignore[assignment]
    if notes is not None:
        tx.notes = notes  # type: ignore[assignment]
    await db.commit()
    await db.refresh(tx)
    return tx


async def get_accounts(db: AsyncSession, user_id: uuid.UUID) -> list[FinancialAccount]:
    result = await db.execute(
        select(FinancialAccount).where(
            FinancialAccount.user_id == user_id,
            FinancialAccount.is_active.is_(True),
        )
    )
    return list(result.scalars().all())


async def get_categories(db: AsyncSession, user_id: uuid.UUID) -> list[Category]:
    result = await db.execute(
        select(Category).where(
            (Category.user_id == user_id) | (Category.user_id.is_(None))
        ).order_by(Category.type, Category.name)
    )
    return list(result.scalars().all())
