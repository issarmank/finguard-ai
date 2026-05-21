"use client";

import { useState } from "react";
import { api, ApiError } from "@/lib/api";
import {
  IconSparkles,
  IconCopy,
  IconArrowRight,
  IconChevronLeft,
  IconChevronRight,
  IconShield,
  IconLayers,
  IconClock,
  IconDownload,
  IconCheck,
} from "@/components/icons";
import type { TextToSQLResponse } from "@/types/api";

const EXAMPLE_QUERIES = [
  "Total revenue last 30 days",
  "Accounts with highest debit volume",
  "All voided entries",
  "Top 5 expense accounts this month",
  "Cash balance trend by week",
];

const TIPS = [
  {
    Icon: IconShield,
    title: "Read-only by design",
    body: "Generated queries are sandboxed to SELECT statements scoped to your tenant.",
  },
  {
    Icon: IconLayers,
    title: "Schema-aware",
    body: "Knows your chart of accounts, ledger lines, and journal entry status field.",
  },
  {
    Icon: IconClock,
    title: "Streamed results",
    body: "Typical query returns in ~1.2s. Long-running scans surface progress.",
  },
];

export default function AIQueryPage() {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<TextToSQLResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sqlOpen, setSqlOpen] = useState(true);
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
    setTimeout(() => setCopied(false), 1500);
  }

  function resetToHero() {
    setResult(null);
    setError(null);
    setQuery("");
  }

  const columns = result?.results.length ? Object.keys(result.results[0]) : [];
  const isIdle = !result && !error && !loading;

  // ---------- IDLE: Hero layout ----------
  if (isIdle) {
    return (
      <div style={{ maxWidth: 880, margin: "0 auto" }}>
        <div style={{ textAlign: "center", padding: "24px 0 28px" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 16,
              padding: "6px 12px",
              borderRadius: 999,
              background: "var(--primary-faint)",
              border: "1px solid var(--primary-dim)",
              fontSize: 11.5,
              color: "var(--primary)",
              fontWeight: 500,
            }}
          >
            <IconSparkles size={12} stroke="var(--primary)" />
            Powered by Gemini 2.5 Flash · OpenRouter
          </div>
          <h1
            style={{
              fontSize: 32,
              color: "var(--heading)",
              letterSpacing: "-0.02em",
              marginBottom: 8,
            }}
          >
            Ask anything about your ledger
          </h1>
          <p style={{ color: "var(--muted)", fontSize: 14, maxWidth: 560, margin: "0 auto" }}>
            Plain-English questions become safe, read-only SQL against your tenant&apos;s ledger.
            Results land in seconds.
          </p>
        </div>

        <div style={{ position: "relative" }}>
          <textarea
            className="textarea"
            placeholder="e.g. What are my top 5 expense accounts this month?"
            rows={4}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleQuery(query);
            }}
            style={{
              fontSize: 15,
              padding: "18px 20px",
              borderRadius: 10,
              background: "var(--surface)",
              border: "1px solid var(--border)",
              resize: "none",
            }}
          />
          <div
            style={{
              position: "absolute",
              right: 14,
              bottom: 14,
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <span className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>⌘↵ to run</span>
            <button className="btn btn-primary" onClick={() => handleQuery(query)} disabled={!query.trim()}>
              Run Query <IconArrowRight size={13} stroke="#04130c" />
            </button>
          </div>
        </div>

        {/* Example chips */}
        <div style={{ marginTop: 18 }}>
          <div
            style={{
              fontSize: 11,
              color: "var(--muted)",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              marginBottom: 10,
              fontWeight: 500,
            }}
          >
            Example queries
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {EXAMPLE_QUERIES.map((q) => (
              <button
                key={q}
                onClick={() => handleQuery(q)}
                className="btn btn-ghost btn-sm"
                style={{ fontWeight: 400, color: "var(--body)" }}
              >
                <IconSparkles size={11} stroke="var(--muted)" />
                {q}
              </button>
            ))}
          </div>
        </div>

        {/* Trust cards */}
        <div style={{ marginTop: 28, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
          {TIPS.map(({ Icon, title, body }) => (
            <div key={title} className="card" style={{ padding: 14 }}>
              <Icon size={16} stroke="var(--primary)" />
              <div style={{ color: "var(--heading)", fontSize: 13, fontWeight: 500, marginTop: 10 }}>{title}</div>
              <div style={{ color: "var(--muted)", fontSize: 12, marginTop: 4, lineHeight: 1.5 }}>{body}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ---------- LOADING / DONE: Query header + split panels ----------
  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 16,
          marginBottom: 16,
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontSize: 11,
              color: "var(--muted)",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              fontWeight: 500,
              marginBottom: 6,
            }}
          >
            Query
          </div>
          <h1 style={{ fontSize: 20, color: "var(--heading)", letterSpacing: "-0.01em" }}>
            {query}
          </h1>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-ghost" onClick={resetToHero}>
            <IconChevronLeft size={13} /> New query
          </button>
        </div>
      </div>

      {error && (
        <div
          style={{
            padding: "12px 16px",
            borderRadius: 8,
            background: "var(--danger-dim)",
            border: "1px solid #f8717155",
            color: "var(--danger)",
            fontSize: 13,
            marginBottom: 16,
          }}
        >
          {error}
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: sqlOpen ? "1fr 1.4fr" : "40px 1fr",
          gap: 14,
          transition: "grid-template-columns .25s",
        }}
      >
        {/* SQL panel */}
        <div className="card" style={{ overflow: "hidden", display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "10px 14px",
              borderBottom: sqlOpen ? "1px solid var(--border)" : "none",
              background: "var(--surface-2)",
            }}
          >
            <button
              onClick={() => setSqlOpen(!sqlOpen)}
              style={{
                background: "none",
                border: "none",
                display: "flex",
                alignItems: "center",
                gap: 6,
                color: "var(--body)",
                fontWeight: 500,
                fontSize: 12.5,
                cursor: "pointer",
              }}
            >
              <IconChevronRight
                size={13}
                style={{ transform: sqlOpen ? "rotate(90deg)" : "rotate(0)", transition: "transform .15s" }}
              />
              {sqlOpen ? "Generated SQL" : ""}
              {sqlOpen && (
                <span className="badge badge-gray" style={{ marginLeft: 4 }}>
                  postgres
                </span>
              )}
            </button>
            {sqlOpen && result && (
              <button className="btn btn-ghost btn-sm" onClick={copySQL}>
                {copied ? (
                  <>
                    <IconCheck size={12} stroke="var(--primary)" /> Copied
                  </>
                ) : (
                  <>
                    <IconCopy size={12} /> Copy
                  </>
                )}
              </button>
            )}
          </div>
          {sqlOpen && (
            <div style={{ flex: 1, overflow: "auto", background: "var(--surface-2)" }}>
              {loading ? (
                <div
                  style={{
                    padding: 18,
                    color: "var(--muted)",
                    fontSize: 12.5,
                    fontFamily: "var(--font-mono), monospace",
                  }}
                >
                  generating sql…
                </div>
              ) : result ? (
                <pre className="sql-block fade-in" style={{ margin: 0 }}>
                  {result.sql}
                </pre>
              ) : null}
            </div>
          )}
        </div>

        {/* Results panel */}
        <div className="card" style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "10px 14px",
              borderBottom: "1px solid var(--border)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ color: "var(--heading)", fontSize: 12.5, fontWeight: 500 }}>Results</span>
              {result && (
                <span className="badge badge-emerald">
                  {result.row_count} row{result.row_count !== 1 ? "s" : ""}
                </span>
              )}
            </div>
            {result && (
              <button className="btn btn-ghost btn-sm">
                <IconDownload size={12} /> CSV
              </button>
            )}
          </div>

          {loading && (
            <div style={{ flex: 1, display: "grid", placeItems: "center", minHeight: 280 }}>
              <div style={{ textAlign: "center" }}>
                <div className="spinner" style={{ margin: "0 auto 14px" }} />
                <div style={{ color: "var(--primary)", fontWeight: 500, fontSize: 13 }}>Thinking…</div>
                <div style={{ color: "var(--muted)", fontSize: 11.5, marginTop: 4 }}>
                  Generating SQL · running against ledger
                </div>
              </div>
            </div>
          )}

          {result && (
            <div className="fade-in" style={{ overflow: "auto" }}>
              {result.results.length === 0 ? (
                <div
                  style={{
                    padding: "32px 20px",
                    textAlign: "center",
                    color: "var(--muted)",
                    fontSize: 13,
                  }}
                >
                  No results found for your query.
                </div>
              ) : (
                <table className="data">
                  <thead>
                    <tr>
                      {columns.map((c) => (
                        <th key={c} style={{ textTransform: "none" }}>
                          {c}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {result.results.map((row, i) => (
                      <tr key={i} style={{ background: i % 2 === 1 ? "var(--surface-2)" : "var(--surface)" }}>
                        {columns.map((c) => (
                          <td key={c} className="mono" style={{ fontSize: 12 }}>
                            {row[c] == null ? <span style={{ color: "var(--muted)" }}>NULL</span> : String(row[c])}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
