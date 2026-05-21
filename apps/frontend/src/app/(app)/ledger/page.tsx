"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Drawer, Modal } from "@/components/shared/drawer";
import { IconPlus, IconX, IconChevronLeft, IconChevronRight, IconTrash } from "@/components/icons";
import { fmtMoney, fmtDate } from "@/lib/utils";
import type {
  JournalEntryResponse,
  PaginatedResponse,
  AccountResponse,
  JournalEntryCreate,
} from "@/types/api";

const PAGE_SIZE = 20;

// ---- New Entry Modal --------------------------------------------------------

function NewEntryModal({
  accounts,
  onClose,
  onSaved,
}: {
  accounts: AccountResponse[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const today = new Date().toISOString().split("T")[0];
  const [form, setForm] = useState<JournalEntryCreate>({
    entry_date: today,
    description: "",
    reference: "",
    lines: [
      { account_id: "", side: "debit", amount: "", memo: "" },
      { account_id: "", side: "credit", amount: "", memo: "" },
    ],
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function setField<K extends keyof JournalEntryCreate>(k: K, v: JournalEntryCreate[K]) {
    setForm((p) => ({ ...p, [k]: v }));
  }

  function setLine(i: number, patch: Partial<JournalEntryCreate["lines"][0]>) {
    setForm((p) => {
      const lines = [...p.lines];
      lines[i] = { ...lines[i], ...patch };
      return { ...p, lines };
    });
  }

  function addLine() {
    setForm((p) => ({
      ...p,
      lines: [...p.lines, { account_id: "", side: "debit", amount: "", memo: "" }],
    }));
  }

  function removeLine(i: number) {
    setForm((p) => ({ ...p, lines: p.lines.filter((_, idx) => idx !== i) }));
  }

  const debitTotal = form.lines
    .filter((l) => l.side === "debit")
    .reduce((s, l) => s + (parseFloat(l.amount as string) || 0), 0);
  const creditTotal = form.lines
    .filter((l) => l.side === "credit")
    .reduce((s, l) => s + (parseFloat(l.amount as string) || 0), 0);
  const balanced = Math.abs(debitTotal - creditTotal) < 0.0001;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!balanced) {
      setError(`Entry is not balanced: debits ${fmtMoney(debitTotal)} ≠ credits ${fmtMoney(creditTotal)}`);
      return;
    }
    setLoading(true);
    try {
      await api.post("/ledger/entries", {
        ...form,
        reference: form.reference || null,
        lines: form.lines.map((l) => ({
          ...l,
          amount: parseFloat(l.amount as string).toFixed(4),
          memo: l.memo || null,
        })),
      });
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to create entry");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal onClose={onClose}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 600, color: "var(--heading)" }}>New Journal Entry</div>
          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>Double-entry — debits must equal credits</div>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={onClose} style={{ width: 30, padding: 0 }}>
          <IconX size={14} />
        </button>
      </div>

      {error && (
        <div style={{
          padding: "10px 14px", borderRadius: 8, marginBottom: 16,
          background: "var(--danger-dim)", border: "1px solid #f8717155",
          color: "var(--danger)", fontSize: 13,
        }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <label style={{ fontSize: 12, color: "var(--muted)", fontWeight: 500 }}>Date</label>
            <input
              className="input"
              type="date"
              value={form.entry_date}
              onChange={(e) => setField("entry_date", e.target.value)}
              required
            />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <label style={{ fontSize: 12, color: "var(--muted)", fontWeight: 500 }}>Reference</label>
            <input
              className="input"
              placeholder="INV-001, PO-042…"
              value={form.reference ?? ""}
              onChange={(e) => setField("reference", e.target.value)}
            />
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          <label style={{ fontSize: 12, color: "var(--muted)", fontWeight: 500 }}>Description</label>
          <input
            className="input"
            placeholder="e.g. Customer payment — Invoice #42"
            value={form.description}
            onChange={(e) => setField("description", e.target.value)}
            required
          />
        </div>

        {/* Lines */}
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <label style={{ fontSize: 12, color: "var(--muted)", fontWeight: 500 }}>Ledger Lines</label>
            <div style={{
              fontSize: 11.5, fontFamily: "var(--font-mono)",
              color: balanced ? "var(--primary)" : "var(--danger)",
            }}>
              {balanced ? "✓ Balanced" : `Δ ${fmtMoney(Math.abs(debitTotal - creditTotal))}`}
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {form.lines.map((line, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 80px 110px auto", gap: 6, alignItems: "center" }}>
                <select
                  className="select"
                  value={line.account_id}
                  onChange={(e) => setLine(i, { account_id: e.target.value })}
                  required
                >
                  <option value="">Select account…</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>{a.code} — {a.name}</option>
                  ))}
                </select>
                <select
                  className="select"
                  value={line.side}
                  onChange={(e) => setLine(i, { side: e.target.value as "debit" | "credit" })}
                >
                  <option value="debit">Dr</option>
                  <option value="credit">Cr</option>
                </select>
                <input
                  className="input"
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0.00"
                  value={line.amount as string}
                  onChange={(e) => setLine(i, { amount: e.target.value })}
                  required
                  style={{ textAlign: "right", fontFamily: "var(--font-mono)" }}
                />
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => removeLine(i)}
                  disabled={form.lines.length <= 2}
                  style={{ width: 28, padding: 0, opacity: form.lines.length <= 2 ? 0.3 : 1 }}
                >
                  <IconTrash size={13} />
                </button>
              </div>
            ))}
          </div>

          <button type="button" className="btn btn-ghost btn-sm" onClick={addLine} style={{ marginTop: 8, gap: 6 }}>
            <IconPlus size={13} /> Add line
          </button>
        </div>

        <div style={{ display: "flex", gap: 10, paddingTop: 4 }}>
          <button type="button" className="btn btn-ghost" onClick={onClose} style={{ flex: 1 }}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={loading} style={{ flex: 1 }}>
            {loading ? <span className="spinner" /> : "Post entry"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ---- Entry Detail Drawer ----------------------------------------------------

function EntryDrawer({
  entry,
  accounts,
  onClose,
  onVoided,
}: {
  entry: JournalEntryResponse;
  accounts: AccountResponse[];
  onClose: () => void;
  onVoided: () => void;
}) {
  const [voiding, setVoiding] = useState(false);

  const accountMap = Object.fromEntries(accounts.map((a) => [a.id, a]));

  async function handleVoid() {
    if (!confirm(`Void entry "${entry.description}"? This cannot be undone.`)) return;
    setVoiding(true);
    try {
      await api.post(`/ledger/entries/${entry.id}/void`, {});
      onVoided();
    } finally {
      setVoiding(false);
    }
  }

  const debitTotal = entry.lines
    .filter((l) => l.side === "debit")
    .reduce((s, l) => s + parseFloat(l.amount), 0);

  return (
    <Drawer onClose={onClose} title="Journal Entry" width={480}>
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 600, color: "var(--heading)", marginBottom: 4 }}>
              {entry.description}
            </div>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <StatusBadge status={entry.status} />
              {entry.is_locked && (
                <span style={{ fontSize: 11, color: "var(--warning)", fontWeight: 500 }}>🔒 Locked</span>
              )}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: "var(--heading)", fontFamily: "var(--font-mono)" }}>
              {fmtMoney(debitTotal)}
            </div>
            <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>
              {fmtDate(entry.entry_date)}
            </div>
          </div>
        </div>

        {/* Meta */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {[
            { label: "Entry ID", value: entry.id.slice(0, 8) + "…" },
            { label: "Reference", value: entry.reference ?? "—" },
            { label: "Posted", value: fmtDate(entry.created_at) },
            { label: "Lines", value: entry.lines.length.toString() },
          ].map(({ label, value }) => (
            <div key={label}>
              <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 3 }}>{label}</div>
              <div style={{ fontSize: 13, color: "var(--body)", fontFamily: "var(--font-mono)" }}>{value}</div>
            </div>
          ))}
        </div>

        {/* Lines table */}
        <div>
          <div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 500, marginBottom: 8 }}>Ledger Lines</div>
          <div style={{ border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
            <table className="data" style={{ width: "100%", margin: 0 }}>
              <thead>
                <tr>
                  <th>Account</th>
                  <th>Side</th>
                  <th style={{ textAlign: "right" }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {entry.lines.map((line) => {
                  const acct = accountMap[line.account_id];
                  return (
                    <tr key={line.id}>
                      <td>
                        <div style={{ fontSize: 12.5, color: "var(--body)" }}>
                          {acct ? `${acct.code} — ${acct.name}` : line.account_id.slice(0, 8)}
                        </div>
                        {line.memo && (
                          <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>{line.memo}</div>
                        )}
                      </td>
                      <td>
                        <span style={{
                          fontSize: 11, fontWeight: 600, padding: "2px 7px", borderRadius: 4,
                          background: line.side === "debit" ? "rgba(110,231,183,0.1)" : "rgba(251,191,36,0.1)",
                          color: line.side === "debit" ? "var(--primary)" : "var(--warning)",
                          textTransform: "uppercase",
                        }}>
                          {line.side === "debit" ? "Dr" : "Cr"}
                        </span>
                      </td>
                      <td style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontSize: 13 }}>
                        {fmtMoney(parseFloat(line.amount))}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Actions */}
        {entry.status === "posted" && !entry.is_locked && (
          <button
            className="btn btn-danger btn-sm"
            onClick={handleVoid}
            disabled={voiding}
            style={{ alignSelf: "flex-start" }}
          >
            {voiding ? <span className="spinner" /> : "Void entry"}
          </button>
        )}
      </div>
    </Drawer>
  );
}

// ---- Main Page --------------------------------------------------------------

export default function LedgerPage() {
  const [entries, setEntries] = useState<JournalEntryResponse[]>([]);
  const [accounts, setAccounts] = useState<AccountResponse[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [selectedEntry, setSelectedEntry] = useState<JournalEntryResponse | null>(null);
  const [showNewEntry, setShowNewEntry] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const load = useCallback(() => {
    setLoading(true);
    const statusParam = statusFilter !== "all" ? `&status=${statusFilter}` : "";
    Promise.all([
      api.get<PaginatedResponse<JournalEntryResponse>>(
        `/ledger/entries?page=${page}&size=${PAGE_SIZE}${statusParam}`
      ),
      api.get<PaginatedResponse<AccountResponse>>("/accounts?page=1&size=200"),
    ])
      .then(([ledger, accts]) => {
        setEntries(ledger.items);
        setTotal(ledger.total);
        setAccounts(accts.items);
      })
      .finally(() => setLoading(false));
  }, [page, statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <PageHeader
        title="Ledger"
        subtitle={`${total} journal entries`}
        actions={
          <button className="btn btn-primary btn-sm" onClick={() => setShowNewEntry(true)} style={{ gap: 6 }}>
            <IconPlus size={13} /> New entry
          </button>
        }
      />

      {/* Filters */}
      <div style={{ display: "flex", gap: 8 }}>
        {["all", "posted", "draft", "voided"].map((s) => (
          <button
            key={s}
            className={`btn btn-sm ${statusFilter === s ? "btn-primary" : "btn-ghost"}`}
            onClick={() => { setStatusFilter(s); setPage(1); }}
            style={{ textTransform: "capitalize" }}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="card" style={{ overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: 48, display: "grid", placeItems: "center" }}>
            <span className="spinner" style={{ width: 22, height: 22 }} />
          </div>
        ) : entries.length === 0 ? (
          <div style={{ padding: "48px 24px", textAlign: "center", color: "var(--muted)", fontSize: 13 }}>
            No entries found.{" "}
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => setShowNewEntry(true)}
              style={{ color: "var(--primary)", padding: 0, background: "none", border: "none", cursor: "pointer" }}
            >
              Post your first entry →
            </button>
          </div>
        ) : (
          <table className="data" style={{ width: "100%" }}>
            <thead>
              <tr>
                <th style={{ width: 100 }}>Date</th>
                <th>Description</th>
                <th>Reference</th>
                <th style={{ textAlign: "center" }}>Lines</th>
                <th style={{ textAlign: "right" }}>Amount (Dr)</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => {
                const debitTotal = entry.lines
                  .filter((l) => l.side === "debit")
                  .reduce((s, l) => s + parseFloat(l.amount), 0);
                return (
                  <tr
                    key={entry.id}
                    onClick={() => setSelectedEntry(entry)}
                    style={{ cursor: "pointer" }}
                  >
                    <td style={{ color: "var(--muted)", fontFamily: "var(--font-mono)", fontSize: 12 }}>
                      {fmtDate(entry.entry_date)}
                    </td>
                    <td style={{ color: "var(--body)", maxWidth: 320 }}>
                      <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {entry.description}
                      </div>
                    </td>
                    <td style={{ color: "var(--muted)", fontFamily: "var(--font-mono)", fontSize: 12 }}>
                      {entry.reference ?? "—"}
                    </td>
                    <td style={{ textAlign: "center", color: "var(--muted)" }}>{entry.lines.length}</td>
                    <td style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--heading)", fontWeight: 500 }}>
                      {fmtMoney(debitTotal)}
                    </td>
                    <td><StatusBadge status={entry.status} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{
            padding: "12px 16px", borderTop: "1px solid var(--border)",
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <span style={{ fontSize: 12, color: "var(--muted)" }}>
              Page {page} of {totalPages} · {total} entries
            </span>
            <div style={{ display: "flex", gap: 6 }}>
              <button
                className="btn btn-ghost btn-sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                style={{ width: 30, padding: 0 }}
              >
                <IconChevronLeft size={14} />
              </button>
              <button
                className="btn btn-ghost btn-sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                style={{ width: 30, padding: 0 }}
              >
                <IconChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modals / Drawers */}
      {showNewEntry && (
        <NewEntryModal
          accounts={accounts}
          onClose={() => setShowNewEntry(false)}
          onSaved={() => { setShowNewEntry(false); load(); }}
        />
      )}
      {selectedEntry && (
        <EntryDrawer
          entry={selectedEntry}
          accounts={accounts}
          onClose={() => setSelectedEntry(null)}
          onVoided={() => { setSelectedEntry(null); load(); }}
        />
      )}
    </div>
  );
}
