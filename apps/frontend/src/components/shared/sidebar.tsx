"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IconHome,
  IconCreditCard,
  IconPieChart,
  IconTarget,
  IconTrendingUp,
  IconSparkles,
  IconFile,
  IconSettings,
} from "@/components/icons";

const NAV_ITEMS = [
  { id: "dashboard",    label: "Dashboard",    icon: IconHome,       href: "/dashboard" },
  { id: "transactions", label: "Transactions", icon: IconCreditCard, href: "/transactions" },
  { id: "budgets",      label: "Budgets",      icon: IconPieChart,   href: "/budgets" },
  { id: "goals",        label: "Goals",        icon: IconTarget,     href: "/goals" },
  { id: "net-worth",    label: "Net Worth",    icon: IconTrendingUp, href: "/net-worth" },
  { id: "ai-coach",     label: "AI Coach",     icon: IconSparkles,   href: "/ai-query" },
  { id: "reports",      label: "Reports",      icon: IconFile,       href: "/audit-reports" },
  { id: "settings",     label: "Settings",     icon: IconSettings,   href: "/settings" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside style={{
      width: 232, borderRight: "1px solid var(--border)",
      background: "var(--bg)", padding: "14px 12px",
      display: "flex", flexDirection: "column", gap: 2,
      position: "sticky", top: 56, height: "calc(100vh - 56px)", overflowY: "auto",
    }}>
      <div style={{ padding: "4px 12px 10px", fontSize: 10.5, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 500 }}>
        Personal Finance
      </div>

      {NAV_ITEMS.map((item) => {
        const Ic = item.icon;
        const active = pathname.startsWith(item.href);
        return (
          <Link key={item.id} href={item.href} className={`side-link ${active ? "active" : ""}`} style={{ textDecoration: "none" }}>
            <Ic size={16} />
            <span style={{ flex: 1 }}>{item.label}</span>
          </Link>
        );
      })}

    </aside>
  );
}
