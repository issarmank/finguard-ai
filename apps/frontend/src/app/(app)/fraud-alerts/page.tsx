"use client";

import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { PageHeader } from "@/components/shared/page-header";
import { RiskBadge } from "@/components/shared/status-badge";
import { IconShield, IconRefresh, IconAlert } from "@/components/icons";
import type { FraudScanResponse } from "@/types/api";

const RISK_COLORS = {
  low: "var(--primary)",
  medium: "var(--warning)",
  high: "var(--danger)",
  critical: "var(--danger)",
};

function RiskMeter({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  const color = score >= 0.7 ? "var(--danger)" : score >= 0.4 ? "var(--warning)" : "var(--primary)";
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
        <span style={{ fontSize: 12, color: "var(--muted)" }}>Risk Score</span>
        <span style={{ fontSize: 14, fontWeight: 700, color, fontFamily: "var(--font-mono)" }}>
          {pct}%
        </span>
      </div>
      <div style={{ height: 6, background: "var(--border)", borderRadius: 999, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 999, transition: "width 0.5s" }} />
      </div>
    </div>
  );
}

export default function FraudAlertsPage() {
  const [result, setResult] = useState<FraudScanResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [daysBack, setDaysBack] = useState(30);

  async function runScan() {
    setError(null);
    setLoading(true);
    try {
      const res = await api.post<FraudScanResponse>("/ai/fraud-scan", { days_back: daysBack });
      setResult(res);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Scan failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    runScan();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, maxWidth: 860 }}>
      <PageHeader
        title="Fraud Alerts"
        subtitle="AI-powered anomaly detection across your transaction history"
        actions={
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <select
              className="select"
              value={daysBack}
              onChange={(e) => setDaysBack(Number(e.target.value))}
              style={{ height: 32, fontSize: 12.5 }}
            >
              <option value={7}>Last 7 days</option>
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option>
              <option value={365}>Last 365 days</option>
            </select>
            <button
              className="btn btn-primary btn-sm"
              onClick={runScan}
              disabled={loading}
              style={{ gap: 6 }}
            >
              {loading ? <span className="spinner" /> : <><IconRefresh size={13} /> Run scan</>}
            </button>
          </div>
        }
      />

      {error && (
        <div style={{
          padding: "12px 16px", borderRadius: 8,
          background: "var(--danger-dim)", border: "1px solid #f8717155",
          color: "var(--danger)", fontSize: 13,
        }}>
          {error}
        </div>
      )}

      {loading && !result && (
        <div style={{ padding: 64, display: "grid", placeItems: "center" }}>
          <div style={{ textAlign: "center" }}>
            <span className="spinner" style={{ width: 28, height: 28, margin: "0 auto 16px" }} />
            <div style={{ fontSize: 13, color: "var(--muted)" }}>Analysing {daysBack} days of transactions…</div>
          </div>
        </div>
      )}

      {result && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Risk Summary Card */}
          <div className="card" style={{ padding: "24px 28px" }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{
                  width: 42, height: 42, borderRadius: 10,
                  background: `${RISK_COLORS[result.risk_level]}18`,
                  display: "grid", placeItems: "center",
                }}>
                  <IconShield size={20} stroke={RISK_COLORS[result.risk_level]} />
                </div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: "var(--heading)", marginBottom: 4 }}>
                    Risk Assessment
                  </div>
                  <RiskBadge level={result.risk_level} pulse={result.risk_level === "critical"} />
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 4 }}>Entries analysed</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: "var(--heading)", fontFamily: "var(--font-mono)" }}>
                  {result.entries_analyzed.toLocaleString()}
                </div>
              </div>
            </div>

            <RiskMeter score={result.risk_score} />
          </div>

          {/* Flags */}
          {result.flags.length > 0 && (
            <div className="card" style={{ overflow: "hidden" }}>
              <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border)" }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: "var(--heading)" }}>
                  Detected Anomalies ({result.flags.length})
                </span>
              </div>
              <div style={{ display: "flex", flexDirection: "column" }}>
                {result.flags.map((flag, i) => (
                  <div
                    key={i}
                    style={{
                      padding: "14px 20px",
                      borderBottom: i < result.flags.length - 1 ? "1px solid var(--border)" : "none",
                      display: "flex", gap: 14, alignItems: "flex-start",
                    }}
                  >
                    <div style={{
                      width: 30, height: 30, borderRadius: 7, flexShrink: 0,
                      background: "var(--danger-dim)", display: "grid", placeItems: "center",
                    }}>
                      <IconAlert size={14} stroke="var(--danger)" />
                    </div>
                    <div>
                      <div style={{
                        fontSize: 12.5, fontWeight: 600, color: "var(--body)", marginBottom: 3,
                        fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: "0.05em",
                      }}>
                        {flag.flag_type.replace(/_/g, " ")}
                      </div>
                      <div style={{ fontSize: 12.5, color: "var(--muted)", lineHeight: 1.6 }}>
                        {flag.description}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* AI Explanation */}
          <div className="card" style={{ padding: "20px 22px" }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>
              AI Analysis
            </div>
            <p style={{ fontSize: 13.5, color: "var(--body)", lineHeight: 1.7, margin: 0 }}>
              {result.explanation}
            </p>
          </div>

          {/* Recommended Action */}
          <div className="card" style={{ padding: "20px 22px", background: "linear-gradient(180deg, #111815, #0d1411)" }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--primary)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>
              Recommended Action
            </div>
            <p style={{ fontSize: 13.5, color: "var(--body)", lineHeight: 1.7, margin: 0 }}>
              {result.recommended_action}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
