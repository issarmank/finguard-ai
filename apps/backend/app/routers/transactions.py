import uuid
from datetime import date

from fastapi import APIRouter

from app.dependencies import CurrentUserId, DBSession
from app.schemas.finance import AccountOut, CategoryOut, TransactionOut, TransactionPatch
from app.schemas.common import PaginatedResponse
from app.services import transaction_service

router = APIRouter()


@router.get("/")
async def list_transactions(
    user_id: CurrentUserId,
    db: DBSession,
    page: int = 1,
    size: int = 50,
    date_from: date | None = None,
    date_to: date | None = None,
    account_id: uuid.UUID | None = None,
    category_id: uuid.UUID | None = None,
) -> PaginatedResponse:
    return await transaction_service.get_transactions(
        db, user_id, page=page, size=size,
        date_from=date_from, date_to=date_to,
        account_id=account_id, category_id=category_id,
    )


@router.get("/summary")
async def spending_summary(
    user_id: CurrentUserId,
    db: DBSession,
    date_from: date | None = None,
    date_to: date | None = None,
) -> list[dict]:
    today = date.today()
    df = date_from or today.replace(day=1)
    dt = date_to or today
    return await transaction_service.get_spending_summary(db, user_id, df, dt)


@router.patch("/{tx_id}", response_model=TransactionOut)
async def update_transaction(
    tx_id: uuid.UUID,
    body: TransactionPatch,
    user_id: CurrentUserId,
    db: DBSession,
) -> TransactionOut:
    tx = await transaction_service.update_transaction(db, user_id, tx_id, body.category_id, body.notes)
    if not tx:
        from fastapi import HTTPException, status
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Transaction not found")
    return TransactionOut.model_validate(tx)


@router.get("/accounts", response_model=list[AccountOut])
async def list_accounts(user_id: CurrentUserId, db: DBSession) -> list[AccountOut]:
    accounts = await transaction_service.get_accounts(db, user_id)
    return [AccountOut.model_validate(a) for a in accounts]


@router.get("/categories", response_model=list[CategoryOut])
async def list_categories(user_id: CurrentUserId, db: DBSession) -> list[CategoryOut]:
    cats = await transaction_service.get_categories(db, user_id)
    return [CategoryOut.model_validate(c) for c in cats]
