"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  XAxis, YAxis, CartesianGrid, Tooltip,
  Area, AreaChart, ResponsiveContainer,
} from "recharts";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/shared/page-header";
import {
  IconArrowRight, IconArrowUp, IconArrowDown,
  IconAlert, IconRefresh, IconSparkles,
} from "@/components/icons";
import { fmtMoney, fmtDate } from "@/lib/utils";
import type {
  NetWorthCurrent,
  NetWorthHistory,
  TransactionOut,
  PaginatedResponse,
  InsightsResponse,
  BudgetOut,
} from "@/types/api";

function StatCard({ label, value, sub, trend, trendDir = "up", trendTone = "good", badge }: {
  label: string; value: string; sub?: string;
  trend?: string; trendDir?: "up" | "down"; trendTone?: "good" | "bad" | "neutral";
  badge?: { label: string; cls: string };
}) {
  const trendColor = trendTone === "good" ? "var(--primary)" : trendTone === "bad" ? "var(--danger)" : "var(--muted)";
  return (
    <div className="card" style={{ padding: 18, display: "flex", flexDirection: "column", gap: 10, minHeight: 116 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 12, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 500 }}>{label}</span>
        {badge && <span className={`badge ${badge.cls}`}>{badge.label}</span>}
      </div>
      <div style={{ fontSize: 26, fontWeight: 600, color: "var(--heading)", letterSpacing: "-0.02em" }}>{value}</div>
      {(trend || sub) && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
          {trend && (
            <span style={{ color: trendColor, display: "inline-flex", alignItems: "center", gap: 3, fontWeight: 500 }}>
              {trendDir === "up" ? <IconArrowUp size={12} stroke={trendColor} /> : <IconArrowDown size={12} stroke={trendColor} />}
              {trend}
            </span>
          )}
          {sub && <span style={{ color: "var(--muted)" }}>{sub}</span>}
        </div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const [nw, setNw] = useState<NetWorthCurrent | null>(null);
  const [history, setHistory] = useState<NetWorthHistory[]>([]);
  const [txs, setTxs] = useState<TransactionOut[]>([]);
  const [budgets, setBudgets] = useState<BudgetOut[]>([]);
  const [insights, setInsights] = useState<InsightsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    Promise.all([
      api.get<NetWorthCurrent>("/net-worth/").catch(() => null),
      api.get<NetWorthHistory[]>("/net-worth/history?days=30").catch(() => []),
      api.get<PaginatedResponse<TransactionOut>>("/transactions/?page=1&size=8").catch(() => null),
      api.get<BudgetOut[]>("/budgets/").catch(() => []),
      api.post<InsightsResponse>("/ai/insights", { days_back: 30 }).catch(() => null),
    ]).then(([nwData, hist, txData, budgetsData, insightsData]) => {
      setNw(nwData);
      setHistory(hist as NetWorthHistory[]);
      setTxs(txData?.items ?? []);
      setBudgets(budgetsData as BudgetOut[]);
      setInsights(insightsData);
    }).finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  const insightBadge = insights
    ? insights.risk_level === "low"
      ? { cls: "badge-emerald-solid", label: "LOW" }
      : insights.risk_level === "medium"
      ? { cls: "badge-amber-solid", label: "MED" }
      : { cls: "badge-red", label: "HIGH" }
    : undefined;

  const topBudgets = budgets.filter((b) => b.pct > 0).slice(0, 4);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <PageHeader
        title="Dashboard"
        subtitle="Your personal finance overview"
        actions={
          <>
            <button className="btn btn-ghost" onClick={load}><IconRefresh size={13} /> Refresh</button>
            <Link href="/transactions" className="btn btn-primary" style={{ textDecoration: "none" }}>Transactions</Link>
          </>
        }
      />

      {/* Stat cards */}
      <div className="grid-stat-cards">
        <StatCard
          label="Net Worth"
          value={loading ? "—" : fmtMoney(nw?.net_worth ?? 0)}
          sub="Assets - Liabilities"
        />
        <StatCard
          label="Total Assets"
          value={loading ? "—" : fmtMoney(nw?.assets ?? 0)}
          trendTone="good"
        />
        <StatCard
          label="Total Liabilities"
          value={loading ? "—" : fmtMoney(nw?.liabilities ?? 0)}
          trendTone="bad"
        />
        <StatCard
          label="AI Risk Score"
          value={loading ? "—" : insights ? `${Math.round(insights.risk_score * 100)}%` : "N/A"}
          sub={insights ? `${insights.risk_level.charAt(0).toUpperCase() + insights.risk_level.slice(1)} Risk · 30d` : "Run insights"}
          badge={insightBadge}
        />
      </div>

      {/* Chart + Recent Transactions */}
      <div className="grid-chart-row">
        <div className="card" style={{ padding: 18 }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
            <div>
              <div style={{ color: "var(--heading)", fontSize: 14, fontWeight: 600 }}>Net Worth Trend</div>
              <div style={{ color: "var(--muted)", fontSize: 12, marginTop: 2 }}>Last 30 days</div>
            </div>
          </div>
          <div style={{ width: "100%", height: 220 }}>
            <ResponsiveContainer>
              <AreaChart data={history} margin={{ top: 8, right: 8, left: 0, bottom: 4 }}>
                <defs>
                  <linearGradient id="nw-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6ee7b7" stopOpacity={0.28} />
                    <stop offset="100%" stopColor="#6ee7b7" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#1f2e28" vertical={false} />
                <XAxis dataKey="date" stroke="#6b7280" fontSize={10.5} tickFormatter={(d) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" })} tickLine={false} axisLine={false} minTickGap={36} />
                <YAxis stroke="#6b7280" fontSize={10.5} tickLine={false} axisLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} width={56} />
                <Tooltip
                  contentStyle={{ background: "#0d1411", border: "1px solid #2a3f37", borderRadius: 6, color: "#f9fafb", fontSize: 12 }}
                  formatter={(v) => [`$${Number(v).toLocaleString("en-US")}`, "Net Worth"]}
                  labelFormatter={(d) => new Date(d).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                />
                <Area type="monotone" dataKey="net_worth" stroke="#6ee7b7" strokeWidth={1.75} fill="url(#nw-grad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent transactions */}
        <div className="card" style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "16px 18px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ color: "var(--heading)", fontSize: 14, fontWeight: 600 }}>Recent Transactions</div>
              <div style={{ color: "var(--muted)", fontSize: 12, marginTop: 2 }}>Latest activity</div>
            </div>
            <Link href="/transactions" style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12.5, color: "var(--primary)", textDecoration: "none" }}>
              View all <IconArrowRight size={13} stroke="var(--primary)" />
            </Link>
          </div>
          {loading ? (
            <div style={{ padding: 40, display: "grid", placeItems: "center" }}>
              <span className="spinner" style={{ width: 22, height: 22 }} />
            </div>
          ) : txs.length === 0 ? (
            <div style={{ padding: "40px 20px", textAlign: "center", color: "var(--muted)", fontSize: 13 }}>
              No transactions yet.{" "}
              <Link href="/settings" style={{ color: "var(--primary)", textDecoration: "none" }}>Connect a bank →</Link>
            </div>
          ) : (
            <div>
              {txs.map((tx, i) => (
                <div key={tx.id} style={{ display: "grid", gridTemplateColumns: "1fr auto", alignItems: "center", gap: 12, padding: "11px 18px", borderTop: i === 0 ? "none" : "1px solid var(--border)" }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ color: "var(--heading)", fontWeight: 500, fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {tx.merchant ?? tx.description}
                    </div>
                    <div className="mono" style={{ color: "var(--muted)", fontSize: 11.5, marginTop: 2 }}>
                      {fmtDate(tx.date)}{tx.pending ? " · pending" : ""}
                    </div>
                  </div>
                  <div className="mono" style={{ fontSize: 13, fontWeight: 500, color: tx.amount < 0 ? "var(--primary)" : "var(--body)", textAlign: "right" }}>
                    {tx.amount < 0 ? "+" : ""}{fmtMoney(Math.abs(tx.amount))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Budget progress */}
      {topBudgets.length > 0 && (
        <div className="card" style={{ padding: 18 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <div style={{ color: "var(--heading)", fontSize: 14, fontWeight: 600 }}>Budget Progress</div>
            <Link href="/budgets" style={{ fontSize: 12.5, color: "var(--primary)", textDecoration: "none" }}>Manage budgets →</Link>
          </div>
          <div className="grid-two-col">
            {topBudgets.map((b) => (
              <div key={b.budget_id}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5, fontSize: 12.5 }}>
                  <span style={{ color: "var(--body)" }}>{b.category_icon} {b.category_name}</span>
                  <span style={{ color: b.pct >= 100 ? "var(--danger)" : "var(--muted)" }}>
                    {fmtMoney(b.spent)} / {fmtMoney(b.budget_amount)}
                  </span>
                </div>
                <div style={{ height: 6, background: "var(--border)", borderRadius: 999, overflow: "hidden" }}>
                  <div style={{ width: `${Math.min(100, b.pct)}%`, height: "100%", borderRadius: 999, background: b.pct >= 100 ? "var(--danger)" : b.pct >= 80 ? "#f59e0b" : "var(--primary)", transition: "width 0.3s" }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI Insight banner */}
      {insights && insights.risk_level !== "low" && (
        <div style={{ padding: "14px 18px", borderRadius: 10, background: "var(--danger-dim)", border: "1px solid #f8717133", display: "flex", alignItems: "flex-start", gap: 12 }}>
          <IconAlert size={16} stroke="var(--danger)" style={{ marginTop: 1, flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--danger)", marginBottom: 3 }}>
              AI Spending Alert — {insights.risk_level.toUpperCase()}
            </div>
            <div style={{ fontSize: 12.5, color: "var(--body)", lineHeight: 1.6 }}>{insights.summary}</div>
            <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
              {insights.flags.map((f) => (
                <span key={f.flag_type} style={{ padding: "2px 8px", borderRadius: 999, fontSize: 11, background: "#f8717122", color: "var(--danger)", border: "1px solid #f8717155" }}>
                  {f.flag_type}
                </span>
              ))}
            </div>
          </div>
          <Link href="/ai-query" style={{ fontSize: 12, color: "var(--danger)", textDecoration: "none", fontWeight: 500, whiteSpace: "nowrap" }}>
            <IconSparkles size={13} /> AI Coach →
          </Link>
        </div>
      )}
    </div>
  );
}
