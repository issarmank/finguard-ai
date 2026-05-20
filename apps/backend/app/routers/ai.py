from fastapi import APIRouter

from app.dependencies import CurrentTenantId, DBSession, TenantContext
from app.schemas.ai import (
    AuditReportRequest,
    AuditReportResponse,
    FraudScanRequest,
    FraudScanResponse,
    TextToSQLRequest,
    TextToSQLResponse,
)
from app.services import ai_service

router = APIRouter(dependencies=[TenantContext])


@router.post("/query", response_model=TextToSQLResponse)
async def natural_language_query(
    body: TextToSQLRequest,
    db: DBSession,
) -> TextToSQLResponse:
    return await ai_service.text_to_sql(db, body.query)


@router.post("/fraud-scan", response_model=FraudScanResponse)
async def run_fraud_scan(
    body: FraudScanRequest,
    tenant_id: CurrentTenantId,
    db: DBSession,
) -> FraudScanResponse:
    return await ai_service.fraud_scan(db, tenant_id, days_back=body.days_back)


@router.post("/audit-report", response_model=AuditReportResponse)
async def generate_audit_report(
    body: AuditReportRequest,
    tenant_id: CurrentTenantId,
    db: DBSession,
) -> AuditReportResponse:
    return await ai_service.generate_audit_report(
        db,
        tenant_id,
        date_from=body.date_from,
        date_to=body.date_to,
        include_voided=body.include_voided,
    )
