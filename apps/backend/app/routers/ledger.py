import uuid

from fastapi import APIRouter, Query

from app.dependencies import CurrentTenantId, CurrentUser, DBSession, TenantContext
from app.schemas.common import PaginatedResponse
from app.schemas.ledger import JournalEntryCreate, JournalEntryResponse
from app.services import ledger_service

router = APIRouter(dependencies=[TenantContext])


@router.get("/entries", response_model=PaginatedResponse[JournalEntryResponse])
async def list_entries(
    tenant_id: CurrentTenantId,
    db: DBSession,
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=100),
    status: str | None = Query(None, pattern="^(draft|posted|voided)$"),
) -> PaginatedResponse[JournalEntryResponse]:
    return await ledger_service.get_entries(db, tenant_id, page=page, size=size, status_filter=status)


@router.post("/entries", response_model=JournalEntryResponse, status_code=201)
async def create_entry(
    body: JournalEntryCreate,
    tenant_id: CurrentTenantId,
    current_user: CurrentUser,
    db: DBSession,
) -> JournalEntryResponse:
    entry = await ledger_service.create_journal_entry(db, tenant_id, current_user.id, body)
    return JournalEntryResponse.model_validate(entry)


@router.get("/entries/{entry_id}", response_model=JournalEntryResponse)
async def get_entry(
    entry_id: uuid.UUID, tenant_id: CurrentTenantId, db: DBSession
) -> JournalEntryResponse:
    entry = await ledger_service.get_entry(db, tenant_id, entry_id)
    return JournalEntryResponse.model_validate(entry)


@router.post("/entries/{entry_id}/void", response_model=JournalEntryResponse)
async def void_entry(
    entry_id: uuid.UUID,
    tenant_id: CurrentTenantId,
    current_user: CurrentUser,
    db: DBSession,
) -> JournalEntryResponse:
    entry = await ledger_service.void_journal_entry(db, tenant_id, current_user.id, entry_id)
    return JournalEntryResponse.model_validate(entry)
