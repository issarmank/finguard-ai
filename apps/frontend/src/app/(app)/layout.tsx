"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { Sidebar } from "@/components/shared/sidebar";
import { TopNav } from "@/components/shared/top-nav";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isLoading, isAuthenticated, router]);

  // Close mobile sidebar on route change
  useEffect(() => {
    setSidebarOpen(false);
  }, []);

  if (isLoading) {
    return (
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "var(--bg)" }}>
        <span className="spinner" style={{ width: 28, height: 28 }} />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const initials = user?.email ? user.email.slice(0, 2).toUpperCase() : "?";
  const displayName = user?.email?.split("@")[0] ?? "Account";

  return (
    <div>
      <TopNav
        userName={displayName}
        userInitials={initials}
        userRole="user"
        onMenuToggle={() => setSidebarOpen((o) => !o)}
      />
      <div className="app-layout">
        <Sidebar mobileOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <main style={{ padding: "24px 20px 0", minHeight: "calc(100vh - 56px)", display: "flex", flexDirection: "column" }}>
          <div style={{ flex: 1 }}>{children}</div>
          <footer style={{
            marginTop: 48,
            padding: "16px 0",
            borderTop: "1px solid var(--border)",
            textAlign: "center",
            fontSize: 12,
            color: "var(--muted)",
            letterSpacing: "0.02em",
          }}>
            FinGuard AI · 2026
          </footer>
        </main>
      </div>
    </div>
  );
}
