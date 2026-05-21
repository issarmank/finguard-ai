"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Area,
  AreaChart,
  ResponsiveContainer,
} from "recharts";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import {
  IconArrowRight,
  IconArrowUp,
  IconArrowDown,
  IconAlert,
  IconRefresh,
} from "@/components/icons";
import { fmtMoney, fmtDate } from "@/lib/utils";
import type {
  JournalEntryResponse,
  PaginatedResponse,
  FraudScanResponse,
} from "@/types/api";

type TrendTone = "good" | "bad" | "neutral";

function StatCard({
  label,
  value,
  sub,
  trend,
  trendDir = "up",
  trendTone = "good",
  badge,
}: {
  label: string;
  value: string;
  sub?: string;
  trend?: string;
  trendDir?: "up" | "down";
  trendTone?: TrendTone;
  badge?: { label: string; cls: string };
}) {
  const trendColor =
    trendTone === "good"
      ? "var(--primary)"
      : trendTone === "bad"
      ? "var(--danger)"
      : "var(--muted)";

  return (
    <div
      className="card"
      style={{
        padding: 18,
        display: "flex",
        flexDirection: "column",
        gap: 10,
        minHeight: 116,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span
          style={{
            fontSize: 12,
            color: "var(--muted)",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            fontWeight: 500,
          }}
        >
          {label}
        </span>
        {badge && <span className={`badge ${badge.cls}`}>{badge.label}</span>}
      </div>
      <div
        style={{
          fontSize: 26,
          fontWeight: 600,
          color: "var(--heading)",
          letterSpacing: "-0.02em",
        }}
      >
        {value}
      </div>
      {(trend || sub) && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: 12,
          }}
        >
          {trend && (
            <span
              style={{
                color: trendColor,
                display: "inline-flex",
                alignItems: "center",
                gap: 3,
                fontWeight: 500,
              }}
            >
              {trendDir === "up" ? (
                <IconArrowUp size={12} stroke={trendColor} />
              ) : (
                <IconArrowDown size={12} stroke={trendColor} />
              )}
              {trend}
            </span>
          )}
          {sub && <span style={{ color: "var(--muted)" }}>{sub}</span>}
        </div>
      )}
    </div>
  );
}

// Synthetic cash-flow series until you wire up real data.
// Replace with an API call once your backend has a /reports/cash-flow endpoint.
function buildCashFlowSeries() {
  let v = 2_620_000;
  const out: { date: string; value: number }[] = [];
  const today = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const delta =
      Math.sin(i * 0.7) * 18000 +
      Math.cos(i * 0.31) * 9000 +
      (i % 7 === 0 ? -22000 : 5500);
    v += delta + (Math.random() * 4000 - 2000);
    out.push({ date: d.toISOString().slice(0, 10), value: Math.round(v) });
  }
  return out;
}

export default function DashboardPage() {
  const [entries, setEntries] = useState<JournalEntryResponse[]>([]);
  const [totalEntries, setTotalEntries] = useState(0);
  const [fraud, setFraud] = useState<FraudScanResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [cashFlow] = useState(() => buildCashFlowSeries());

  useEffect(() => {
    Promise.all([
      api.get<PaginatedResponse<JournalEntryResponse>>(
        "/ledger/entries?page=1&size=8"
      ),
      api
        .post<FraudScanResponse>("/ai/fraud-scan", { days_back: 30 })
        .catch(() => null),
    ])
      .then(([ledger, fraudRes]) => {
        setEntries(ledger.items);
        setTotalEntries(ledger.total);
        setFraud(fraudRes);
      })
      .finally(() => setLoading(false));
  }, []);

  const totalPosted = entries.filter((e) => e.status === "posted").length;
  const totalDebits = entries
    .flatMap((e) => e.lines)
    .filter((l) => l.side === "debit")
    .reduce((s, l) => s + parseFloat(l.amount), 0);

  const fraudPct = fraud ? Math.round(fraud.risk_score * 100) : null;
  const fraudBadge = fraud
    ? fraud.risk_level === "low"
      ? { cls: "badge-emerald-solid", label: "LOW" }
      : fraud.risk_level === "medium"
      ? { cls: "badge-amber-solid", label: "MEDIUM" }
      : { cls: "badge-red", label: fraud.risk_level.toUpperCase() }
    : undefined;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <PageHeader
        title="Dashboard"
        subtitle="Financial overview for your workspace"
        actions={
          <>
            <button className="btn btn-ghost">
              <IconRefresh size={13} /> Refresh
            </button>
            <Link
              href="/ledger"
              className="btn btn-primary"
              style={{ textDecoration: "none" }}
            >
              New entry
            </Link>
          </>
        }
      />

      {/* Row 1 — Stat cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 14,
        }}
      >
        <StatCard
          label="Total entries"
          value={loading ? "—" : totalEntries.toString()}
          sub="All time"
        />
        <StatCard
          label="Posted (last 8)"
          value={loading ? "—" : totalPosted.toString()}
          sub="Of recent entries"
        />
        <StatCard
          label="Total debits"
          value={loading ? "—" : fmtMoney(totalDebits)}
          sub="Recent entries"
        />
        <StatCard
          label="Fraud risk"
          value={loading ? "—" : fraudPct != null ? `${fraudPct}%` : "N/A"}
          sub={fraud ? `${fraud.risk_level} · 30d` : "Run fraud scan"}
          badge={fraudBadge}
        />
      </div>

      {/* Row 2 — Cash flow chart + Recent entries */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "3fr 2fr",
          gap: 14,
        }}
      >
        <div className="card" style={{ padding: 18 }}>
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              marginBottom: 12,
            }}
          >
            <div>
              <div
                style={{
                  color: "var(--heading)",
                  fontSize: 14,
                  fontWeight: 600,
                }}
              >
                Cash Flow
              </div>
              <div
                style={{ color: "var(--muted)", fontSize: 12, marginTop: 2 }}
              >
                Last 30 days · Operating account
              </div>
            </div>
            <div style={{ display: "flex", gap: 4 }}>
              {["7D", "30D", "90D", "YTD"].map((p, i) => (
                <button
                  key={p}
                  className="btn btn-ghost btn-sm"
                  style={{
                    borderColor:
                      i === 1 ? "var(--primary-dim)" : "var(--border)",
                    color: i === 1 ? "var(--primary)" : "var(--muted)",
                    background: i === 1 ? "var(--primary-faint)" : "transparent",
                    height: 26,
                    padding: "0 10px",
                  }}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
          <div style={{ width: "100%", height: 220 }}>
            <ResponsiveContainer>
              <AreaChart
                data={cashFlow}
                margin={{ top: 8, right: 8, left: 0, bottom: 4 }}
              >
                <defs>
                  <linearGradient id="cf-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6ee7b7" stopOpacity={0.28} />
                    <stop offset="100%" stopColor="#6ee7b7" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#1f2e28" vertical={false} />
                <XAxis
                  dataKey="date"
                  stroke="#6b7280"
                  fontSize={10.5}
                  tickFormatter={(d) =>
                    new Date(d).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })
                  }
                  tickLine={false}
                  axisLine={false}
                  minTickGap={36}
                />
                <YAxis
                  stroke="#6b7280"
                  fontSize={10.5}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `$${(v / 1e6).toFixed(2)}M`}
                  width={64}
                />
                <Tooltip
                  contentStyle={{
                    background: "#0d1411",
                    border: "1px solid #2a3f37",
                    borderRadius: 6,
                    color: "#f9fafb",
                    fontSize: 12,
                  }}
                  formatter={(v) => [
                    `$${Number(v).toLocaleString("en-US")}`,
                    "Cash",
                  ]}
                  labelFormatter={(d) =>
                    new Date(d).toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })
                  }
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#6ee7b7"
                  strokeWidth={1.75}
                  fill="url(#cf-grad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent entries */}
        <div className="card" style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              padding: "16px 18px",
              borderBottom: "1px solid var(--border)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div>
              <div
                style={{
                  color: "var(--heading)",
                  fontSize: 14,
                  fontWeight: 600,
                }}
              >
                Recent Journal Entries
              </div>
              <div
                style={{ color: "var(--muted)", fontSize: 12, marginTop: 2 }}
              >
                Latest transactions across all accounts
              </div>
            </div>
            <Link
              href="/ledger"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                fontSize: 12.5,
                color: "var(--primary)",
                textDecoration: "none",
              }}
            >
              View all <IconArrowRight size={13} stroke="var(--primary)" />
            </Link>
          </div>

          {loading ? (
            <div style={{ padding: 40, display: "grid", placeItems: "center" }}>
              <span className="spinner" style={{ width: 22, height: 22 }} />
            </div>
          ) : entries.length === 0 ? (
            <div
              style={{
                padding: "40px 20px",
                textAlign: "center",
                color: "var(--muted)",
                fontSize: 13,
              }}
            >
              No journal entries yet.{" "}
              <Link
                href="/ledger"
                style={{ color: "var(--primary)", textDecoration: "none" }}
              >
                Post your first entry →
              </Link>
            </div>
          ) : (
            <div>
              {entries.map((e, i) => {
                const debits = e.lines
                  .filter((l) => l.side === "debit")
                  .reduce((s, l) => s + parseFloat(l.amount), 0);
                return (
                  <div
                    key={e.id}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "64px 1fr auto auto",
                      alignItems: "center",
                      gap: 12,
                      padding: "12px 18px",
                      borderTop: i === 0 ? "none" : "1px solid var(--border)",
                    }}
                  >
                    <div
                      className="mono"
                      style={{ fontSize: 11.5, color: "var(--muted)" }}
                    >
                      {fmtDate(e.entry_date)}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          color: "var(--heading)",
                          fontWeight: 500,
                          fontSize: 13,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {e.description}
                      </div>
                      <div
                        className="mono"
                        style={{
                          color: "var(--muted)",
                          fontSize: 11.5,
                          marginTop: 2,
                        }}
                      >
                        {e.reference ?? "—"} · {e.lines.length} lines
                      </div>
                    </div>
                    <div
                      className="mono"
                      style={{
                        fontSize: 13,
                        color: "var(--heading)",
                        textAlign: "right",
                        textDecoration:
                          e.status === "voided" ? "line-through" : "none",
                        opacity: e.status === "voided" ? 0.55 : 1,
                      }}
                    >
                      {fmtMoney(debits)}
                    </div>
                    <StatusBadge status={e.status} />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Row 3 — Fraud banner (when needed) */}
      {fraud &&
        (fraud.risk_level === "high" || fraud.risk_level === "critical") && (
          <div
            style={{
              padding: "14px 18px",
              borderRadius: 10,
              background: "var(--danger-dim)",
              border: "1px solid #f8717133",
              display: "flex",
              alignItems: "flex-start",
              gap: 12,
            }}
          >
            <IconAlert
              size={16}
              stroke="var(--danger)"
              style={{ marginTop: 1, flexShrink: 0 }}
            />
            <div style={{ flex: 1 }}>
              <div
                style={{
                  fontSize: 13.5,
                  fontWeight: 600,
                  color: "var(--danger)",
                  marginBottom: 3,
                }}
              >
                Fraud Risk Detected — {fraud.risk_level.toUpperCase()}
              </div>
              <div
                style={{
                  fontSize: 12.5,
                  color: "var(--body)",
                  lineHeight: 1.6,
                }}
              >
                {fraud.explanation}
              </div>
              <div
                style={{
                  marginTop: 10,
                  display: "flex",
                  gap: 8,
                  flexWrap: "wrap",
                }}
              >
                {fraud.flags.map((f) => (
                  <span
                    key={f.flag_type}
                    style={{
                      padding: "2px 8px",
                      borderRadius: 999,
                      fontSize: 11,
                      background: "#f8717122",
                      color: "var(--danger)",
                      border: "1px solid #f8717155",
                    }}
                  >
                    {f.flag_type}
                  </span>
                ))}
              </div>
            </div>
            <Link
              href="/fraud-alerts"
              style={{
                fontSize: 12,
                color: "var(--danger)",
                textDecoration: "none",
                fontWeight: 500,
                whiteSpace: "nowrap",
              }}
            >
              View alerts →
            </Link>
          </div>
        )}
    </div>
  );
}
