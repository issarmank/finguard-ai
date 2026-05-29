import uuid
from datetime import date, datetime, timezone
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.finance import Goal


async def get_goals(db: AsyncSession, user_id: uuid.UUID) -> list[dict[str, Any]]:
    result = await db.execute(
        select(Goal).where(Goal.user_id == user_id).order_by(Goal.created_at)
    )
    goals = result.scalars().all()
    today = date.today()
    out = []
    for g in goals:
        pct = min(100, int(float(g.current_amount) / float(g.target_amount) * 100)) if g.target_amount else 0
        days_left = (g.target_date - today).days if g.target_date else None
        out.append({
            "id": str(g.id),
            "name": g.name,
            "emoji": g.emoji,
            "target_amount": float(g.target_amount),
            "current_amount": float(g.current_amount),
            "target_date": g.target_date.isoformat() if g.target_date else None,
            "account_id": str(g.account_id) if g.account_id else None,
            "pct": pct,
            "days_left": days_left,
            "created_at": g.created_at.isoformat(),
        })
    return out


async def create_goal(
    db: AsyncSession,
    user_id: uuid.UUID,
    name: str,
    target_amount: float,
    current_amount: float = 0,
    target_date: date | None = None,
    account_id: uuid.UUID | None = None,
    emoji: str = "🎯",
) -> Goal:
    g = Goal(
        user_id=user_id,
        name=name,
        target_amount=target_amount,
        current_amount=current_amount,
        target_date=target_date,
        account_id=account_id,
        emoji=emoji,
    )
    db.add(g)
    await db.commit()
    await db.refresh(g)
    return g


async def update_goal(
    db: AsyncSession,
    user_id: uuid.UUID,
    goal_id: uuid.UUID,
    **kwargs: Any,
) -> Goal | None:
    g = await db.scalar(select(Goal).where(Goal.id == goal_id, Goal.user_id == user_id))
    if not g:
        return None
    for k, v in kwargs.items():
        if v is not None and hasattr(g, k):
            setattr(g, k, v)
    await db.commit()
    await db.refresh(g)
    return g


async def delete_goal(db: AsyncSession, user_id: uuid.UUID, goal_id: uuid.UUID) -> bool:
    g = await db.scalar(select(Goal).where(Goal.id == goal_id, Goal.user_id == user_id))
    if not g:
        return False
    await db.delete(g)
    await db.commit()
    return True
