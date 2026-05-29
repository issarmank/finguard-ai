from fastapi import APIRouter

from app.dependencies import CurrentUserId, DBSession
from app.schemas.finance import NetWorthCurrent, NetWorthHistory
from app.services import net_worth_service

router = APIRouter()


@router.get("/", response_model=NetWorthCurrent)
async def get_current_net_worth(user_id: CurrentUserId, db: DBSession) -> NetWorthCurrent:
    data = await net_worth_service.get_current(db, user_id)
    return NetWorthCurrent(**data)


@router.get("/history", response_model=list[NetWorthHistory])
async def get_net_worth_history(
    user_id: CurrentUserId,
    db: DBSession,
    days: int = 90,
) -> list[NetWorthHistory]:
    rows = await net_worth_service.get_history(db, user_id, days=days)
    return [NetWorthHistory(**r) for r in rows]


@router.post("/snapshot")
async def take_snapshot(user_id: CurrentUserId, db: DBSession) -> dict:
    snap = await net_worth_service.take_snapshot(db, user_id)
    return {
        "snapshot_at": snap.snapshot_at.isoformat(),
        "assets": float(snap.assets),
        "liabilities": float(snap.liabilities),
        "net_worth": float(snap.assets) - float(snap.liabilities),
    }
