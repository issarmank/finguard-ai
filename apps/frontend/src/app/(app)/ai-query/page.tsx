"use client";

import { useState } from "react";
import { api, ApiError } from "@/lib/api";
import { PageHeader } from "@/components/shared/page-header";
import { IconSparkles, IconCopy, IconArrowRight } from "@/components/icons";
import type { TextToSQLResponse } from "@/types/api";

const EXAMPLE_QUERIES = [
  "Show me all expense entries from this month",
  "What are the top 5 accounts by total debit amount?",
  "List all voided journal entries",
  "What is the total revenue recorded this year?",
  "Show entries with amounts over $10,000",
];

export default function AIQueryPage() {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<TextToSQLResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sqlExpanded, setSqlExpanded] = useState(true);
  const [copied, setCopied] = useState(false);

  async function handleQuery(q: string) {
    const text = q.trim();
    if (!text) return;
    setQuery(text);
    setError(null);
    setResult(null);
    setLoading(true);
    try {
      const res = await api.post<TextToSQLResponse>("/ai/query", { query: text });
      setResult(res);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Query failed");
    } finally {
      setLoading(false);
    }
  }

  function copySQL() {
    if (!result) return;
    navigator.clipboard.writeText(result.sql);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const columns = result?.results.length ? Object.keys(result.results[0]) : [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, maxWidth: 960 }}>
      <PageHeader
        title="AI Query"
        subtitle="Ask questions about your ledger data in natural language"
      />

      {/* Query Input */}
      <div className="card" style={{ padding: "20px 22px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 7,
            background: "var(--primary-faint)", border: "1px solid var(--primary-dim)",
            display: "grid", placeItems: "center",
          }}>
            <IconSparkles size={14} stroke="var(--primary)" />
          </div>
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--heading)" }}>Natural Language Query</span>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <input
            className="input"
            style={{ flex: 1, fontSize: 14, height: 40 }}
            placeholder="e.g. Show me all expense entries from this month…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !loading && handleQuery(query)}
          />
          <button
            className="btn btn-primary"
            disabled={loading || !query.trim()}
            onClick={() => handleQuery(query)}
            style={{ height: 40, gap: 6, paddingLeft: 16, paddingRight: 16 }}
          >
            {loading ? <span className="spinner" /> : <><IconArrowRight size={14} /> Run</>}
          </button>
        </div>

        {/* Example queries */}
        <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 6 }}>
          <span style={{ fontSize: 11, color: "var(--muted)", marginRight: 4, paddingTop: 2 }}>Try:</span>
          {EXAMPLE_QUERIES.map((ex) => (
            <button
              key={ex}
              className="btn btn-ghost btn-sm"
              onClick={() => handleQuery(ex)}
              style={{ fontSize: 11.5, height: 24, padding: "0 10px", color: "var(--muted)" }}
            >
              {ex}
            </button>
          ))}
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

      {/* Results */}
      {result && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Generated SQL */}
          <div className="card" style={{ overflow: "hidden" }}>
            <div
              style={{
                padding: "12px 16px", display: "flex", alignItems: "center",
                justifyContent: "space-between", cursor: "pointer",
                borderBottom: sqlExpanded ? "1px solid var(--border)" : "none",
              }}
              onClick={() => setSqlExpanded((p) => !p)}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 11.5, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  Generated SQL
                </span>
                <span className="badge badge-emerald" style={{ fontSize: 10 }}>
                  {result.row_count} row{result.row_count !== 1 ? "s" : ""}
                </span>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={(e) => { e.stopPropagation(); copySQL(); }}
                  style={{ fontSize: 11.5, height: 26, gap: 5 }}
                >
                  <IconCopy size={12} /> {copied ? "Copied!" : "Copy"}
                </button>
                <span style={{ fontSize: 11, color: "var(--muted)", paddingTop: 2 }}>
                  {sqlExpanded ? "▲" : "▼"}
                </span>
              </div>
            </div>
            {sqlExpanded && (
              <pre className="sql-block" style={{ margin: 0, borderRadius: 0, borderTop: "none" }}>
                {result.sql}
              </pre>
            )}
          </div>

          {/* Results Table */}
          <div className="card" style={{ overflow: "hidden" }}>
            <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)" }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--heading)" }}>Results</span>
              <span style={{ fontSize: 12, color: "var(--muted)", marginLeft: 8 }}>
                {result.row_count} row{result.row_count !== 1 ? "s" : ""} returned
              </span>
            </div>
            {result.results.length === 0 ? (
              <div style={{ padding: "32px 20px", textAlign: "center", color: "var(--muted)", fontSize: 13 }}>
                No results found for your query.
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table className="data" style={{ width: "100%", minWidth: 500 }}>
                  <thead>
                    <tr>
                      {columns.map((col) => (
                        <th key={col} style={{ textTransform: "none" }}>{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {result.results.map((row, i) => (
                      <tr key={i}>
                        {columns.map((col) => (
                          <td key={col} style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>
                            {row[col] == null ? <span style={{ color: "var(--muted)" }}>NULL</span> : String(row[col])}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!result && !error && !loading && (
        <div style={{
          padding: "48px 24px", textAlign: "center", color: "var(--muted)",
          border: "1px dashed var(--border)", borderRadius: 12,
        }}>
          <IconSparkles size={32} stroke="var(--border-strong)" style={{ margin: "0 auto 12px" }} />
          <div style={{ fontSize: 14, color: "var(--body)", marginBottom: 6 }}>Ask anything about your financial data</div>
          <div style={{ fontSize: 12 }}>
            The AI translates your question into SQL, runs it safely, and shows the results.
          </div>
        </div>
      )}
    </div>
  );
}
