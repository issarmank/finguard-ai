"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { api, ApiError } from "@/lib/api";
import { IconShield } from "@/components/icons";
import type { TokenResponse } from "@/types/api";

export default function RegisterPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await api.post<TokenResponse>("/auth/register", { name, email, password });
      login(res.access_token);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ width: "100%", maxWidth: 400 }}>
      {/* Logo */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24, justifyContent: "center" }}>
        <div style={{
          width: 32, height: 32, borderRadius: 9,
          background: "linear-gradient(135deg, #6ee7b7, #34d399)",
          display: "grid", placeItems: "center", color: "#04130c",
          boxShadow: "0 0 0 1px #6ee7b733, 0 0 16px #6ee7b733",
        }}>
          <IconShield size={16} stroke="#04130c" />
        </div>
        <span style={{ fontWeight: 700, fontSize: 18, color: "var(--heading)", letterSpacing: "-0.02em" }}>
          FinGuard <span style={{ color: "var(--primary)" }}>AI</span>
        </span>
      </div>

      <div className="card" style={{ padding: 28 }}>
        <h1 style={{ fontSize: 20, fontWeight: 600, color: "var(--heading)", marginBottom: 4 }}>
          Create your account
        </h1>
        <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 24 }}>
          Start tracking your spending, budgets, and net worth
        </p>

        {error && (
          <div style={{
            padding: "10px 14px", borderRadius: 8, marginBottom: 16,
            background: "var(--danger-dim)", border: "1px solid #f8717155",
            color: "var(--danger)", fontSize: 13,
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ fontSize: 12.5, color: "var(--body)", fontWeight: 500 }}>
              Name <span style={{ color: "var(--muted)", fontWeight: 400 }}></span>
            </label>
            <input
              className="input"
              type="text"
              placeholder="Alex Johnson"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
            />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ fontSize: 12.5, color: "var(--body)", fontWeight: 500 }}>Email</label>
            <input
              className="input"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ fontSize: 12.5, color: "var(--body)", fontWeight: 500 }}>Password</label>
            <input
              className="input"
              type="password"
              placeholder="Min. 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
            />
          </div>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ marginTop: 4, height: 38 }}
          >
            {loading ? <span className="spinner" /> : "Create account"}
          </button>
        </form>

        <p style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 20, textAlign: "center" }}>
          Already have an account?{" "}
          <Link href="/login" style={{ color: "var(--primary)", textDecoration: "none", fontWeight: 500 }}>
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
