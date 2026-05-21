"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconBook, IconFile, IconHome, IconSettings, IconShield, IconSparkles, IconZap } from "@/components/icons";

const NAV_ITEMS = [
  { id: "dashboard",     label: "Dashboard",     icon: IconHome,     href: "/dashboard" },
  { id: "ledger",        label: "Ledger",        icon: IconBook,     href: "/ledger" },
  { id: "ai-query",      label: "AI Query",      icon: IconSparkles, href: "/ai-query" },
  { id: "fraud-alerts",  label: "Fraud Alerts",  icon: IconShield,   href: "/fraud-alerts" },
  { id: "audit-reports", label: "Audit Reports", icon: IconFile,     href: "/audit-reports" },
  { id: "settings",      label: "Settings",      icon: IconSettings, href: "/settings" },
];

export function Sidebar({ fraudCount = 0 }: { fraudCount?: number }) {
  const pathname = usePathname();

  return (
    <aside style={{
      width: 232, borderRight: "1px solid var(--border)",
      background: "var(--bg)", padding: "14px 12px",
      display: "flex", flexDirection: "column", gap: 2,
      position: "sticky", top: 56, height: "calc(100vh - 56px)", overflowY: "auto",
    }}>
      <div style={{ padding: "4px 12px 10px", fontSize: 10.5, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 500 }}>
        Workspace
      </div>

      {NAV_ITEMS.map((item) => {
        const Ic = item.icon;
        const active = pathname.startsWith(item.href);
        return (
          <Link key={item.id} href={item.href} className={`side-link ${active ? "active" : ""}`} style={{ textDecoration: "none" }}>
            <Ic size={16} />
            <span style={{ flex: 1 }}>{item.label}</span>
            {item.id === "fraud-alerts" && fraudCount > 0 && (
              <span style={{
                minWidth: 18, height: 18, padding: "0 5px", borderRadius: 999,
                background: "var(--danger-dim)", color: "var(--danger)",
                fontSize: 10, fontWeight: 600, display: "grid", placeItems: "center",
                border: "1px solid #f8717155",
              }}>{fraudCount}</span>
            )}
          </Link>
        );
      })}

      <div style={{ flex: 1 }} />

      <div style={{
        margin: "0 4px 4px", padding: 12, borderRadius: 10,
        border: "1px solid var(--border)",
        background: "linear-gradient(180deg, #111815, #0d1411)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <IconZap size={13} stroke="var(--primary)" />
          <span style={{ fontSize: 11.5, color: "var(--heading)", fontWeight: 600 }}>System healthy</span>
        </div>
        <div style={{ fontSize: 11, color: "var(--muted)", lineHeight: 1.5 }}>
          All services nominal · API connected
        </div>
        <div style={{ height: 4, background: "var(--border)", borderRadius: 999, marginTop: 10, overflow: "hidden" }}>
          <div style={{ width: "94%", height: "100%", background: "var(--primary)", borderRadius: 999 }} />
        </div>
      </div>
    </aside>
  );
}
