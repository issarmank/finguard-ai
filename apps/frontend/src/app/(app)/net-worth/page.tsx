"use client";

import { useEffect, useState } from "react";
import {
  XAxis, YAxis, CartesianGrid, Tooltip,
  Area, AreaChart, ResponsiveContainer, Legend,
} from "recharts";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/shared/page-header";
import { IconRefresh } from "@/components/icons";
import { fmtMoney } from "@/lib/utils";
import type { NetWorthCurrent, NetWorthHistory } from "@/types/api";

const ACCOUNT_TYPE_COLORS: Record<string, string> = {
  checking: "#6ee7b7",
  savings: "#34d399",
  investment: "#a78bfa",
  cash: "#86efac",
  credit: "#f87171",
  loan: "#fca5a5",
};

export default function NetWorthPage() {
  const [nw, setNw] = useState<NetWorthCurrent | null>(null);
  const [history, setHistory] = useState<NetWorthHistory[]>([]);
  const [days, setDays] = useState(90);
  const [loading, setLoading] = useState(true);
  const [snapshotting, setSnapshotting] = useState(false);

  function load() {
    setLoading(true);
    Promise.all([
      api.get<NetWorthCurrent>("/net-worth/").catch(() => null),
      api.get<NetWorthHistory[]>(`/net-worth/history?days=${days}`).catch(() => []),
    ]).then(([nwData, hist]) => {
      setNw(nwData);
      setHistory(hist as NetWorthHistory[]);
    }).finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, [days]);

  async function takeSnapshot() {
    setSnapshotting(true);
    await api.post("/net-worth/snapshot", {}).catch(() => null);
    setSnapshotting(false);
    load();
  }

  const assets = nw?.accounts.filter((a) => a.is_asset) ?? [];
  const liabilities = nw?.accounts.filter((a) => !a.is_asset) ?? [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <PageHeader
        title="Net Worth"
        subtitle="Assets minus liabilities across all accounts"
        actions={
          <>
            <button className="btn btn-ghost" onClick={load}><IconRefresh size={13} /> Refresh</button>
            <button className="btn btn-primary" onClick={takeSnapshot} disabled={snapshotting}>
              {snapshotting ? <span className="spinner" /> : "📸 Snapshot"}
            </button>
          </>
        }
      />

      {/* Net Worth Summary */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
        {[
          { label: "Net Worth", value: nw?.net_worth ?? 0, color: "var(--primary)" },
          { label: "Total Assets", value: nw?.assets ?? 0, color: "#6ee7b7" },
          { label: "Total Liabilities", value: nw?.liabilities ?? 0, color: "var(--danger)" },
        ].map(({ label, value, color }) => (
          <div key={label} className="card" style={{ padding: 20 }}>
            <div style={{ fontSize: 12, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 500, marginBottom: 8 }}>{label}</div>
            <div className="mono" style={{ fontSize: 28, fontWeight: 700, color, letterSpacing: "-0.02em" }}>
              {loading ? "—" : fmtMoney(value)}
            </div>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="card" style={{ padding: 18 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div>
            <div style={{ color: "var(--heading)", fontSize: 14, fontWeight: 600 }}>Net Worth Over Time</div>
            <div style={{ color: "var(--muted)", fontSize: 12, marginTop: 2 }}>Historical snapshots</div>
          </div>
          <div style={{ display: "flex", gap: 4 }}>
            {[30, 90, 180, 365].map((d) => (
              <button key={d} className="btn btn-ghost btn-sm"
                style={{ borderColor: days === d ? "var(--primary-dim)" : "var(--border)", color: days === d ? "var(--primary)" : "var(--muted)", background: days === d ? "var(--primary-faint)" : "transparent", height: 26, padding: "0 10px" }}
                onClick={() => setDays(d)}>
                {d === 365 ? "1Y" : `${d}D`}
              </button>
            ))}
          </div>
        </div>
        <div style={{ width: "100%", height: 260 }}>
          {history.length === 0 ? (
            <div style={{ height: "100%", display: "grid", placeItems: "center", color: "var(--muted)", fontSize: 13 }}>
              No snapshot data yet. Click &ldquo;📸 Snapshot&rdquo; to record today&apos;s net worth.
            </div>
          ) : (
            <ResponsiveContainer>
              <AreaChart data={history} margin={{ top: 8, right: 8, left: 0, bottom: 4 }}>
                <defs>
                  <linearGradient id="assets-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6ee7b7" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="#6ee7b7" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="liab-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f87171" stopOpacity={0.15} />
                    <stop offset="100%" stopColor="#f87171" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#1f2e28" vertical={false} />
                <XAxis dataKey="date" stroke="#6b7280" fontSize={10.5} tickFormatter={(d) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" })} tickLine={false} axisLine={false} minTickGap={40} />
                <YAxis stroke="#6b7280" fontSize={10.5} tickLine={false} axisLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} width={58} />
                <Tooltip
                  contentStyle={{ background: "#0d1411", border: "1px solid #2a3f37", borderRadius: 6, color: "#f9fafb", fontSize: 12 }}
                  formatter={(v, name) => [`$${Number(v).toLocaleString("en-US")}`, name]}
                  labelFormatter={(d) => new Date(d).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Area type="monotone" dataKey="assets" name="Assets" stroke="#6ee7b7" strokeWidth={1.75} fill="url(#assets-grad)" />
                <Area type="monotone" dataKey="liabilities" name="Liabilities" stroke="#f87171" strokeWidth={1.75} fill="url(#liab-grad)" />
                <Area type="monotone" dataKey="net_worth" name="Net Worth" stroke="#a78bfa" strokeWidth={2} fill="none" strokeDasharray="4 2" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Account Breakdown */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        {[{ title: "Assets", items: assets, total: nw?.assets ?? 0 }, { title: "Liabilities", items: liabilities, total: nw?.liabilities ?? 0 }].map(({ title, items, total }) => (
          <div key={title} className="card" style={{ overflow: "hidden" }}>
            <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--heading)" }}>{title}</span>
              <span className="mono" style={{ fontSize: 13, fontWeight: 600, color: title === "Assets" ? "var(--primary)" : "var(--danger)" }}>{fmtMoney(total)}</span>
            </div>
            {items.length === 0 ? (
              <div style={{ padding: "24px 18px", color: "var(--muted)", fontSize: 13, textAlign: "center" }}>No {title.toLowerCase()} accounts</div>
            ) : (
              items.map((acct, i) => (
                <div key={acct.id} style={{ padding: "12px 18px", borderTop: i === 0 ? "none" : "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 8, height: 8, borderRadius: 999, background: ACCOUNT_TYPE_COLORS[acct.type] ?? "var(--muted)", flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: 13, color: "var(--body)", fontWeight: 500 }}>{acct.name}</div>
                      <div style={{ fontSize: 11.5, color: "var(--muted)", textTransform: "capitalize" }}>{acct.type}</div>
                    </div>
                  </div>
                  <span className="mono" style={{ fontSize: 13, color: "var(--heading)" }}>{fmtMoney(Math.abs(acct.balance))}</span>
                </div>
              ))
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
