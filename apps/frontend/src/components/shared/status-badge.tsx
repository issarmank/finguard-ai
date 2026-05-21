export function StatusBadge({ status }: { status: string }) {
  if (status === "posted")
    return <span className="badge badge-emerald"><span className="dot dot-emerald" />posted</span>;
  if (status === "draft")
    return <span className="badge badge-amber"><span className="dot dot-amber" />draft</span>;
  if (status === "voided")
    return <span className="badge badge-gray"><span className="dot dot-muted" />voided</span>;
  return <span className="badge badge-gray">{status}</span>;
}

export function RiskBadge({ level, pulse = false }: { level: string; pulse?: boolean }) {
  const map: Record<string, { cls: string; label: string }> = {
    low:      { cls: "badge-emerald-solid", label: "LOW" },
    medium:   { cls: "badge-amber-solid",   label: "MEDIUM" },
    high:     { cls: "badge-red",           label: "HIGH" },
    critical: { cls: "badge-red",           label: "CRITICAL" },
  };
  const m = map[level] ?? map.low;
  return (
    <span
      className={`badge ${m.cls} ${pulse && level === "critical" ? "pulse-red" : ""}`}
      style={{ height: 26, padding: "0 12px", fontSize: 12, letterSpacing: "0.1em" }}
    >
      {m.label}
    </span>
  );
}
