import uuid
from datetime import date, datetime
from typing import Any, Literal

from pydantic import BaseModel, Field


class TextToSQLRequest(BaseModel):
    query: str = Field(..., min_length=3, description="Natural language question about your ledger data")


class TextToSQLResponse(BaseModel):
    query: str
    sql: str
    results: list[dict[str, Any]]
    row_count: int


class FraudScanRequest(BaseModel):
    days_back: int = Field(30, ge=1, le=365, description="Number of days of transactions to analyse")


class FraudFlag(BaseModel):
    flag_type: str
    description: str


class FraudScanResponse(BaseModel):
    risk_score: float
    risk_level: Literal["low", "medium", "high", "critical"]
    flags: list[FraudFlag]
    explanation: str
    recommended_action: str
    entries_analyzed: int


class AuditReportRequest(BaseModel):
    date_from: date
    date_to: date
    include_voided: bool = False


class AuditReportResponse(BaseModel):
    date_from: date
    date_to: date
    report_markdown: str
    summary: dict[str, Any]
    generated_at: datetime
