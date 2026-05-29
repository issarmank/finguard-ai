"use client";

import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { PageHeader } from "@/components/shared/page-header";
import { IconRefresh, IconSearch } from "@/components/icons";
import { fmtMoney, fmtDate } from "@/lib/utils";
import type { TransactionOut, PaginatedResponse, CategoryOut, AccountOut } from "@/types/api";

export default function TransactionsPage() {
  const [txs, setTxs] = useState<TransactionOut[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [categories, setCategories] = useState<CategoryOut[]>([]);
  const [accounts, setAccounts] = useState<AccountOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterCat, setFilterCat] = useState("");
  const [filterAcct, setFilterAcct] = useState("");

  function buildPath(p: number) {
    let path = `/transactions/?page=${p}&size=25`;
    if (filterCat) path += `&category_id=${filterCat}`;
    if (filterAcct) path += `&account_id=${filterAcct}`;
    return path;
  }

  function load(p = page) {
    setLoading(true);
    setError(null);
    api.get<PaginatedResponse<TransactionOut>>(buildPath(p))
      .then((r) => { setTxs(r.items); setTotal(r.total); setPages(r.pages); setPage(p); })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load transactions"))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    Promise.all([
      api.get<CategoryOut[]>("/transactions/categories").catch(() => [] as CategoryOut[]),
      api.get<AccountOut[]>("/transactions/accounts").catch(() => [] as AccountOut[]),
    ]).then(([cats, accts]) => {
      setCategories(cats);
      setAccounts(accts);
    });
    load(1);
  }, []);

  useEffect(() => { load(1); }, [filterCat, filterAcct]);

  const catMap = Object.fromEntries(categories.map((c) => [c.id, c]));
  const acctMap = Object.fromEntries(accounts.map((a) => [a.id, a]));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <PageHeader
        title="Transactions"
        subtitle={`${total} transactions across all accounts`}
        actions={<button className="btn btn-ghost" onClick={() => load(1)}><IconRefresh size={13} /> Refresh</button>}
      />

      {/* Filters */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <div style={{ position: "relative" }}>
          <IconSearch size={13} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--muted)", pointerEvents: "none" }} />
          <select className="select" style={{ paddingLeft: 30 }} value={filterCat} onChange={(e) => setFilterCat(e.target.value)}>
            <option value="">All categories</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
          </select>
        </div>
        <select className="select" value={filterAcct} onChange={(e) => setFilterAcct(e.target.value)}>
          <option value="">All accounts</option>
          {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
      </div>

      {error && (
        <div style={{ padding: "10px 14px", borderRadius: 6, background: "var(--danger-dim)", color: "var(--danger)", fontSize: 13, border: "1px solid #f8717133" }}>
          {error}
        </div>
      )}

      {/* Table */}
      <div className="card" style={{ overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: 40, display: "grid", placeItems: "center" }}>
            <span className="spinner" style={{ width: 22, height: 22 }} />
          </div>
        ) : txs.length === 0 ? (
          <div style={{ padding: "40px 20px", textAlign: "center", color: "var(--muted)", fontSize: 13 }}>
            No transactions found.
          </div>
        ) : (
          <table className="data" style={{ width: "100%" }}>
            <thead>
              <tr>
                <th style={{ width: 120 }}>Date</th>
                <th>Description</th>
                <th>Account</th>
                <th>Category</th>
                <th style={{ textAlign: "right" }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {txs.map((tx) => {
                const cat = tx.category_id ? catMap[tx.category_id] : null;
                const acct = acctMap[tx.account_id];
                return (
                  <tr key={tx.id} style={{ opacity: tx.pending ? 0.6 : 1 }}>
                    <td className="mono" style={{ fontSize: 12, color: "var(--muted)", whiteSpace: "nowrap" }}>{fmtDate(tx.date)}</td>
                    <td>
                      <div style={{ color: "var(--body)", fontWeight: 500, fontSize: 13 }}>{tx.merchant ?? tx.description}</div>
                      {tx.notes && <div style={{ color: "var(--muted)", fontSize: 11.5 }}>{tx.notes}</div>}
                    </td>
                    <td style={{ color: "var(--muted)", fontSize: 12.5 }}>{acct?.name ?? "—"}</td>
                    <td>
                      {cat ? (
                        <span style={{
                          padding: "2px 8px", borderRadius: 999, fontSize: 11, fontWeight: 500,
                          background: `${cat.color ?? "#6ee7b7"}22`,
                          color: cat.color ?? "var(--primary)",
                          border: `1px solid ${cat.color ?? "#6ee7b7"}44`,
                        }}>
                          {cat.icon} {cat.name}
                        </span>
                      ) : (
                        <span style={{ color: "var(--muted)", fontSize: 12 }}>Uncategorized</span>
                      )}
                    </td>
                    <td className="mono" style={{ textAlign: "right", fontSize: 13, fontWeight: 500, color: tx.amount < 0 ? "var(--primary)" : "var(--body)" }}>
                      {tx.amount < 0 ? "+" : ""}{fmtMoney(Math.abs(tx.amount))}
                      {tx.pending && <span style={{ marginLeft: 4, fontSize: 10, color: "var(--muted)" }}>pending</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div style={{ display: "flex", justifyContent: "center", gap: 6 }}>
          <button className="btn btn-ghost btn-sm" disabled={page <= 1} onClick={() => load(page - 1)}>← Prev</button>
          <span style={{ fontSize: 12, color: "var(--muted)", padding: "0 8px", display: "grid", placeItems: "center" }}>
            Page {page} of {pages}
          </span>
          <button className="btn btn-ghost btn-sm" disabled={page >= pages} onClick={() => load(page + 1)}>Next →</button>
        </div>
      )}
    </div>
  );
}
