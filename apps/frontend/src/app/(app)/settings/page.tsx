"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { PageHeader } from "@/components/shared/page-header";
import { IconShield, IconSettings } from "@/components/icons";
import type { AccountResponse, PaginatedResponse, TenantResponse } from "@/types/api";

export default function SettingsPage() {
  const { logout } = useAuth();
  const router = useRouter();
  const [tenant, setTenant] = useState<TenantResponse | null>(null);
  const [accounts, setAccounts] = useState<AccountResponse[]>([]);
  const [loading, setLoading] = useState(true);

  // New account form
  const [newAcct, setNewAcct] = useState({
    code: "", name: "",
    type: "asset" as AccountResponse["type"],
    normal_side: "debit" as AccountResponse["normal_side"],
  });
  const [acctError, setAcctError] = useState<string | null>(null);
  const [acctLoading, setAcctLoading] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get<TenantResponse>("/tenants/me"),
      api.get<PaginatedResponse<AccountResponse>>("/accounts?page=1&size=100"),
    ]).then(([t, accts]) => {
      setTenant(t);
      setAccounts(accts.items);
    }).finally(() => setLoading(false));
  }, []);

  async function createAccount(e: React.FormEvent) {
    e.preventDefault();
    setAcctError(null);
    setAcctLoading(true);
    try {
      const created = await api.post<AccountResponse>("/accounts", newAcct);
      setAccounts((prev) => [...prev, created]);
      setNewAcct({ code: "", name: "", type: "asset", normal_side: "debit" });
    } catch (err) {
      setAcctError(err instanceof ApiError ? err.message : "Failed to create account");
    } finally {
      setAcctLoading(false);
    }
  }

  async function toggleAccount(acct: AccountResponse) {
    try {
      const updated = await api.patch<AccountResponse>(`/accounts/${acct.id}`, {
        is_active: !acct.is_active,
      });
      setAccounts((prev) => prev.map((a) => (a.id === acct.id ? updated : a)));
    } catch {
      // silent
    }
  }

  function handleLogout() {
    logout();
    router.push("/login");
  }

  const ACCOUNT_TYPE_COLORS: Record<string, string> = {
    asset: "var(--primary)",
    liability: "var(--danger)",
    equity: "var(--warning)",
    income: "#a78bfa",
    expense: "#fb923c",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28, maxWidth: 800 }}>
      <PageHeader
        title="Settings"
        subtitle="Manage your workspace and chart of accounts"
      />

      {/* Workspace */}
      <section>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <IconSettings size={14} stroke="var(--muted)" />
          <span style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Workspace
          </span>
        </div>
        <div className="card" style={{ padding: "20px 22px" }}>
          {loading ? (
            <span className="spinner" style={{ width: 18, height: 18 }} />
          ) : tenant ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
              {[
                { label: "Organisation", value: tenant.name },
                { label: "Workspace slug", value: tenant.slug },
                { label: "Status", value: tenant.is_active ? "Active" : "Inactive" },
              ].map(({ label, value }) => (
                <div key={label}>
                  <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 4 }}>{label}</div>
                  <div style={{ fontSize: 13.5, color: "var(--heading)", fontWeight: 500 }}>{value}</div>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </section>

      {/* Chart of Accounts */}
      <section>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <IconLayers size={14} stroke="var(--muted)" />
          <span style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Chart of Accounts ({accounts.length})
          </span>
        </div>

        {/* New Account Form */}
        <div className="card" style={{ padding: "18px 20px", marginBottom: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--heading)", marginBottom: 12 }}>Add Account</div>
          {acctError && (
            <div style={{
              padding: "8px 12px", borderRadius: 6, marginBottom: 12,
              background: "var(--danger-dim)", color: "var(--danger)", fontSize: 12.5,
            }}>
              {acctError}
            </div>
          )}
          <form onSubmit={createAccount} style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label style={{ fontSize: 11, color: "var(--muted)" }}>Code</label>
              <input className="input" placeholder="1001" value={newAcct.code}
                onChange={(e) => setNewAcct((p) => ({ ...p, code: e.target.value }))}
                required style={{ width: 80 }} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1, minWidth: 160 }}>
              <label style={{ fontSize: 11, color: "var(--muted)" }}>Name</label>
              <input className="input" placeholder="Cash and Equivalents" value={newAcct.name}
                onChange={(e) => setNewAcct((p) => ({ ...p, name: e.target.value }))}
                required />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label style={{ fontSize: 11, color: "var(--muted)" }}>Type</label>
              <select className="select" value={newAcct.type}
                onChange={(e) => setNewAcct((p) => ({
                  ...p,
                  type: e.target.value as AccountResponse["type"],
                  normal_side: (["asset", "expense"].includes(e.target.value) ? "debit" : "credit") as AccountResponse["normal_side"],
                }))}>
                <option value="asset">Asset</option>
                <option value="liability">Liability</option>
                <option value="equity">Equity</option>
                <option value="income">Income</option>
                <option value="expense">Expense</option>
              </select>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label style={{ fontSize: 11, color: "var(--muted)" }}>Normal Side</label>
              <select className="select" value={newAcct.normal_side}
                onChange={(e) => setNewAcct((p) => ({ ...p, normal_side: e.target.value as AccountResponse["normal_side"] }))}>
                <option value="debit">Debit</option>
                <option value="credit">Credit</option>
              </select>
            </div>
            <button type="submit" className="btn btn-primary btn-sm" disabled={acctLoading} style={{ height: 34 }}>
              {acctLoading ? <span className="spinner" /> : "Add"}
            </button>
          </form>
        </div>

        {/* Accounts Table */}
        <div className="card" style={{ overflow: "hidden" }}>
          {accounts.length === 0 ? (
            <div style={{ padding: "32px 20px", textAlign: "center", color: "var(--muted)", fontSize: 13 }}>
              No accounts yet. Add your first account above.
            </div>
          ) : (
            <table className="data" style={{ width: "100%" }}>
              <thead>
                <tr>
                  <th style={{ width: 70 }}>Code</th>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Normal Side</th>
                  <th style={{ textAlign: "center" }}>Active</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((acct) => (
                  <tr key={acct.id} style={{ opacity: acct.is_active ? 1 : 0.45 }}>
                    <td style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--muted)" }}>
                      {acct.code}
                    </td>
                    <td style={{ color: "var(--body)" }}>{acct.name}</td>
                    <td>
                      <span style={{
                        fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 4,
                        background: `${ACCOUNT_TYPE_COLORS[acct.type]}18`,
                        color: ACCOUNT_TYPE_COLORS[acct.type],
                        textTransform: "capitalize",
                      }}>
                        {acct.type}
                      </span>
                    </td>
                    <td style={{ color: "var(--muted)", textTransform: "capitalize", fontSize: 12.5 }}>
                      {acct.normal_side}
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <button
                        onClick={() => toggleAccount(acct)}
                        style={{
                          width: 36, height: 20, borderRadius: 999, cursor: "pointer",
                          background: acct.is_active ? "var(--primary)" : "var(--border-strong)",
                          border: "none", position: "relative", transition: "background 0.2s",
                        }}
                      >
                        <div style={{
                          width: 14, height: 14, borderRadius: 999, background: "#fff",
                          position: "absolute", top: 3,
                          left: acct.is_active ? 19 : 3,
                          transition: "left 0.2s",
                        }} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {/* Danger Zone */}
      <section>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <IconShield size={14} stroke="var(--danger)" />
          <span style={{ fontSize: 12, fontWeight: 600, color: "var(--danger)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Session
          </span>
        </div>
        <div className="card" style={{ padding: "18px 22px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 13.5, color: "var(--heading)", fontWeight: 500, marginBottom: 3 }}>Sign out</div>
            <div style={{ fontSize: 12, color: "var(--muted)" }}>Clear your session and return to the login screen</div>
          </div>
          <button className="btn btn-danger btn-sm" onClick={handleLogout}>Sign out</button>
        </div>
      </section>
    </div>
  );
}

// Icon used inline in settings — not in icons.tsx
function IconLayers({ size = 16, stroke = "currentColor" }: { size?: number; stroke?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 2 7 12 12 22 7 12 2" />
      <polyline points="2 17 12 22 22 17" />
      <polyline points="2 12 12 17 22 12" />
    </svg>
  );
}
