"use client";

import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { PageHeader } from "@/components/shared/page-header";
import { IconPlus, IconTrash } from "@/components/icons";
import { fmtMoney } from "@/lib/utils";
import type { GoalOut } from "@/types/api";

function GoalCard({ g, onUpdate, onDelete }: { g: GoalOut; onUpdate: (id: string, current: number) => void; onDelete: (id: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [newAmt, setNewAmt] = useState(g.current_amount.toString());

  const radius = 44;
  const circumference = 2 * Math.PI * radius;
  const dash = circumference * (g.pct / 100);

  return (
    <div className="card" style={{ padding: 22 }}>
      <div style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 14 }}>
        {/* Circular progress */}
        <div style={{ position: "relative", width: 100, height: 100, flexShrink: 0 }}>
          <svg width={100} height={100} viewBox="0 0 100 100" style={{ transform: "rotate(-90deg)" }}>
            <circle cx={50} cy={50} r={radius} fill="none" stroke="var(--border)" strokeWidth={8} />
            <circle cx={50} cy={50} r={radius} fill="none" stroke="var(--primary)" strokeWidth={8}
              strokeDasharray={`${dash} ${circumference}`} strokeLinecap="round" />
          </svg>
          <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", flexDirection: "column", textAlign: "center" }}>
            <div style={{ fontSize: 22 }}>{g.emoji}</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--heading)" }}>{g.pct}%</div>
          </div>
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: "var(--heading)", marginBottom: 4 }}>{g.name}</div>
          <div style={{ fontSize: 12.5, color: "var(--muted)", marginBottom: 2 }}>
            <span className="mono">{fmtMoney(g.current_amount)}</span> of <span className="mono">{fmtMoney(g.target_amount)}</span>
          </div>
          {g.target_date && (
            <div style={{ fontSize: 12, color: g.days_left && g.days_left < 30 ? "#f59e0b" : "var(--muted)" }}>
              {g.days_left != null ? (g.days_left > 0 ? `${g.days_left} days left` : "Deadline passed") : ""}
              {g.target_date && ` · ${new Date(g.target_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`}
            </div>
          )}
        </div>
      </div>

      {/* Remaining */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <span style={{ fontSize: 12, color: "var(--muted)" }}>
          Remaining: <span className="mono" style={{ color: "var(--body)" }}>{fmtMoney(Math.max(0, g.target_amount - g.current_amount))}</span>
        </span>
        <div style={{ display: "flex", gap: 6 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => setEditing(!editing)}>
            {editing ? "Cancel" : "Update"}
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => onDelete(g.id)} style={{ color: "var(--danger)" }}>
            <IconTrash size={13} />
          </button>
        </div>
      </div>

      {editing && (
        <form onSubmit={(e) => { e.preventDefault(); onUpdate(g.id, parseFloat(newAmt)); setEditing(false); }}
          style={{ display: "flex", gap: 8, marginTop: 4 }}>
          <input className="input" type="number" min="0" step="0.01" value={newAmt}
            onChange={(e) => setNewAmt(e.target.value)} style={{ flex: 1 }} />
          <button type="submit" className="btn btn-primary btn-sm">Save</button>
        </form>
      )}
    </div>
  );
}

export default function GoalsPage() {
  const [goals, setGoals] = useState<GoalOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: "", target_amount: "", current_amount: "0", target_date: "", emoji: "🎯" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function load() {
    setLoading(true);
    api.get<GoalOut[]>("/goals/").then(setGoals).finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  async function createGoal(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api.post("/goals/", {
        name: form.name,
        target_amount: parseFloat(form.target_amount),
        current_amount: parseFloat(form.current_amount || "0"),
        target_date: form.target_date || null,
        emoji: form.emoji,
      });
      setForm({ name: "", target_amount: "", current_amount: "0", target_date: "", emoji: "🎯" });
      setShowAdd(false);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to create goal");
    } finally {
      setSaving(false);
    }
  }

  async function updateGoal(id: string, current_amount: number) {
    await api.patch(`/goals/${id}`, { current_amount });
    load();
  }

  async function deleteGoal(id: string) {
    await api.delete(`/goals/${id}`);
    load();
  }

  const totalTarget = goals.reduce((s, g) => s + g.target_amount, 0);
  const totalSaved = goals.reduce((s, g) => s + g.current_amount, 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <PageHeader
        title="Goals"
        subtitle={`${goals.length} goals · ${fmtMoney(totalSaved)} saved of ${fmtMoney(totalTarget)}`}
        actions={
          <button className="btn btn-primary" onClick={() => setShowAdd(!showAdd)}>
            <IconPlus size={13} /> New Goal
          </button>
        }
      />

      {/* Add goal form */}
      {showAdd && (
        <div className="card" style={{ padding: "20px 22px" }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--heading)", marginBottom: 14 }}>New Savings Goal</div>
          {error && <div style={{ padding: "8px 12px", borderRadius: 6, marginBottom: 10, background: "var(--danger-dim)", color: "var(--danger)", fontSize: 12.5 }}>{error}</div>}
          <form onSubmit={createGoal} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label style={{ fontSize: 11, color: "var(--muted)" }}>Goal name</label>
              <input className="input" placeholder="Emergency fund" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} required />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label style={{ fontSize: 11, color: "var(--muted)" }}>Emoji</label>
              <input className="input" placeholder="🎯" value={form.emoji} onChange={(e) => setForm((p) => ({ ...p, emoji: e.target.value }))} style={{ fontSize: 20, width: 60 }} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label style={{ fontSize: 11, color: "var(--muted)" }}>Target amount ($)</label>
              <input className="input" type="number" min="1" step="0.01" placeholder="10000" value={form.target_amount} onChange={(e) => setForm((p) => ({ ...p, target_amount: e.target.value }))} required />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label style={{ fontSize: 11, color: "var(--muted)" }}>Current amount ($)</label>
              <input className="input" type="number" min="0" step="0.01" placeholder="0" value={form.current_amount} onChange={(e) => setForm((p) => ({ ...p, current_amount: e.target.value }))} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label style={{ fontSize: 11, color: "var(--muted)" }}>Target date (optional)</label>
              <input className="input" type="date" value={form.target_date} onChange={(e) => setForm((p) => ({ ...p, target_date: e.target.value }))} />
            </div>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 8 }}>
              <button type="submit" className="btn btn-primary" disabled={saving} style={{ flex: 1 }}>
                {saving ? <span className="spinner" /> : "Create Goal"}
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => setShowAdd(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div style={{ padding: 40, display: "grid", placeItems: "center" }}>
          <span className="spinner" style={{ width: 22, height: 22 }} />
        </div>
      ) : goals.length === 0 ? (
        <div style={{ padding: "60px 20px", textAlign: "center", color: "var(--muted)", fontSize: 13 }}>
          No goals yet. Create your first savings goal above.
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 14 }}>
          {goals.map((g) => (
            <GoalCard key={g.id} g={g} onUpdate={updateGoal} onDelete={deleteGoal} />
          ))}
        </div>
      )}
    </div>
  );
}
