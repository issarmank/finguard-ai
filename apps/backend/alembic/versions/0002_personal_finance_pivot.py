"""personal finance pivot

Revision ID: 0002
Revises: 0001
Create Date: 2026-05-27
"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB, UUID

revision: str = "0002"
down_revision: str | None = "0001"
branch_labels: str | tuple[str, ...] | None = None
depends_on: str | tuple[str, ...] | None = None


DEFAULT_CATEGORIES = [
    ("Food & Drink", "🍔", "#f59e0b", "expense"),
    ("Housing", "🏠", "#6366f1", "expense"),
    ("Transport", "🚗", "#3b82f6", "expense"),
    ("Shopping", "🛍️", "#ec4899", "expense"),
    ("Entertainment", "🎬", "#8b5cf6", "expense"),
    ("Health", "💊", "#10b981", "expense"),
    ("Subscriptions", "📱", "#f97316", "expense"),
    ("Education", "📚", "#06b6d4", "expense"),
    ("Travel", "✈️", "#84cc16", "expense"),
    ("Income", "💰", "#22c55e", "income"),
    ("Freelance", "💼", "#a3e635", "income"),
    ("Investment Return", "📈", "#34d399", "income"),
    ("Transfer", "↔️", "#9ca3af", "transfer"),
    ("Savings", "🏦", "#6ee7b7", "transfer"),
    ("Other", "📌", "#6b7280", "expense"),
]


def upgrade() -> None:
    # --- Drop old RLS policies ---
    for table in ("tenants", "accounts", "journal_entries", "audit_logs", "users", "ledger_lines"):
        op.execute(f"DROP POLICY IF EXISTS tenant_isolation ON {table}")
        op.execute(f"ALTER TABLE {table} DISABLE ROW LEVEL SECURITY")

    # --- Drop old trigger + function ---
    op.execute("DROP TRIGGER IF EXISTS check_balance ON ledger_lines")
    op.execute("DROP FUNCTION IF EXISTS enforce_double_entry()")

    # --- Drop old indexes ---
    for idx in (
        "idx_users_tenant",
        "idx_audit_tenant_time",
        "idx_ledger_lines_account",
        "idx_ledger_lines_entry",
        "idx_journal_tenant_date",
    ):
        op.execute(f"DROP INDEX IF EXISTS {idx}")

    # --- Drop old tables (reverse FK order) ---
    op.drop_table("ledger_lines")
    op.drop_table("journal_entries")
    op.drop_table("accounts")

    # --- Update users table: drop tenant_id FK + role constraint ---
    op.drop_constraint("users_role_check", "users", type_="check")
    op.drop_constraint("users_tenant_id_fkey", "users", type_="foreignkey")
    op.execute("DROP INDEX IF EXISTS idx_users_tenant")
    op.drop_column("users", "tenant_id")
    op.drop_column("users", "role")

    # --- Update audit_logs: drop tenant_id column ---
    op.drop_column("audit_logs", "tenant_id")

    # --- Drop tenants table ---
    op.drop_table("tenants")

    # =========================================================
    # NEW TABLES
    # =========================================================

    # Plaid linked institutions
    op.create_table(
        "plaid_items",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("item_id", sa.String, nullable=False, unique=True),
        sa.Column("access_token", sa.String, nullable=False),
        sa.Column("institution", sa.String, nullable=False),
        sa.Column("cursor", sa.String, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # Financial accounts (from Plaid or manual)
    op.create_table(
        "financial_accounts",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("plaid_item_id", UUID(as_uuid=True), sa.ForeignKey("plaid_items.id", ondelete="CASCADE"), nullable=True),
        sa.Column("plaid_account_id", sa.String, nullable=True, unique=True),
        sa.Column("name", sa.String, nullable=False),
        sa.Column("type", sa.String, nullable=False),
        sa.Column("subtype", sa.String, nullable=True),
        sa.Column("balance", sa.Numeric(19, 2), server_default="0"),
        sa.Column("currency", sa.String, server_default="USD"),
        sa.Column("is_manual", sa.Boolean, server_default="false"),
        sa.Column("is_active", sa.Boolean, server_default="true"),
        sa.Column("last_synced", sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint(
            "type IN ('checking','savings','credit','investment','loan','cash')",
            name="financial_accounts_type_check",
        ),
    )

    # Spending/income categories
    op.create_table(
        "categories",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=True),
        sa.Column("name", sa.String, nullable=False),
        sa.Column("icon", sa.String, nullable=True),
        sa.Column("color", sa.String, nullable=True),
        sa.Column("type", sa.String, nullable=False),
        sa.CheckConstraint("type IN ('income','expense','transfer')", name="categories_type_check"),
    )

    # Seed system-wide default categories (user_id = NULL)
    op.execute(
        sa.text(
            "INSERT INTO categories (name, icon, color, type) VALUES "
            + ", ".join(
                f"('{name}', '{icon}', '{color}', '{typ}')"
                for name, icon, color, typ in DEFAULT_CATEGORIES
            )
        )
    )

    # Transactions (from Plaid or manual)
    op.create_table(
        "transactions",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("account_id", UUID(as_uuid=True), sa.ForeignKey("financial_accounts.id", ondelete="CASCADE"), nullable=False),
        sa.Column("category_id", UUID(as_uuid=True), sa.ForeignKey("categories.id"), nullable=True),
        sa.Column("plaid_transaction_id", sa.String, nullable=True, unique=True),
        sa.Column("amount", sa.Numeric(19, 2), nullable=False),
        sa.Column("date", sa.Date, nullable=False),
        sa.Column("description", sa.String, nullable=False),
        sa.Column("merchant", sa.String, nullable=True),
        sa.Column("pending", sa.Boolean, server_default="false"),
        sa.Column("notes", sa.Text, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # Monthly budgets per category
    op.create_table(
        "budgets",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("category_id", UUID(as_uuid=True), sa.ForeignKey("categories.id", ondelete="CASCADE"), nullable=False),
        sa.Column("month", sa.Date, nullable=False),
        sa.Column("amount", sa.Numeric(19, 2), nullable=False),
        sa.UniqueConstraint("user_id", "category_id", "month", name="budgets_user_category_month_unique"),
    )

    # Savings goals
    op.create_table(
        "goals",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("account_id", UUID(as_uuid=True), sa.ForeignKey("financial_accounts.id"), nullable=True),
        sa.Column("name", sa.String, nullable=False),
        sa.Column("target_amount", sa.Numeric(19, 2), nullable=False),
        sa.Column("current_amount", sa.Numeric(19, 2), server_default="0"),
        sa.Column("target_date", sa.Date, nullable=True),
        sa.Column("emoji", sa.String, server_default="🎯"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # Net worth snapshots
    op.create_table(
        "net_worth_snapshots",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("snapshot_at", sa.Date, nullable=False),
        sa.Column("assets", sa.Numeric(19, 2), nullable=False),
        sa.Column("liabilities", sa.Numeric(19, 2), nullable=False),
        sa.UniqueConstraint("user_id", "snapshot_at", name="net_worth_user_date_unique"),
    )

    # Indexes
    op.execute("CREATE INDEX idx_transactions_user_date ON transactions(user_id, date DESC)")
    op.execute("CREATE INDEX idx_transactions_account ON transactions(account_id)")
    op.execute("CREATE INDEX idx_transactions_category ON transactions(category_id)")
    op.execute("CREATE INDEX idx_financial_accounts_user ON financial_accounts(user_id)")
    op.execute("CREATE INDEX idx_budgets_user_month ON budgets(user_id, month)")
    op.execute("CREATE INDEX idx_goals_user ON goals(user_id)")
    op.execute("CREATE INDEX idx_net_worth_user_date ON net_worth_snapshots(user_id, snapshot_at DESC)")
    op.execute("CREATE INDEX idx_audit_user_time ON audit_logs(user_id, created_at DESC)")


def downgrade() -> None:
    # Drop new indexes
    for idx in (
        "idx_audit_user_time",
        "idx_net_worth_user_date",
        "idx_goals_user",
        "idx_budgets_user_month",
        "idx_financial_accounts_user",
        "idx_transactions_category",
        "idx_transactions_account",
        "idx_transactions_user_date",
    ):
        op.execute(f"DROP INDEX IF EXISTS {idx}")

    # Drop new tables
    op.drop_table("net_worth_snapshots")
    op.drop_table("goals")
    op.drop_table("budgets")
    op.drop_table("transactions")
    op.drop_table("categories")
    op.drop_table("financial_accounts")
    op.drop_table("plaid_items")
