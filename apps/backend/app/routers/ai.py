from fastapi import APIRouter

from app.dependencies import CurrentUserId, DBSession
from app.schemas.ai import (
    InsightsScanRequest,
    InsightsResponse,
    MonthlyReportRequest,
    MonthlyReportResponse,
    TextToSQLRequest,
    TextToSQLResponse,
)
from app.services import ai_service

router = APIRouter()


@router.post("/query", response_model=TextToSQLResponse)
async def natural_language_query(
    body: TextToSQLRequest,
    user_id: CurrentUserId,
    db: DBSession,
) -> TextToSQLResponse:
    return await ai_service.text_to_sql(db, user_id, body.query)


@router.post("/insights", response_model=InsightsResponse)
async def run_insights(
    body: InsightsScanRequest,
    user_id: CurrentUserId,
    db: DBSession,
) -> InsightsResponse:
    return await ai_service.get_insights(db, user_id, days_back=body.days_back)


@router.post("/report", response_model=MonthlyReportResponse)
async def generate_report(
    body: MonthlyReportRequest,
    user_id: CurrentUserId,
    db: DBSession,
) -> MonthlyReportResponse:
    return await ai_service.generate_monthly_report(db, user_id, body.month)
