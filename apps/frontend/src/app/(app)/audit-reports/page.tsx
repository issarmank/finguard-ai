"use client";

import { useState } from "react";
import { api, ApiError } from "@/lib/api";
import { PageHeader } from "@/components/shared/page-header";
import { IconFile, IconDownload, IconRefresh } from "@/components/icons";
import type { MonthlyReportResponse } from "@/types/api";

export default function ReportsPage() {
  const today = new Date();
  const defaultMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-01`;

  const [month, setMonth] = useState(defaultMonth);
  const [report, setReport] = useState<MonthlyReportResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function generate() {
    setError(null);
    setReport(null);
    setLoading(true);
    try {
      const res = await api.post<MonthlyReportResponse>("/ai/report", { month });
      setReport(res);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to generate report");
    } finally {
      setLoading(false);
    }
  }

  function downloadReport() {
    if (!report) return;
    const blob = new Blob([report.report_markdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `finguard-report-${report.month}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 900 }}>
      <PageHeader
        title="Monthly Reports"
        subtitle="AI-generated analysis of your spending, savings, and financial health"
        actions={
          report && (
            <button className="btn btn-ghost" onClick={downloadReport}>
              <IconDownload size={13} /> Download .md
            </button>
          )
        }
      />

      {/* Config */}
      <div className="card" style={{ padding: "18px 20px" }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--heading)", marginBottom: 14 }}>Generate Report</div>
        <div style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={{ fontSize: 11, color: "var(--muted)" }}>Month</label>
            <input
              className="input"
              type="month"
              value={month.slice(0, 7)}
              onChange={(e) => setMonth(`${e.target.value}-01`)}
              style={{ width: 160 }}
            />
          </div>
          <button className="btn btn-primary" onClick={generate} disabled={loading}>
            {loading ? <><span className="spinner" /> Generating…</> : <><IconFile size={13} /> Generate Report</>}
          </button>
        </div>
        {error && (
          <div style={{ marginTop: 12, padding: "8px 12px", borderRadius: 6, background: "var(--danger-dim)", color: "var(--danger)", fontSize: 12.5 }}>
            {error}
          </div>
        )}
      </div>

      {/* Loading state */}
      {loading && (
        <div className="card" style={{ padding: "48px 24px", display: "grid", placeItems: "center", textAlign: "center" }}>
          <div className="spinner" style={{ width: 28, height: 28, margin: "0 auto 14px" }} />
          <div style={{ color: "var(--primary)", fontWeight: 500, fontSize: 14 }}>Generating your report…</div>
          <div style={{ color: "var(--muted)", fontSize: 12, marginTop: 4 }}>
            Analysing transactions, budgets, goals and net worth
          </div>
        </div>
      )}

      {/* Report content */}
      {report && !loading && (
        <div className="card fade-in" style={{ padding: 0, overflow: "hidden" }}>
          {/* Header */}
          <div style={{ padding: "16px 22px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "var(--heading)" }}>
                📊 {new Date(report.month).toLocaleDateString("en-US", { month: "long", year: "numeric" })} Report
              </div>
              <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
                Generated {new Date(report.generated_at).toLocaleString()}
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn btn-ghost btn-sm" onClick={generate}><IconRefresh size={12} /> Regenerate</button>
              <button className="btn btn-ghost btn-sm" onClick={downloadReport}><IconDownload size={12} /> Download</button>
            </div>
          </div>

          {/* Markdown rendered as pre-wrap */}
          <div style={{ padding: "20px 24px" }}>
            <pre style={{
              fontFamily: "var(--font-sans, sans-serif)",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              color: "var(--body)",
              fontSize: 13.5,
              lineHeight: 1.7,
              margin: 0,
            }}>
              {report.report_markdown}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
