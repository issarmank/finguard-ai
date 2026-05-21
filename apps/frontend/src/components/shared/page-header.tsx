import { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}

export function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 20, gap: 16 }}>
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-0.01em" }}>{title}</h1>
        {subtitle && <div style={{ color: "var(--muted)", fontSize: 13, marginTop: 4 }}>{subtitle}</div>}
      </div>
      {actions && <div style={{ display: "flex", gap: 8 }}>{actions}</div>}
    </div>
  );
}
