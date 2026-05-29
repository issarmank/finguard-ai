import uuid
from datetime import date, timedelta
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.finance import FinancialAccount, NetWorthSnapshot

ASSET_TYPES = {"checking", "savings", "investment", "cash"}
LIABILITY_TYPES = {"credit", "loan"}


async def take_snapshot(db: AsyncSession, user_id: uuid.UUID) -> NetWorthSnapshot:
    result = await db.execute(
        select(FinancialAccount).where(
            FinancialAccount.user_id == user_id,
            FinancialAccount.is_active.is_(True),
        )
    )
    accounts = result.scalars().all()

    assets = sum(float(a.balance) for a in accounts if a.type in ASSET_TYPES)
    liabilities = sum(abs(float(a.balance)) for a in accounts if a.type in LIABILITY_TYPES)

    today = date.today()
    existing = await db.scalar(
        select(NetWorthSnapshot).where(
            NetWorthSnapshot.user_id == user_id,
            NetWorthSnapshot.snapshot_at == today,
        )
    )
    if existing:
        existing.assets = assets  # type: ignore[assignment]
        existing.liabilities = liabilities  # type: ignore[assignment]
        await db.commit()
        await db.refresh(existing)
        return existing

    snap = NetWorthSnapshot(
        user_id=user_id,
        snapshot_at=today,
        assets=assets,
        liabilities=liabilities,
    )
    db.add(snap)
    await db.commit()
    await db.refresh(snap)
    return snap


async def get_current(db: AsyncSession, user_id: uuid.UUID) -> dict[str, Any]:
    result = await db.execute(
        select(FinancialAccount).where(
            FinancialAccount.user_id == user_id,
            FinancialAccount.is_active.is_(True),
        )
    )
    accounts = result.scalars().all()

    assets = sum(float(a.balance) for a in accounts if a.type in ASSET_TYPES)
    liabilities = sum(abs(float(a.balance)) for a in accounts if a.type in LIABILITY_TYPES)

    return {
        "assets": assets,
        "liabilities": liabilities,
        "net_worth": assets - liabilities,
        "accounts": [
            {
                "id": str(a.id),
                "name": a.name,
                "type": a.type,
                "balance": float(a.balance),
                "is_asset": a.type in ASSET_TYPES,
            }
            for a in accounts
        ],
    }


async def get_history(db: AsyncSession, user_id: uuid.UUID, days: int = 90) -> list[dict[str, Any]]:
    since = date.today() - timedelta(days=days)
    result = await db.execute(
        select(NetWorthSnapshot)
        .where(NetWorthSnapshot.user_id == user_id, NetWorthSnapshot.snapshot_at >= since)
        .order_by(NetWorthSnapshot.snapshot_at)
    )
    snaps = result.scalars().all()
    return [
        {
            "date": s.snapshot_at.isoformat(),
            "assets": float(s.assets),
            "liabilities": float(s.liabilities),
            "net_worth": float(s.assets) - float(s.liabilities),
        }
        for s in snaps
    ]
