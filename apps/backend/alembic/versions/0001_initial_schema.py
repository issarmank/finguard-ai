"""initial schema

Revision ID: 0001
Revises:
Create Date: 2026-05-19
"""

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import INET, JSONB, UUID

from alembic import op

revision: str = "0001"
down_revision: str | None = None
branch_labels: str | tuple[str, ...] | None = None
depends_on: str | tuple[str, ...] | None = None


def upgrade() -> None:
    # --- TENANTS ---
    op.create_table(
        "tenants",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("name", sa.String, nullable=False),
        sa.Column("slug", sa.String, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("is_active", sa.Boolean, server_default="true"),
        sa.UniqueConstraint("slug", name="tenants_slug_unique"),
    )

    # --- USERS ---
    op.create_table(
        "users",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("tenant_id", UUID(as_uuid=True), sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("email", sa.String, nullable=False),
        sa.Column("hashed_password", sa.String, nullable=False),
        sa.Column("role", sa.String, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint("email", name="users_email_unique"),
        sa.CheckConstraint("role IN ('admin', 'accountant', 'auditor', 'viewer')", name="users_role_check"),
    )

    # --- ACCOUNTS (Chart of Accounts) ---
    op.create_table(
        "accounts",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("tenant_id", UUID(as_uuid=True), sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("code", sa.String, nullable=False),
        sa.Column("name", sa.String, nullable=False),
        sa.Column("type", sa.String, nullable=False),
        sa.Column("normal_side", sa.String, nullable=False),
        sa.Column("is_active", sa.Boolean, server_default="true"),
        sa.UniqueConstraint("tenant_id", "code", name="accounts_tenant_code_unique"),
        sa.CheckConstraint(
            "type IN ('asset', 'liability', 'equity', 'income', 'expense')",
            name="accounts_type_check",
        ),
        sa.CheckConstraint("normal_side IN ('debit', 'credit')", name="accounts_normal_side_check"),
    )

    # --- JOURNAL ENTRIES (immutable headers) ---
    op.create_table(
        "journal_entries",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("tenant_id", UUID(as_uuid=True), sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("entry_date", sa.Date, nullable=False),
        sa.Column("description", sa.String, nullable=False),
        sa.Column("reference", sa.String, nullable=True),
        sa.Column("status", sa.String, nullable=False, server_default="posted"),
        sa.Column("created_by", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("is_locked", sa.Boolean, server_default="false"),
        sa.CheckConstraint("status IN ('draft', 'posted', 'voided')", name="journal_entries_status_check"),
    )

    # --- LEDGER LINES (debits + credits, must balance per entry) ---
    op.create_table(
        "ledger_lines",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column(
            "journal_entry_id",
            UUID(as_uuid=True),
            sa.ForeignKey("journal_entries.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("account_id", UUID(as_uuid=True), sa.ForeignKey("accounts.id"), nullable=False),
        sa.Column("side", sa.String, nullable=False),
        sa.Column("amount", sa.Numeric(19, 4), nullable=False),
        sa.Column("memo", sa.Text, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.CheckConstraint("side IN ('debit', 'credit')", name="ledger_lines_side_check"),
        sa.CheckConstraint("amount > 0", name="ledger_lines_amount_positive"),
    )

    # --- AUDIT LOG (append-only) ---
    op.create_table(
        "audit_logs",
        sa.Column("id", sa.BigInteger, primary_key=True, autoincrement=True),
        sa.Column("tenant_id", UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", UUID(as_uuid=True), nullable=True),
        sa.Column("action", sa.String, nullable=False),
        sa.Column("entity_type", sa.String, nullable=False),
        sa.Column("entity_id", UUID(as_uuid=True), nullable=True),
        sa.Column("payload", JSONB, nullable=True),
        sa.Column("ip_address", INET, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # --- INDEXES ---
    op.execute("CREATE INDEX idx_journal_tenant_date ON journal_entries(tenant_id, entry_date DESC)")
    op.execute("CREATE INDEX idx_ledger_lines_entry ON ledger_lines(journal_entry_id)")
    op.execute("CREATE INDEX idx_ledger_lines_account ON ledger_lines(account_id)")
    op.execute("CREATE INDEX idx_audit_tenant_time ON audit_logs(tenant_id, created_at DESC)")
    op.execute("CREATE INDEX idx_users_tenant ON users(tenant_id)")

    # --- DOUBLE-ENTRY BALANCE TRIGGER ---
    op.execute("""
        CREATE OR REPLACE FUNCTION enforce_double_entry()
        RETURNS TRIGGER LANGUAGE plpgsql AS $$
        DECLARE
            total_debits  NUMERIC;
            total_credits NUMERIC;
        BEGIN
            SELECT
                COALESCE(SUM(amount) FILTER (WHERE side = 'debit'), 0),
                COALESCE(SUM(amount) FILTER (WHERE side = 'credit'), 0)
            INTO total_debits, total_credits
            FROM ledger_lines
            WHERE journal_entry_id = NEW.journal_entry_id;

            IF ABS(total_debits - total_credits) > 0.0001 THEN
                RAISE EXCEPTION 'Journal entry is not balanced: debits=% credits=%',
                    total_debits, total_credits;
            END IF;
            RETURN NEW;
        END;
        $$;
    """)

    op.execute("""
        CREATE CONSTRAINT TRIGGER check_balance
        AFTER INSERT OR UPDATE ON ledger_lines
        DEFERRABLE INITIALLY DEFERRED
        FOR EACH ROW EXECUTE FUNCTION enforce_double_entry();
    """)

    # --- ROW LEVEL SECURITY ---
    # The true second arg to current_setting returns NULL (not an error) when unset,
    # so migrations run as superuser bypass RLS without issue.

    # tenants table uses `id` as its PK — it IS the tenant row
    op.execute("ALTER TABLE tenants ENABLE ROW LEVEL SECURITY")
    op.execute("""
        CREATE POLICY tenant_isolation ON tenants
        USING (id = current_setting('app.current_tenant_id', true)::UUID)
    """)

    for table in ("accounts", "journal_entries", "audit_logs", "users"):
        op.execute(f"ALTER TABLE {table} ENABLE ROW LEVEL SECURITY")
        op.execute(f"""
            CREATE POLICY tenant_isolation ON {table}
            USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID)
        """)

    # ledger_lines has no direct tenant_id — scope through journal_entries
    op.execute("ALTER TABLE ledger_lines ENABLE ROW LEVEL SECURITY")
    op.execute("""
        CREATE POLICY tenant_isolation ON ledger_lines
        USING (
            journal_entry_id IN (
                SELECT id FROM journal_entries
                WHERE tenant_id = current_setting('app.current_tenant_id', true)::UUID
            )
        )
    """)


def downgrade() -> None:
    # RLS
    for table in ("tenants", "accounts", "journal_entries", "audit_logs", "users", "ledger_lines"):
        op.execute(f"DROP POLICY IF EXISTS tenant_isolation ON {table}")
        op.execute(f"ALTER TABLE {table} DISABLE ROW LEVEL SECURITY")

    # Trigger + function
    op.execute("DROP TRIGGER IF EXISTS check_balance ON ledger_lines")
    op.execute("DROP FUNCTION IF EXISTS enforce_double_entry()")

    # Indexes
    for idx in (
        "idx_users_tenant",
        "idx_audit_tenant_time",
        "idx_ledger_lines_account",
        "idx_ledger_lines_entry",
        "idx_journal_tenant_date",
    ):
        op.execute(f"DROP INDEX IF EXISTS {idx}")

    # Tables (reverse FK order)
    op.drop_table("audit_logs")
    op.drop_table("ledger_lines")
    op.drop_table("journal_entries")
    op.drop_table("accounts")
    op.drop_table("users")
    op.drop_table("tenants")
