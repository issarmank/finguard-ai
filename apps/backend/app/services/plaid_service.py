import asyncio
import uuid
from datetime import UTC, datetime

import plaid
from plaid.api import plaid_api
from plaid.model.accounts_balance_get_request import AccountsBalanceGetRequest
from plaid.model.country_code import CountryCode
from plaid.model.item_public_token_exchange_request import ItemPublicTokenExchangeRequest
from plaid.model.link_token_create_request import LinkTokenCreateRequest
from plaid.model.link_token_create_request_user import LinkTokenCreateRequestUser
from plaid.model.products import Products
from plaid.model.transactions_sync_request import TransactionsSyncRequest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.crypto import decrypt_token, encrypt_token
from app.models.finance import Category, FinancialAccount, PlaidItem, Transaction

# Map Plaid's personal_finance_category.primary → our category names
_PLAID_CATEGORY_MAP: dict[str, str] = {
    "FOOD_AND_DRINK": "Food & Drink",
    "TRANSPORTATION": "Transport",
    "TRAVEL": "Travel",
    "SHOPPING": "Shopping",
    "GENERAL_MERCHANDISE": "Shopping",
    "ENTERTAINMENT": "Entertainment",
    "HOME_IMPROVEMENT": "Housing",
    "RENT_AND_UTILITIES": "Housing",
    "MEDICAL": "Health",
    "PERSONAL_CARE": "Health",
    "EDUCATION": "Education",
    "SUBSCRIPTION": "Subscriptions",
    "INCOME": "Income",
    "TRANSFER_IN": "Transfer",
    "TRANSFER_OUT": "Transfer",
    "LOAN_PAYMENTS": "Housing",
}

# Fallback map for older Plaid category list (first element)
_PLAID_LEGACY_MAP: dict[str, str] = {
    "Food and Drink": "Food & Drink",
    "Travel": "Travel",
    "Transportation": "Transport",
    "Shops": "Shopping",
    "Recreation": "Entertainment",
    "Healthcare": "Health",
    "Transfer": "Transfer",
    "Payment": "Transfer",
    "Income": "Income",
    "Deposit": "Income",
}


def _get_plaid_client() -> plaid_api.PlaidApi:
    env_map = {
        "sandbox": plaid.Environment.Sandbox,
        "development": plaid.Environment.Sandbox,  # plaid-python v39 has no Development
        "production": plaid.Environment.Production,
    }
    configuration = plaid.Configuration(
        host=env_map.get(settings.PLAID_ENV, plaid.Environment.Sandbox),
        api_key={
            "clientId": settings.PLAID_CLIENT_ID,
            "secret": settings.PLAID_SECRET,
        },
    )
    api_client = plaid.ApiClient(configuration)
    return plaid_api.PlaidApi(api_client)


async def create_link_token(user_id: uuid.UUID) -> str:
    client = _get_plaid_client()
    request = LinkTokenCreateRequest(
        user=LinkTokenCreateRequestUser(client_user_id=str(user_id)),
        client_name="FinGuard AI",
        products=[Products("transactions")],
        country_codes=[CountryCode("US")],
        language="en",
    )
    response = await asyncio.to_thread(client.link_token_create, request)
    return response["link_token"]


async def exchange_public_token(
    db: AsyncSession,
    user_id: uuid.UUID,
    public_token: str,
    institution: str,
) -> PlaidItem:
    client = _get_plaid_client()
    exchange_request = ItemPublicTokenExchangeRequest(public_token=public_token)
    exchange_response = await asyncio.to_thread(client.item_public_token_exchange, exchange_request)

    item = PlaidItem(
        user_id=user_id,
        item_id=exchange_response["item_id"],
        access_token=encrypt_token(exchange_response["access_token"]),
        institution=institution,
    )
    db.add(item)
    await db.flush()

    # Immediately fetch and store accounts
    await _sync_accounts(db, user_id, item)
    await db.commit()
    await db.refresh(item)
    return item


async def _sync_accounts(db: AsyncSession, user_id: uuid.UUID, item: PlaidItem) -> None:
    client = _get_plaid_client()
    balance_request = AccountsBalanceGetRequest(access_token=decrypt_token(item.access_token))
    balance_response = await asyncio.to_thread(client.accounts_balance_get, balance_request)

    for acct in balance_response["accounts"]:
        existing = await db.scalar(
            select(FinancialAccount).where(FinancialAccount.plaid_account_id == acct["account_id"])
        )
        balance = float(acct["balances"].get("current") or 0)
        if existing:
            existing.balance = balance  # type: ignore[assignment]
            existing.last_synced = datetime.now(UTC)
        else:
            fa = FinancialAccount(
                user_id=user_id,
                plaid_item_id=item.id,
                plaid_account_id=acct["account_id"],
                name=acct["name"],
                type=_map_account_type(acct["type"]),
                subtype=str(acct.get("subtype") or ""),
                balance=balance,
                last_synced=datetime.now(UTC),
            )
            db.add(fa)


def _map_account_type(plaid_type: str) -> str:
    mapping = {
        "depository": "checking",
        "credit": "credit",
        "investment": "investment",
        "loan": "loan",
    }
    return mapping.get(str(plaid_type).lower(), "checking")


def _resolve_category(
    tx: object,
    cat_map: dict[str, uuid.UUID],
    fallback: uuid.UUID | None,
) -> uuid.UUID | None:
    # Try modern personal_finance_category first
    pfc = tx.get("personal_finance_category") if hasattr(tx, "get") else None  # type: ignore[union-attr]
    if pfc:
        primary = str(pfc.get("primary", "")).upper()
        our_name = _PLAID_CATEGORY_MAP.get(primary)
        if our_name and our_name in cat_map:
            return cat_map[our_name]

    # Fall back to legacy category list
    legacy = tx.get("category") if hasattr(tx, "get") else None  # type: ignore[union-attr]
    if legacy and isinstance(legacy, list) and legacy:
        our_name = _PLAID_LEGACY_MAP.get(str(legacy[0]))
        if our_name and our_name in cat_map:
            return cat_map[our_name]

    return fallback


async def sync_transactions(db: AsyncSession, user_id: uuid.UUID, item_id: uuid.UUID) -> int:
    item = await db.scalar(select(PlaidItem).where(PlaidItem.id == item_id, PlaidItem.user_id == user_id))
    if not item:
        return 0

    client = _get_plaid_client()
    # Always start from the beginning so re-syncs can re-categorize existing transactions
    cursor = ""
    added_count = 0

    # Fetch all transaction pages from Plaid (non-blocking via thread pool)
    all_added: list = []
    has_more = True
    next_cursor = cursor
    while has_more:
        sync_request = TransactionsSyncRequest(
            access_token=decrypt_token(item.access_token),
            cursor=next_cursor,
        )
        response = await asyncio.to_thread(client.transactions_sync, sync_request)
        all_added.extend(response["added"])
        next_cursor = response["next_cursor"]
        has_more = response["has_more"]

    # Load all system categories into a name→id map
    cat_rows = await db.execute(select(Category).where(Category.user_id.is_(None)))
    cat_map: dict[str, uuid.UUID] = {c.name: c.id for c in cat_rows.scalars().all()}
    other_cat_id = cat_map.get("Other")

    # Bulk-load existing account IDs to avoid N+1
    account_ids_raw = list({tx["account_id"] for tx in all_added})
    acct_rows = await db.execute(select(FinancialAccount).where(FinancialAccount.plaid_account_id.in_(account_ids_raw)))
    acct_map = {a.plaid_account_id: a for a in acct_rows.scalars().all()}

    # Bulk-load existing transactions so we can update "Other" categories
    plaid_tx_ids = [tx["transaction_id"] for tx in all_added]
    existing_rows = await db.execute(select(Transaction).where(Transaction.plaid_transaction_id.in_(plaid_tx_ids)))
    existing_map: dict[str, Transaction] = {
        t.plaid_transaction_id: t  # type: ignore[index]
        for t in existing_rows.scalars().all()
        if t.plaid_transaction_id
    }

    for tx in all_added:
        acct = acct_map.get(tx["account_id"])
        if not acct:
            continue

        category_id = _resolve_category(tx, cat_map, other_cat_id)
        existing = existing_map.get(tx["transaction_id"])

        if existing:
            # Re-categorize if still on the default "Other"
            if existing.category_id == other_cat_id and category_id != other_cat_id:
                existing.category_id = category_id  # type: ignore[assignment]
            continue

        t = Transaction(
            user_id=user_id,
            account_id=acct.id,
            category_id=category_id,
            plaid_transaction_id=tx["transaction_id"],
            amount=float(tx["amount"]),
            date=tx["date"],
            description=tx.get("name") or tx.get("merchant_name") or "Unknown",
            merchant=tx.get("merchant_name"),
            pending=bool(tx.get("pending", False)),
        )
        db.add(t)
        added_count += 1

    item.cursor = next_cursor  # type: ignore[assignment]
    await db.commit()
    return added_count


async def sync_balances(db: AsyncSession, user_id: uuid.UUID, item_id: uuid.UUID) -> None:
    item = await db.scalar(select(PlaidItem).where(PlaidItem.id == item_id, PlaidItem.user_id == user_id))
    if not item:
        return
    await _sync_accounts(db, user_id, item)
    await db.commit()
