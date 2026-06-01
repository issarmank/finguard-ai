import uuid

from fastapi import APIRouter, HTTPException, status

from app.dependencies import CurrentUserId, DBSession
from app.schemas.finance import GoalCreate, GoalOut, GoalUpdate
from app.services import goal_service

router = APIRouter()


@router.get("/", response_model=list[GoalOut])
async def list_goals(user_id: CurrentUserId, db: DBSession) -> list[GoalOut]:
    return await goal_service.get_goals(db, user_id)  # type: ignore[return-value]


@router.post("/", response_model=GoalOut, status_code=201)
async def create_goal(
    body: GoalCreate,
    user_id: CurrentUserId,
    db: DBSession,
) -> GoalOut:
    g = await goal_service.create_goal(
        db,
        user_id,
        name=body.name,
        target_amount=body.target_amount,
        current_amount=body.current_amount,
        target_date=body.target_date,
        account_id=body.account_id,
        emoji=body.emoji,
    )
    goals = await goal_service.get_goals(db, user_id)
    match = next((x for x in goals if x["id"] == str(g.id)), None)
    if not match:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Goal not found")
    return GoalOut(**match)


@router.patch("/{goal_id}", response_model=GoalOut)
async def update_goal(
    goal_id: uuid.UUID,
    body: GoalUpdate,
    user_id: CurrentUserId,
    db: DBSession,
) -> GoalOut:
    g = await goal_service.update_goal(db, user_id, goal_id, **body.model_dump(exclude_none=True))
    if not g:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Goal not found")
    goals = await goal_service.get_goals(db, user_id)
    match = next((x for x in goals if x["id"] == str(g.id)), None)
    if not match:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Goal not found")
    return GoalOut(**match)


@router.delete("/{goal_id}", status_code=204)
async def delete_goal(
    goal_id: uuid.UUID,
    user_id: CurrentUserId,
    db: DBSession,
) -> None:
    ok = await goal_service.delete_goal(db, user_id, goal_id)
    if not ok:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Goal not found")
