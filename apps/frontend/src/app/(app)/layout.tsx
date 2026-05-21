"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { Sidebar } from "@/components/shared/sidebar";
import { TopNav } from "@/components/shared/top-nav";
import { getToken } from "@/lib/auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuth();
  const router = useRouter();
  const [tenantName, setTenantName] = useState("FinGuard Workspace");

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace("/login");
    }
  }, [isAuthenticated, router]);

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    fetch(`${API_URL}/tenants/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { if (data?.name) setTenantName(data.name); })
      .catch(() => {});
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return (
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "var(--bg)" }}>
        <span className="spinner" style={{ width: 28, height: 28 }} />
      </div>
    );
  }

  const initials = user?.email
    ? user.email.slice(0, 2).toUpperCase()
    : "?";
  const displayName = user?.email?.split("@")[0] ?? "Account";
  const role = user?.role ?? "member";

  return (
    <div>
      <TopNav
        tenantName={tenantName}
        userName={displayName}
        userInitials={initials}
        userRole={role}
        fraudCount={0}
      />
      <div style={{ display: "grid", gridTemplateColumns: "232px 1fr" }}>
        <Sidebar fraudCount={0} />
        <main style={{ padding: "24px 28px 64px", minHeight: "calc(100vh - 56px)" }}>
          {children}
        </main>
      </div>
    </div>
  );
}
