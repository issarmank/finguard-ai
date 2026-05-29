import uuid
from datetime import date, datetime
from typing import Any

from pydantic import BaseModel, ConfigDict


class AccountOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    type: str
    balance: float
    currency: str
    is_manual: bool
    is_active: bool
    last_synced: datetime | None = None


class CategoryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    icon: str | None = None
    color: str | None = None
    type: str


class TransactionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    account_id: uuid.UUID
    category_id: uuid.UUID | None = None
    amount: float
    date: date
    description: str
    merchant: str | None = None
    pending: bool
    notes: str | None = None
    created_at: datetime


class PlaidItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    institution: str
    created_at: datetime
    last_synced: datetime | None = None


class BudgetOut(BaseModel):
    budget_id: str
    category_id: str
    category_name: str
    category_icon: str | None
    category_color: str | None
    budget_amount: float
    spent: float
    remaining: float
    pct: int
    month: str


class GoalOut(BaseModel):
    id: str
    name: str
    emoji: str
    target_amount: float
    current_amount: float
    target_date: str | None
    account_id: str | None
    pct: int
    days_left: int | None
    created_at: str


class GoalCreate(BaseModel):
    name: str
    target_amount: float
    current_amount: float = 0.0
    target_date: date | None = None
    account_id: uuid.UUID | None = None
    emoji: str = "🎯"


class GoalUpdate(BaseModel):
    name: str | None = None
    target_amount: float | None = None
    current_amount: float | None = None
    target_date: date | None = None
    emoji: str | None = None


class NetWorthCurrent(BaseModel):
    assets: float
    liabilities: float
    net_worth: float
    accounts: list[dict[str, Any]]


class NetWorthHistory(BaseModel):
    date: str
    assets: float
    liabilities: float
    net_worth: float


class TransactionPatch(BaseModel):
    category_id: uuid.UUID | None = None
    notes: str | None = None


class BudgetUpsert(BaseModel):
    amount: float


class ExchangeRequest(BaseModel):
    public_token: str
    institution: str
