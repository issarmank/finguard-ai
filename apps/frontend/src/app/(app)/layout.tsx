"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { Sidebar } from "@/components/shared/sidebar";
import { TopNav } from "@/components/shared/top-nav";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace("/login");
    }
  }, [isAuthenticated, router]);

  if (!isAuthenticated) {
    return (
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "var(--bg)" }}>
        <span className="spinner" style={{ width: 28, height: 28 }} />
      </div>
    );
  }

  const initials = user?.email ? user.email.slice(0, 2).toUpperCase() : "?";
  const displayName = user?.email?.split("@")[0] ?? "Account";

  return (
    <div>
      <TopNav
        tenantName="FinGuard AI"
        userName={displayName}
        userInitials={initials}
        userRole="user"
        fraudCount={0}
      />
      <div style={{ display: "grid", gridTemplateColumns: "232px 1fr" }}>
        <Sidebar />
        <main style={{ padding: "24px 28px 64px", minHeight: "calc(100vh - 56px)" }}>
          {children}
        </main>
      </div>
    </div>
  );
}
