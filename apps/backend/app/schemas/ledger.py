import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, field_validator, model_validator


class LedgerLineIn(BaseModel):
    account_id: uuid.UUID
    side: Literal["debit", "credit"]
    amount: Decimal
    memo: str | None = None

    @field_validator("amount")
    @classmethod
    def amount_must_be_positive(cls, v: Decimal) -> Decimal:
        if v <= 0:
            raise ValueError("Amount must be positive")
        return v


class JournalEntryCreate(BaseModel):
    entry_date: date
    description: str
    reference: str | None = None
    lines: list[LedgerLineIn]

    @model_validator(mode="after")
    def validate_double_entry(self) -> "JournalEntryCreate":
        if len(self.lines) < 2:
            raise ValueError("At least 2 ledger lines are required")
        debits = sum(l.amount for l in self.lines if l.side == "debit")
        credits = sum(l.amount for l in self.lines if l.side == "credit")
        if abs(debits - credits) > Decimal("0.0001"):
            raise ValueError(
                f"Entry is not balanced: debits={debits} credits={credits}"
            )
        return self


class LedgerLineResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    account_id: uuid.UUID
    side: str
    amount: Decimal
    memo: str | None


class JournalEntryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    tenant_id: uuid.UUID
    entry_date: date
    description: str
    reference: str | None
    status: str
    is_locked: bool
    created_by: uuid.UUID | None
    created_at: datetime
    lines: list[LedgerLineResponse]
