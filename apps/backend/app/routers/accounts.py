import uuid
from math import ceil

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import func, select

from app.dependencies import CurrentTenantId, DBSession, TenantContext
from app.models.account import Account
from app.models.journal import LedgerLine
from app.schemas.account import (
    AccountBalanceResponse,
    AccountCreate,
    AccountResponse,
    AccountUpdate,
)
from app.schemas.common import PaginatedResponse

router = APIRouter(dependencies=[TenantContext])


@router.get("", response_model=PaginatedResponse[AccountResponse])
async def list_accounts(
    tenant_id: CurrentTenantId,
    db: DBSession,
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=500),
) -> PaginatedResponse[AccountResponse]:
    query = select(Account).where(Account.tenant_id == tenant_id).order_by(Account.code)
    total = await db.scalar(select(func.count()).select_from(query.subquery())) or 0
    results = await db.scalars(query.offset((page - 1) * size).limit(size))
    items = [AccountResponse.model_validate(a) for a in results.all()]
    return PaginatedResponse(items=items, total=total, page=page, size=size, pages=ceil(total / size) if total else 0)


@router.post("", response_model=AccountResponse, status_code=201)
async def create_account(
    body: AccountCreate, tenant_id: CurrentTenantId, db: DBSession
) -> Account:
    existing = await db.scalar(
        select(Account).where(Account.tenant_id == tenant_id, Account.code == body.code)
    )
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Account code already exists")

    account = Account(tenant_id=tenant_id, **body.model_dump())
    db.add(account)
    await db.commit()
    await db.refresh(account)
    return account


@router.get("/{account_id}", response_model=AccountResponse)
async def get_account(
    account_id: uuid.UUID, tenant_id: CurrentTenantId, db: DBSession
) -> Account:
    account = await db.scalar(
        select(Account).where(Account.id == account_id, Account.tenant_id == tenant_id)
    )
    if not account:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Account not found")
    return account


@router.patch("/{account_id}", response_model=AccountResponse)
async def update_account(
    account_id: uuid.UUID, body: AccountUpdate, tenant_id: CurrentTenantId, db: DBSession
) -> Account:
    account = await db.scalar(
        select(Account).where(Account.id == account_id, Account.tenant_id == tenant_id)
    )
    if not account:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Account not found")

    if body.name is not None:
        account.name = body.name
    if body.is_active is not None:
        account.is_active = body.is_active

    await db.commit()
    await db.refresh(account)
    return account


@router.get("/{account_id}/balance", response_model=AccountBalanceResponse)
async def get_account_balance(
    account_id: uuid.UUID, tenant_id: CurrentTenantId, db: DBSession
) -> AccountBalanceResponse:
    account = await db.scalar(
        select(Account).where(Account.id == account_id, Account.tenant_id == tenant_id)
    )
    if not account:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Account not found")

    row = await db.execute(
        select(
            func.coalesce(func.sum(LedgerLine.amount).filter(LedgerLine.side == "debit"), 0).label("debit_total"),
            func.coalesce(func.sum(LedgerLine.amount).filter(LedgerLine.side == "credit"), 0).label("credit_total"),
        ).where(LedgerLine.account_id == account_id)
    )
    totals = row.one()
    debit_total = totals.debit_total
    credit_total = totals.credit_total
    balance = debit_total - credit_total if account.normal_side == "debit" else credit_total - debit_total

    return AccountBalanceResponse(
        account_id=account.id,
        account_name=account.name,
        account_code=account.code,
        normal_side=account.normal_side,
        debit_total=debit_total,
        credit_total=credit_total,
        balance=balance,
    )
