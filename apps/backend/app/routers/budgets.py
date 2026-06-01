import uuid
from datetime import date

from fastapi import APIRouter, HTTPException, status

from app.dependencies import CurrentUserId, DBSession
from app.schemas.finance import BudgetOut, BudgetUpsert
from app.services import budget_service

router = APIRouter()


@router.get("/", response_model=list[BudgetOut])
async def list_budgets(
    user_id: CurrentUserId,
    db: DBSession,
    month: date | None = None,
) -> list[BudgetOut]:
    m = month or date.today()
    return await budget_service.get_budgets_with_spending(db, user_id, m)


@router.put("/{category_id}", response_model=BudgetOut)
async def upsert_budget(
    category_id: uuid.UUID,
    body: BudgetUpsert,
    user_id: CurrentUserId,
    db: DBSession,
    month: date | None = None,
) -> BudgetOut:
    m = month or date.today()
    await budget_service.upsert_budget(db, user_id, category_id, m, body.amount)
    budgets = await budget_service.get_budgets_with_spending(db, user_id, m)
    match = next((b for b in budgets if b["category_id"] == str(category_id)), None)
    if not match:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Budget not found")
    return BudgetOut(**match)


@router.delete("/{category_id}", status_code=204)
async def delete_budget(
    category_id: uuid.UUID,
    user_id: CurrentUserId,
    db: DBSession,
    month: date | None = None,
) -> None:
    m = (month or date.today()).replace(day=1)
    ok = await budget_service.delete_budget(db, user_id, category_id, m)
    if not ok:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Budget not found")
