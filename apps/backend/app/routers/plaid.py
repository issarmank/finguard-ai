from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from app.dependencies import CurrentUserId, DBSession
from app.models.finance import PlaidItem
from app.schemas.finance import ExchangeRequest, PlaidItemOut
from app.services import plaid_service

router = APIRouter()


@router.get("/items", response_model=list[PlaidItemOut])
async def list_items(user_id: CurrentUserId, db: DBSession) -> list[PlaidItemOut]:
    result = await db.execute(select(PlaidItem).where(PlaidItem.user_id == user_id))
    return [PlaidItemOut.model_validate(i) for i in result.scalars().all()]


@router.post("/link-token")
async def create_link_token(user_id: CurrentUserId) -> dict:
    token = await plaid_service.create_link_token(user_id)
    return {"link_token": token}


@router.post("/exchange", response_model=PlaidItemOut, status_code=201)
async def exchange_public_token(
    body: ExchangeRequest,
    user_id: CurrentUserId,
    db: DBSession,
) -> PlaidItemOut:
    item = await plaid_service.exchange_public_token(db, user_id, body.public_token, body.institution)
    return PlaidItemOut.model_validate(item)


@router.post("/sync/{item_id}")
async def sync_transactions(
    item_id: str,
    user_id: CurrentUserId,
    db: DBSession,
) -> dict:
    import uuid

    try:
        iid = uuid.UUID(item_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid item_id")
    count = await plaid_service.sync_transactions(db, user_id, iid)
    return {"synced": count}


@router.post("/sync-balances/{item_id}")
async def sync_balances(
    item_id: str,
    user_id: CurrentUserId,
    db: DBSession,
) -> dict:
    import uuid

    try:
        iid = uuid.UUID(item_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid item_id")
    await plaid_service.sync_balances(db, user_id, iid)
    return {"ok": True}
