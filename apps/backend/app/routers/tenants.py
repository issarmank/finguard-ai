from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from app.dependencies import CurrentTenantId, CurrentUser, DBSession, TenantContext
from app.models.tenant import Tenant
from app.schemas.tenant import TenantResponse, TenantUpdate

router = APIRouter(dependencies=[TenantContext])


@router.get("/me", response_model=TenantResponse)
async def get_my_tenant(tenant_id: CurrentTenantId, db: DBSession) -> Tenant:
    tenant = await db.scalar(select(Tenant).where(Tenant.id == tenant_id))
    if not tenant:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tenant not found")
    return tenant


@router.patch("/me", response_model=TenantResponse)
async def update_my_tenant(
    body: TenantUpdate,
    tenant_id: CurrentTenantId,
    current_user: CurrentUser,
    db: DBSession,
) -> Tenant:
    if current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")

    tenant = await db.scalar(select(Tenant).where(Tenant.id == tenant_id))
    if not tenant:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tenant not found")

    tenant.name = body.name
    await db.commit()
    await db.refresh(tenant)
    return tenant
