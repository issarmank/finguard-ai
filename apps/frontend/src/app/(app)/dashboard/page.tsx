"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { IconActivity, IconArrowRight, IconLayers, IconRoundDollar, IconShield, IconAlert } from "@/components/icons";
import { fmtMoney, fmtDate } from "@/lib/utils";
import type { JournalEntryResponse, PaginatedResponse, FraudScanResponse } from "@/types/api";

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  accent = "var(--primary)",
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.FC<{ size?: number; stroke?: string }>;
  accent?: string;
}) {
  return (
    <div className="card" style={{ padding: "20px 22px", display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 12.5, color: "var(--muted)", fontWeight: 500 }}>{label}</span>
        <div style={{
          width: 32, height: 32, borderRadius: 8,
          background: `${accent}18`,
          display: "grid", placeItems: "center",
        }}>
          <Icon size={15} stroke={accent} />
        </div>
      </div>
      <div>
        <div style={{ fontSize: 26, fontWeight: 700, color: "var(--heading)", letterSpacing: "-0.03em", lineHeight: 1 }}>
          {value}
        </div>
        {sub && <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>{sub}</div>}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [entries, setEntries] = useState<JournalEntryResponse[]>([]);
  const [totalEntries, setTotalEntries] = useState(0);
  const [fraud, setFraud] = useState<FraudScanResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get<PaginatedResponse<JournalEntryResponse>>("/ledger/entries?page=1&size=8"),
      api.post<FraudScanResponse>("/ai/fraud-scan", { days_back: 30 }).catch(() => null),
    ]).then(([ledger, fraudRes]) => {
      setEntries(ledger.items);
      setTotalEntries(ledger.total);
      setFraud(fraudRes);
    }).finally(() => setLoading(false));
  }, []);

  const totalPosted = entries.filter((e) => e.status === "posted").length;
  const totalDebits = entries
    .flatMap((e) => e.lines)
    .filter((l) => l.side === "debit")
    .reduce((s, l) => s + parseFloat(l.amount), 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <PageHeader
        title="Dashboard"
        subtitle="Financial overview for your workspace"
        actions={
          <Link href="/ledger" className="btn btn-primary btn-sm" style={{ textDecoration: "none" }}>
            New entry
          </Link>
        }
      />

      {/* Stat Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
        <StatCard
          label="Total entries"
          value={loading ? "—" : totalEntries.toString()}
          sub="All time"
          icon={IconLayers}
        />
        <StatCard
          label="Posted (last 8)"
          value={loading ? "—" : totalPosted.toString()}
          sub="Of recent entries"
          icon={IconActivity}
        />
        <StatCard
          label="Total debits"
          value={loading ? "—" : fmtMoney(totalDebits)}
          sub="Recent entries"
          icon={IconRoundDollar}
        />
        <StatCard
          label="Fraud risk"
          value={loading ? "—" : (fraud ? `${Math.round(fraud.risk_score * 100)}%` : "N/A")}
          sub={fraud ? `${fraud.risk_level} risk · 30d` : "Run fraud scan"}
          icon={IconShield}
          accent={fraud?.risk_level === "high" || fraud?.risk_level === "critical" ? "var(--danger)" : "var(--primary)"}
        />
      </div>

      {/* Fraud Alert Banner */}
      {fraud && (fraud.risk_level === "high" || fraud.risk_level === "critical") && (
        <div style={{
          padding: "14px 18px", borderRadius: 10,
          background: "var(--danger-dim)", border: "1px solid #f8717133",
          display: "flex", alignItems: "flex-start", gap: 12,
        }}>
          <IconAlert size={16} stroke="var(--danger)" style={{ marginTop: 1, flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--danger)", marginBottom: 3 }}>
              Fraud Risk Detected — {fraud.risk_level.toUpperCase()}
            </div>
            <div style={{ fontSize: 12.5, color: "var(--body)", lineHeight: 1.6 }}>{fraud.explanation}</div>
            <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
              {fraud.flags.map((f) => (
                <span key={f.flag_type} style={{
                  padding: "2px 8px", borderRadius: 999, fontSize: 11,
                  background: "#f8717122", color: "var(--danger)",
                  border: "1px solid #f8717155",
                }}>
                  {f.flag_type}
                </span>
              ))}
            </div>
          </div>
          <Link href="/fraud-alerts" style={{ fontSize: 12, color: "var(--danger)", textDecoration: "none", fontWeight: 500, whiteSpace: "nowrap" }}>
            View alerts →
          </Link>
        </div>
      )}

      {/* Recent Entries */}
      <div className="card">
        <div style={{
          padding: "16px 20px", borderBottom: "1px solid var(--border)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--heading)" }}>Recent Journal Entries</div>
            <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>Latest transactions across all accounts</div>
          </div>
          <Link href="/ledger" style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12.5, color: "var(--primary)", textDecoration: "none" }}>
            View all <IconArrowRight size={13} stroke="var(--primary)" />
          </Link>
        </div>

        {loading ? (
          <div style={{ padding: 40, display: "grid", placeItems: "center" }}>
            <span className="spinner" style={{ width: 22, height: 22 }} />
          </div>
        ) : entries.length === 0 ? (
          <div style={{ padding: "40px 20px", textAlign: "center", color: "var(--muted)", fontSize: 13 }}>
            No journal entries yet.{" "}
            <Link href="/ledger" style={{ color: "var(--primary)", textDecoration: "none" }}>Post your first entry →</Link>
          </div>
        ) : (
          <table className="data" style={{ width: "100%" }}>
            <thead>
              <tr>
                <th>Date</th>
                <th>Description</th>
                <th>Reference</th>
                <th>Lines</th>
                <th style={{ textAlign: "right" }}>Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => {
                const debitTotal = entry.lines
                  .filter((l) => l.side === "debit")
                  .reduce((s, l) => s + parseFloat(l.amount), 0);
                return (
                  <tr key={entry.id}>
                    <td style={{ color: "var(--muted)", fontFamily: "var(--font-mono)", fontSize: 12 }}>
                      {fmtDate(entry.entry_date)}
                    </td>
                    <td style={{ color: "var(--body)", maxWidth: 260 }}>
                      <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {entry.description}
                      </div>
                    </td>
                    <td style={{ color: "var(--muted)", fontFamily: "var(--font-mono)", fontSize: 12 }}>
                      {entry.reference ?? "—"}
                    </td>
                    <td style={{ color: "var(--muted)", textAlign: "center" }}>{entry.lines.length}</td>
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
      </div>

      {/* Quick Links */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
        {[
          { href: "/ai-query", icon: IconActivity, title: "AI Query", desc: "Ask questions about your ledger in natural language" },
          { href: "/fraud-alerts", icon: IconShield, title: "Fraud Alerts", desc: "Review AI-detected anomalies and risk signals" },
          { href: "/audit-reports", icon: IconRoundDollar, title: "Audit Reports", desc: "Generate compliance-ready PDF audit reports" },
        ].map((item) => (
          <Link key={item.href} href={item.href} style={{ textDecoration: "none" }}>
            <div className="card" style={{
              padding: "18px 20px", cursor: "pointer",
              display: "flex", flexDirection: "column", gap: 10,
              transition: "border-color 0.15s",
            }}>
              <div style={{
                width: 34, height: 34, borderRadius: 9,
                background: "var(--primary-faint)", border: "1px solid var(--primary-dim)",
                display: "grid", placeItems: "center",
              }}>
                <item.icon size={16} stroke="var(--primary)" />
              </div>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--heading)", marginBottom: 3 }}>{item.title}</div>
                <div style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.5 }}>{item.desc}</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "var(--primary)" }}>
                Open <IconArrowRight size={12} stroke="var(--primary)" />
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
