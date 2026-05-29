"use client";

import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { PageHeader } from "@/components/shared/page-header";
import { IconChevronLeft, IconChevronRight } from "@/components/icons";
import { fmtMoney } from "@/lib/utils";
import type { BudgetOut, CategoryOut } from "@/types/api";

function BudgetCard({ b, onEdit }: { b: BudgetOut; onEdit: (b: BudgetOut) => void }) {
  const over = b.pct >= 100;
  const warn = b.pct >= 80;
  const barColor = over ? "var(--danger)" : warn ? "#f59e0b" : "var(--primary)";

  return (
    <div className="card" style={{ padding: 18, cursor: "pointer" }} onClick={() => onEdit(b)}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 22 }}>{b.category_icon ?? "📦"}</span>
          <div>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--heading)" }}>{b.category_name}</div>
            <div style={{ fontSize: 11.5, color: "var(--muted)" }}>{b.pct}% used</div>
          </div>
        </div>
        {over && <span className="badge badge-red">OVER</span>}
        {!over && warn && <span className="badge badge-amber-solid">NEAR</span>}
      </div>

      <div style={{ marginBottom: 8 }}>
        <div style={{ height: 8, background: "var(--border)", borderRadius: 999, overflow: "hidden" }}>
          <div style={{ width: `${Math.min(100, b.pct)}%`, height: "100%", background: barColor, borderRadius: 999, transition: "width 0.3s" }} />
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
        <span style={{ color: "var(--muted)" }}>Spent: <span className="mono" style={{ color: "var(--body)" }}>{fmtMoney(b.spent)}</span></span>
        <span style={{ color: "var(--muted)" }}>Budget: <span className="mono" style={{ color: "var(--body)" }}>{fmtMoney(b.budget_amount)}</span></span>
      </div>
    </div>
  );
}

export default function BudgetsPage() {
  const today = new Date();
  const [monthOffset, setMonthOffset] = useState(0);
  const [budgets, setBudgets] = useState<BudgetOut[]>([]);
  const [categories, setCategories] = useState<CategoryOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<BudgetOut | null>(null);
  const [addCat, setAddCat] = useState("");
  const [addAmt, setAddAmt] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const monthDate = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
  const monthStr = monthDate.toISOString().slice(0, 10);
  const monthLabel = monthDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  function load() {
    setLoading(true);
    api.get<BudgetOut[]>(`/budgets/?month=${monthStr}`)
      .then(setBudgets)
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    api.get<CategoryOut[]>("/transactions/categories").then(setCategories);
  }, []);

  useEffect(() => { load(); }, [monthOffset]);

  const existingCatIds = new Set(budgets.map((b) => b.category_id));
  const availableCats = categories.filter((c) => c.type === "expense" && !existingCatIds.has(c.id));

  async function saveBudget(e: React.FormEvent) {
    e.preventDefault();
    if (!addCat || !addAmt) return;
    setSaving(true);
    setError(null);
    try {
      await api.put(`/budgets/${addCat}?month=${monthStr}`, { amount: parseFloat(addAmt) });
      setAddCat("");
      setAddAmt("");
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save budget");
    } finally {
      setSaving(false);
    }
  }

  async function updateBudget(b: BudgetOut, newAmt: number) {
    try {
      await api.put(`/budgets/${b.category_id}?month=${monthStr}`, { amount: newAmt });
      setEditing(null);
      load();
    } catch {
      // silent
    }
  }

  async function deleteBudget(b: BudgetOut) {
    try {
      await api.delete(`/budgets/${b.budget_id}`);
      setEditing(null);
      load();
    } catch {
      // silent
    }
  }

  const totalBudgeted = budgets.reduce((s, b) => s + b.budget_amount, 0);
  const totalSpent = budgets.reduce((s, b) => s + b.spent, 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <PageHeader
        title="Budgets"
        subtitle={`${budgets.length} categories budgeted · ${fmtMoney(totalSpent)} of ${fmtMoney(totalBudgeted)} spent`}
      />

      {/* Month navigator */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <button className="btn btn-ghost btn-sm" onClick={() => setMonthOffset((o) => o - 1)}>
          <IconChevronLeft size={14} />
        </button>
        <span style={{ fontSize: 14, fontWeight: 600, color: "var(--heading)", minWidth: 160, textAlign: "center" }}>{monthLabel}</span>
        <button className="btn btn-ghost btn-sm" onClick={() => setMonthOffset((o) => o + 1)} disabled={monthOffset >= 0}>
          <IconChevronRight size={14} />
        </button>
      </div>

      {/* Add budget form */}
      <div className="card" style={{ padding: "18px 20px" }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--heading)", marginBottom: 12 }}>Add Budget</div>
        {error && <div style={{ padding: "8px 12px", borderRadius: 6, marginBottom: 10, background: "var(--danger-dim)", color: "var(--danger)", fontSize: 12.5 }}>{error}</div>}
        <form onSubmit={saveBudget} style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1, minWidth: 180 }}>
            <label style={{ fontSize: 11, color: "var(--muted)" }}>Category</label>
            <select className="select" value={addCat} onChange={(e) => setAddCat(e.target.value)} required>
              <option value="">Select category…</option>
              {availableCats.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
            </select>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4, width: 130 }}>
            <label style={{ fontSize: 11, color: "var(--muted)" }}>Monthly limit ($)</label>
            <input className="input" type="number" min="1" step="0.01" placeholder="500" value={addAmt} onChange={(e) => setAddAmt(e.target.value)} required />
          </div>
          <button type="submit" className="btn btn-primary btn-sm" disabled={saving} style={{ height: 34 }}>
            {saving ? <span className="spinner" /> : "Add"}
          </button>
        </form>
      </div>

      {/* Budget cards grid */}
      {loading ? (
        <div style={{ padding: 40, display: "grid", placeItems: "center" }}>
          <span className="spinner" style={{ width: 22, height: 22 }} />
        </div>
      ) : budgets.length === 0 ? (
        <div style={{ padding: "40px 20px", textAlign: "center", color: "var(--muted)", fontSize: 13 }}>
          No budgets set for {monthLabel}. Add one above.
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
          {budgets.map((b) => <BudgetCard key={b.budget_id} b={b} onEdit={setEditing} />)}
        </div>
      )}

      {/* Edit modal */}
      {editing && (
        <EditBudgetModal
          b={editing}
          onClose={() => setEditing(null)}
          onSave={(amt) => updateBudget(editing, amt)}
          onDelete={() => deleteBudget(editing)}
        />
      )}
    </div>
  );
}

function EditBudgetModal({ b, onClose, onSave, onDelete }: {
  b: BudgetOut;
  onClose: () => void;
  onSave: (amt: number) => void;
  onDelete: () => void;
}) {
  const [amt, setAmt] = useState(b.budget_amount.toString());

  return (
    <div style={{ position: "fixed", inset: 0, background: "#000a", display: "grid", placeItems: "center", zIndex: 50 }} onClick={onClose}>
      <div className="card" style={{ padding: 24, width: 360, maxWidth: "90vw" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ fontSize: 14, fontWeight: 600, color: "var(--heading)", marginBottom: 16 }}>
          {b.category_icon} {b.category_name}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 16 }}>
          <label style={{ fontSize: 11, color: "var(--muted)" }}>Monthly limit ($)</label>
          <input className="input" type="number" min="1" step="0.01" value={amt} onChange={(e) => setAmt(e.target.value)} />
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => onSave(parseFloat(amt))}>Save</button>
          <button className="btn btn-danger" onClick={onDelete}>Delete</button>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
