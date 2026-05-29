"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { usePlaidLink } from "react-plaid-link";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { PageHeader } from "@/components/shared/page-header";
import { IconShield, IconSettings, IconLink2 } from "@/components/icons";
import type { PlaidItemOut, AccountOut } from "@/types/api";

// Separate component so usePlaidLink only mounts when we have a token
function PlaidLinkButton({
  onSuccess,
  onExit,
}: {
  onSuccess: (publicToken: string, institution: string) => void;
  onExit: () => void;
}) {
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    api.post<{ link_token: string }>("/plaid/link-token", {})
      .then((r) => setLinkToken(r.link_token))
      .catch((err) => setFetchError(err instanceof ApiError ? err.message : "Failed to start Plaid"));
  }, []);

  const onPlaidSuccess = useCallback(
    (public_token: string, metadata: { institution?: { name?: string } | null }) => {
      onSuccess(public_token, metadata?.institution?.name ?? "Unknown Bank");
    },
    [onSuccess],
  );

  const { open, ready } = usePlaidLink({
    token: linkToken ?? "",
    onSuccess: onPlaidSuccess,
    onExit: onExit,
  });

  if (fetchError) {
    return (
      <div style={{ padding: "8px 12px", borderRadius: 6, background: "var(--danger-dim)", color: "var(--danger)", fontSize: 12.5 }}>
        {fetchError}
      </div>
    );
  }

  return (
    <button
      className="btn btn-primary"
      onClick={() => open()}
      disabled={!ready || !linkToken}
    >
      {!linkToken ? <span className="spinner" /> : "🏦 Connect Bank"}
    </button>
  );
}

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState<PlaidItemOut[]>([]);
  const [accounts, setAccounts] = useState<AccountOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPlaid, setShowPlaid] = useState(false);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  function loadData() {
    return Promise.all([
      api.get<PlaidItemOut[]>("/plaid/items").catch(() => []),
      api.get<AccountOut[]>("/transactions/accounts"),
    ]).then(([its, accts]) => {
      setItems(its);
      setAccounts(accts);
    });
  }

  useEffect(() => {
    loadData().finally(() => setLoading(false));
  }, []);

  async function handlePlaidSuccess(publicToken: string, institution: string) {
    setShowPlaid(false);
    setStatusMsg("Linking account…");
    try {
      // Step 4 — exchange public token
      const item = await api.post<PlaidItemOut>("/plaid/exchange", {
        public_token: publicToken,
        institution,
      });
      setStatusMsg("Syncing transactions…");
      // Step 5 — sync transactions
      const { synced } = await api.post<{ synced: number }>(`/plaid/sync/${item.id}`, {});
      setStatusMsg(`✓ Connected ${institution} — ${synced} transactions imported`);
      await loadData();
    } catch (err) {
      setStatusMsg(`Error: ${err instanceof ApiError ? err.message : "Connection failed"}`);
    }
  }

  async function syncItem(itemId: string) {
    setSyncing(itemId);
    try {
      await api.post(`/plaid/sync/${itemId}`, {});
      const accts = await api.get<AccountOut[]>("/transactions/accounts");
      setAccounts(accts);
    } catch {
      // silent
    } finally {
      setSyncing(null);
    }
  }

  function handleLogout() {
    logout();
    router.push("/login");
  }

  const ACCOUNT_TYPE_COLORS: Record<string, string> = {
    checking: "var(--primary)",
    savings: "#34d399",
    investment: "#a78bfa",
    cash: "#86efac",
    credit: "var(--danger)",
    loan: "#fca5a5",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28, maxWidth: 800 }}>
      <PageHeader title="Settings" subtitle="Manage your linked accounts and profile" />

      {/* Profile */}
      <section>
        <SectionHeader icon={<IconSettings size={14} stroke="var(--muted)" />} label="Profile" />
        <div className="card" style={{ padding: "20px 22px" }}>
          {user ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16 }}>
              <Field label="Email" value={user.email} />
              <Field label="Account ID" value={user.id.slice(0, 8) + "…"} mono />
            </div>
          ) : (
            <span className="spinner" style={{ width: 18, height: 18 }} />
          )}
        </div>
      </section>

      {/* Linked Banks */}
      <section>
        <SectionHeader icon={<IconLink2 size={14} stroke="var(--muted)" />} label="Linked Bank Accounts" />
        <div className="card" style={{ padding: "18px 20px", marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
            <div>
              <div style={{ fontSize: 13.5, color: "var(--heading)", fontWeight: 500, marginBottom: 3 }}>Connect a Bank</div>
              <div style={{ fontSize: 12, color: "var(--muted)" }}>Use Plaid to securely link your bank, credit card, or investment accounts.</div>
            </div>
            {showPlaid ? (
              <PlaidLinkButton
                onSuccess={handlePlaidSuccess}
                onExit={() => setShowPlaid(false)}
              />
            ) : (
              <button className="btn btn-primary" onClick={() => setShowPlaid(true)}>
                🏦 Connect Bank
              </button>
            )}
          </div>
          {statusMsg && (
            <div style={{
              marginTop: 10, padding: "8px 12px", borderRadius: 6, fontSize: 12.5,
              background: statusMsg.startsWith("Error") ? "var(--danger-dim)" : "var(--primary-faint)",
              color: statusMsg.startsWith("Error") ? "var(--danger)" : "var(--primary)",
              border: `1px solid ${statusMsg.startsWith("Error") ? "#f8717133" : "var(--primary-dim)"}`,
            }}>
              {statusMsg}
            </div>
          )}
        </div>

        {loading ? (
          <div style={{ padding: 24, display: "grid", placeItems: "center" }}><span className="spinner" style={{ width: 20, height: 20 }} /></div>
        ) : items.length === 0 ? (
          <div style={{ padding: "24px 20px", textAlign: "center", color: "var(--muted)", fontSize: 13 }}>
            No banks linked yet. Connect one above to import your transactions automatically.
          </div>
        ) : (
          items.map((item) => (
            <div key={item.id} className="card" style={{ padding: "14px 18px", marginBottom: 8, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--heading)" }}>{item.institution}</div>
                <div style={{ fontSize: 11.5, color: "var(--muted)" }}>
                  Connected {new Date(item.created_at).toLocaleDateString()}
                  {item.last_synced && ` · Last synced ${new Date(item.last_synced).toLocaleDateString()}`}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn btn-ghost btn-sm" onClick={() => syncItem(item.id)} disabled={syncing === item.id}>
                  {syncing === item.id ? <span className="spinner" /> : "Sync"}
                </button>
              </div>
            </div>
          ))
        )}
      </section>

      {/* Account List */}
      {accounts.length > 0 && (
        <section>
          <SectionHeader icon={<IconSettings size={14} stroke="var(--muted)" />} label={`Accounts (${accounts.length})`} />
          <div className="card" style={{ overflow: "hidden" }}>
            <table className="data" style={{ width: "100%" }}>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Type</th>
                  <th style={{ textAlign: "right" }}>Balance</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((acct) => (
                  <tr key={acct.id}>
                    <td style={{ color: "var(--body)" }}>{acct.name}</td>
                    <td>
                      <span style={{
                        fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 4,
                        background: `${ACCOUNT_TYPE_COLORS[acct.type] ?? "#6ee7b7"}18`,
                        color: ACCOUNT_TYPE_COLORS[acct.type] ?? "var(--primary)",
                        textTransform: "capitalize",
                      }}>
                        {acct.type}
                      </span>
                    </td>
                    <td className="mono" style={{ textAlign: "right", fontSize: 13, color: "var(--heading)" }}>
                      {acct.balance < 0 ? "-" : ""}${Math.abs(acct.balance).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Session */}
      <section>
        <SectionHeader icon={<IconShield size={14} stroke="var(--danger)" />} label="Session" danger />
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

function SectionHeader({ icon, label, danger }: { icon: React.ReactNode; label: string; danger?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
      {icon}
      <span style={{ fontSize: 12, fontWeight: 600, color: danger ? "var(--danger)" : "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
        {label}
      </span>
    </div>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 4 }}>{label}</div>
      <div className={mono ? "mono" : ""} style={{ fontSize: 13.5, color: "var(--heading)", fontWeight: 500 }}>{value}</div>
    </div>
  );
}
