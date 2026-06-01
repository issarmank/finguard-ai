import math
import uuid
from datetime import date
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.finance import Budget, Category, Transaction


async def get_budgets_with_spending(
    db: AsyncSession,
    user_id: uuid.UUID,
    month: date,
) -> list[dict[str, Any]]:
    month_start = month.replace(day=1)
    if month_start.month == 12:
        month_end = month_start.replace(year=month_start.year + 1, month=1, day=1)
    else:
        month_end = month_start.replace(month=month_start.month + 1, day=1)

    budgets_result = await db.execute(
        select(Budget, Category)
        .join(Category, Budget.category_id == Category.id)
        .where(Budget.user_id == user_id, Budget.month == month_start)
    )
    budgets = budgets_result.all()

    spending_result = await db.execute(
        select(
            Transaction.category_id,
            func.sum(Transaction.amount).label("spent"),
        )
        .where(
            Transaction.user_id == user_id,
            Transaction.date >= month_start,
            Transaction.date < month_end,
            Transaction.pending.is_(False),
        )
        .group_by(Transaction.category_id)
    )
    spending_map = {str(row.category_id): float(row.spent or 0) for row in spending_result}

    return [
        {
            "budget_id": str(b.id),
            "category_id": str(c.id),
            "category_name": c.name,
            "category_icon": c.icon,
            "category_color": c.color,
            "budget_amount": float(b.amount),
            "spent": spending_map.get(str(c.id), 0.0),
            "remaining": float(b.amount) - spending_map.get(str(c.id), 0.0),
            "pct": min(100, math.floor(spending_map.get(str(c.id), 0.0) / float(b.amount) * 100)) if b.amount else 0,
            "month": month_start.isoformat(),
        }
        for b, c in budgets
    ]


async def upsert_budget(
    db: AsyncSession,
    user_id: uuid.UUID,
    category_id: uuid.UUID,
    month: date,
    amount: float,
) -> Budget:
    month_start = month.replace(day=1)
    existing = await db.scalar(
        select(Budget).where(
            Budget.user_id == user_id,
            Budget.category_id == category_id,
            Budget.month == month_start,
        )
    )
    if existing:
        existing.amount = amount  # type: ignore[assignment]
        await db.commit()
        await db.refresh(existing)
        return existing

    b = Budget(user_id=user_id, category_id=category_id, month=month_start, amount=amount)
    db.add(b)
    await db.commit()
    await db.refresh(b)
    return b


async def delete_budget(db: AsyncSession, user_id: uuid.UUID, category_id: uuid.UUID, month: date) -> bool:
    month_start = month.replace(day=1)
    b = await db.scalar(
        select(Budget).where(
            Budget.user_id == user_id,
            Budget.category_id == category_id,
            Budget.month == month_start,
        )
    )
    if not b:
        return False
    await db.delete(b)
    await db.commit()
    return True
