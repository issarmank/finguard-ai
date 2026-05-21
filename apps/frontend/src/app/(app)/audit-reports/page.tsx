"use client";

import { useState } from "react";
import { api, ApiError } from "@/lib/api";
import { PageHeader } from "@/components/shared/page-header";
import { IconFile, IconDownload, IconRefresh } from "@/components/icons";
import type { AuditReportResponse } from "@/types/api";

export default function AuditReportsPage() {
  const today = new Date().toISOString().split("T")[0];
  const firstOfMonth = today.slice(0, 8) + "01";

  const [dateFrom, setDateFrom] = useState(firstOfMonth);
  const [dateTo, setDateTo] = useState(today);
  const [includeVoided, setIncludeVoided] = useState(false);
  const [report, setReport] = useState<AuditReportResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function generate() {
    setError(null);
    setLoading(true);
    try {
      const res = await api.post<AuditReportResponse>("/ai/audit-report", {
        date_from: dateFrom,
        date_to: dateTo,
        include_voided: includeVoided,
      });
      setReport(res);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Report generation failed");
    } finally {
      setLoading(false);
    }
  }

  function downloadMarkdown() {
    if (!report) return;
    const blob = new Blob([report.report_markdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-report-${report.date_from}-${report.date_to}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, maxWidth: 900 }}>
      <PageHeader
        title="Audit Reports"
        subtitle="Generate AI-written compliance reports for any date range"
      />

      {/* Config Panel */}
      <div className="card" style={{ padding: "22px 24px" }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--heading)", marginBottom: 16 }}>
          Report Configuration
        </div>
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <label style={{ fontSize: 12, color: "var(--muted)", fontWeight: 500 }}>From</label>
            <input
              className="input"
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              style={{ width: 150 }}
            />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <label style={{ fontSize: 12, color: "var(--muted)", fontWeight: 500 }}>To</label>
            <input
              className="input"
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              style={{ width: 150 }}
            />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, paddingBottom: 2 }}>
            <input
              type="checkbox"
              id="include-voided"
              checked={includeVoided}
              onChange={(e) => setIncludeVoided(e.target.checked)}
              style={{ accentColor: "var(--primary)", width: 14, height: 14 }}
            />
            <label htmlFor="include-voided" style={{ fontSize: 12.5, color: "var(--body)", cursor: "pointer" }}>
              Include voided entries
            </label>
          </div>
          <button
            className="btn btn-primary"
            onClick={generate}
            disabled={loading}
            style={{ height: 36, gap: 6 }}
          >
            {loading ? <span className="spinner" /> : <><IconRefresh size={13} /> Generate report</>}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div style={{
          padding: "12px 16px", borderRadius: 8,
          background: "var(--danger-dim)", border: "1px solid #f8717155",
          color: "var(--danger)", fontSize: 13,
        }}>
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && !report && (
        <div style={{ padding: 64, display: "grid", placeItems: "center" }}>
          <div style={{ textAlign: "center" }}>
            <span className="spinner" style={{ width: 28, height: 28, margin: "0 auto 16px" }} />
            <div style={{ fontSize: 13, color: "var(--muted)" }}>Generating audit report…</div>
            <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 6 }}>This may take 15–30 seconds</div>
          </div>
        </div>
      )}

      {/* Report */}
      {report && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Report Header */}
          <div className="card" style={{ padding: "18px 22px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 9,
                  background: "var(--primary-faint)", border: "1px solid var(--primary-dim)",
                  display: "grid", placeItems: "center",
                }}>
                  <IconFile size={16} stroke="var(--primary)" />
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "var(--heading)" }}>
                    Audit Report
                  </div>
                  <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
                    {report.date_from} → {report.date_to} · Generated {new Date(report.generated_at).toLocaleString()}
                  </div>
                </div>
              </div>
              <button
                className="btn btn-ghost btn-sm"
                onClick={downloadMarkdown}
                style={{ gap: 6 }}
              >
                <IconDownload size={13} /> Download .md
              </button>
            </div>

            {/* Summary Stats */}
            {Object.keys(report.summary).length > 0 && (
              <div style={{ marginTop: 16, display: "flex", gap: 20, flexWrap: "wrap" }}>
                {Object.entries(report.summary).map(([k, v]) => (
                  <div key={k}>
                    <div style={{ fontSize: 11, color: "var(--muted)", textTransform: "capitalize", marginBottom: 3 }}>
                      {k.replace(/_/g, " ")}
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "var(--heading)", fontFamily: "var(--font-mono)" }}>
                      {String(v)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Markdown Report Body */}
          <div className="card" style={{ padding: "28px 32px" }}>
            <div className="md" dangerouslySetInnerHTML={{ __html: markdownToHtml(report.report_markdown) }} />
          </div>
        </div>
      )}

      {/* Empty State */}
      {!report && !error && !loading && (
        <div style={{
          padding: "56px 24px", textAlign: "center",
          border: "1px dashed var(--border)", borderRadius: 12,
        }}>
          <IconFile size={36} stroke="var(--border-strong)" style={{ margin: "0 auto 14px" }} />
          <div style={{ fontSize: 14, color: "var(--body)", marginBottom: 6 }}>No report generated yet</div>
          <div style={{ fontSize: 12, color: "var(--muted)" }}>
            Select a date range above and click &quot;Generate report&quot; to create an AI audit report.
          </div>
        </div>
      )}
    </div>
  );
}

// Minimal markdown-to-HTML converter for report display
function markdownToHtml(md: string): string {
  return md
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^# (.+)$/gm, "<h1>$1</h1>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`(.+?)`/g, "<code>$1</code>")
    .replace(/^---$/gm, "<hr>")
    .replace(/^- (.+)$/gm, "<li>$1</li>")
    .replace(/(<li>.*<\/li>\n?)+/g, (m) => `<ul>${m}</ul>`)
    .replace(/\n\n/g, "<br><br>")
    .replace(/\n/g, "<br>");
}
