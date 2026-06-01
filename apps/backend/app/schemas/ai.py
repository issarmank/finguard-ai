from datetime import date, datetime
from typing import Any, Literal

from pydantic import BaseModel, Field


class TextToSQLRequest(BaseModel):
    query: str = Field(..., min_length=3, description="Natural language question about your finances")


class TextToSQLResponse(BaseModel):
    query: str
    sql: str
    results: list[dict[str, Any]]
    row_count: int


class InsightsScanRequest(BaseModel):
    days_back: int = Field(30, ge=1, le=365, description="Number of days of transactions to analyse")


class InsightFlag(BaseModel):
    flag_type: str
    description: str


class InsightsResponse(BaseModel):
    risk_score: float
    risk_level: Literal["low", "medium", "high"]
    flags: list[InsightFlag]
    summary: str
    tips: list[str]
    transactions_analyzed: int


class MonthlyReportRequest(BaseModel):
    month: date = Field(..., description="Any date within the desired month")


class MonthlyReportResponse(BaseModel):
    month: date
    report_markdown: str
    summary: dict[str, Any]
    generated_at: datetime
