import uuid
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict


class AccountCreate(BaseModel):
    code: str
    name: str
    type: Literal["asset", "liability", "equity", "income", "expense"]
    normal_side: Literal["debit", "credit"]


class AccountUpdate(BaseModel):
    name: str | None = None
    is_active: bool | None = None


class AccountResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    tenant_id: uuid.UUID
    code: str
    name: str
    type: str
    normal_side: str
    is_active: bool


class AccountBalanceResponse(BaseModel):
    account_id: uuid.UUID
    account_name: str
    account_code: str
    normal_side: str
    debit_total: Decimal
    credit_total: Decimal
    balance: Decimal
