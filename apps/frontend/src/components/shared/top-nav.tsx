"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import {
  IconBell,
  IconChevronDown,
  IconSearch,
  IconShield,
  IconCheck,
  IconPlus,
  IconUsers,
  IconSettings,
} from "@/components/icons";

interface TopNavProps {
  tenantName: string;
  userName: string;
  userInitials: string;
  userRole: string;
  fraudCount?: number;
}

// Replace with real data from /tenants once you have the endpoint.
const OTHER_TENANTS = [
  { id: "t_globex", name: "Globex Holdings", plan: "Business", initial: "G" },
  { id: "t_acme",   name: "Acme Corp",       plan: "Starter",  initial: "A" },
];

export function TopNav({
  tenantName,
  userName,
  userInitials,
  userRole,
  fraudCount = 0,
}: TopNavProps) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [openMenu, setOpenMenu] = useState<"tenant" | "user" | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Close on outside click + Escape
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpenMenu(null);
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKey);
    };
  }, []);

  function handleSignOut() {
    logout();
    router.push("/login");
  }

  return (
    <header
      style={{
        height: 56,
        borderBottom: "1px solid var(--border)",
        background: "var(--bg)",
        display: "grid",
        gridTemplateColumns: "232px 1fr auto",
        alignItems: "center",
        padding: "0 16px 0 20px",
        position: "sticky",
        top: 0,
        zIndex: 20,
      }}
    >
      {/* Logo → /dashboard */}
      <Link
        href="/dashboard"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          textDecoration: "none",
        }}
      >
        <div
          style={{
            width: 26,
            height: 26,
            borderRadius: 7,
            background: "linear-gradient(135deg, #6ee7b7, #34d399)",
            display: "grid",
            placeItems: "center",
            color: "#04130c",
            fontWeight: 700,
            fontSize: 13,
            boxShadow: "0 0 0 1px #6ee7b733, 0 0 12px #6ee7b733",
          }}
        >
          <IconShield size={14} stroke="#04130c" />
        </div>
        <div
          style={{
            fontWeight: 600,
            color: "var(--heading)",
            fontSize: 14,
            letterSpacing: "-0.01em",
          }}
        >
          FinGuard <span style={{ color: "var(--primary)" }}>AI</span>
        </div>
        <span
          style={{
            display: "inline-block",
            width: 6,
            height: 6,
            borderRadius: 999,
            background: "var(--primary)",
            boxShadow: "0 0 8px var(--primary)",
          }}
        />
      </Link>

      {/* Center: tenant pill (now a button) + search */}
      <div ref={wrapRef} style={{ display: "flex", alignItems: "center", gap: 16, maxWidth: 720, position: "relative" }}>
        {/* TENANT BUTTON */}
        <div style={{ position: "relative" }}>
          <button
            onClick={() => setOpenMenu(openMenu === "tenant" ? null : "tenant")}
            aria-label="Switch workspace"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              height: 30,
              padding: "0 10px 0 8px",
              borderRadius: 6,
              border: "1px solid var(--border)",
              background:
                openMenu === "tenant" ? "var(--surface-hover)" : "var(--surface)",
              borderColor:
                openMenu === "tenant" ? "var(--border-strong)" : "var(--border)",
              fontSize: 12.5,
              cursor: "pointer",
              color: "var(--body)",
              transition: "background .12s, border-color .12s",
            }}
          >
            <span
              style={{
                width: 18,
                height: 18,
                borderRadius: 5,
                background: "#1f2e28",
                display: "grid",
                placeItems: "center",
                color: "var(--primary)",
                fontSize: 10,
                fontWeight: 600,
              }}
            >
              {tenantName[0]?.toUpperCase()}
            </span>
            <span style={{ fontWeight: 500 }}>{tenantName}</span>
            <IconChevronDown
              size={14}
              stroke="var(--muted)"
              style={{
                transform: openMenu === "tenant" ? "rotate(180deg)" : "rotate(0)",
                transition: "transform .15s",
              }}
            />
          </button>

          {openMenu === "tenant" && (
            <TenantMenu
              currentName={tenantName}
              currentRole={userRole}
              onClose={() => setOpenMenu(null)}
            />
          )}
        </div>

        {/* SEARCH */}
        <div style={{ position: "relative", flex: 1, maxWidth: 420 }}>
          <IconSearch
            size={14}
            stroke="var(--muted)"
            style={{ position: "absolute", left: 10, top: 10 }}
          />
          <input
            className="input"
            placeholder="Search entries, accounts, references…"
            style={{ paddingLeft: 32, height: 34, fontSize: 13 }}
          />
          <kbd
            style={{
              position: "absolute",
              right: 8,
              top: 8,
              fontSize: 10,
              padding: "2px 6px",
              borderRadius: 4,
              background: "var(--surface-2)",
              border: "1px solid var(--border)",
              color: "var(--muted)",
              fontFamily: "var(--font-mono), monospace",
            }}
          >
            ⌘K
          </kbd>
        </div>
      </div>

      {/* Right: notifications + user dropdown */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, position: "relative" }}>
        <button
          className="btn btn-ghost btn-sm"
          style={{ position: "relative", width: 32, padding: 0 }}
          aria-label="Notifications"
          onClick={() => router.push("/fraud-alerts")}
        >
          <IconBell size={15} />
          {fraudCount > 0 && (
            <span
              style={{
                position: "absolute",
                top: -3,
                right: -3,
                minWidth: 16,
                height: 16,
                padding: "0 4px",
                borderRadius: 999,
                background: "var(--danger)",
                color: "#1a0606",
                fontSize: 10,
                fontWeight: 700,
                display: "grid",
                placeItems: "center",
                border: "2px solid var(--bg)",
              }}
            >
              {fraudCount}
            </span>
          )}
        </button>

        {/* User dropdown */}
        <div style={{ position: "relative" }}>
          <button
            onClick={() => setOpenMenu(openMenu === "user" ? null : "user")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              cursor: "pointer",
              background:
                openMenu === "user" ? "var(--surface-hover)" : "transparent",
              border: "1px solid",
              borderColor:
                openMenu === "user" ? "var(--border-strong)" : "transparent",
              padding: "3px 8px 3px 3px",
              borderRadius: 999,
              transition: "background .12s, border-color .12s",
            }}
          >
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 999,
                background: "linear-gradient(135deg, #1f2e28, #2a3f37)",
                color: "var(--primary)",
                display: "grid",
                placeItems: "center",
                fontSize: 11,
                fontWeight: 600,
                border: "1px solid var(--border-strong)",
              }}
            >
              {userInitials}
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                lineHeight: 1.15,
                textAlign: "left",
              }}
            >
              <span style={{ fontSize: 12.5, fontWeight: 500, color: "var(--heading)" }}>
                {userName}
              </span>
              <span
                style={{
                  fontSize: 11,
                  color: "var(--muted)",
                  textTransform: "capitalize",
                }}
              >
                {userRole}
              </span>
            </div>
            <IconChevronDown
              size={14}
              stroke="var(--muted)"
              style={{
                transform: openMenu === "user" ? "rotate(180deg)" : "rotate(0)",
                transition: "transform .15s",
              }}
            />
          </button>

          {openMenu === "user" && (
            <div
              style={{
                position: "absolute",
                top: "calc(100% + 10px)",
                right: 0,
                width: 240,
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 10,
                boxShadow: "0 16px 40px #00000066",
                zIndex: 100,
                overflow: "hidden",
                animation: "fade-up .14s ease-out both",
              }}
            >
              <div
                style={{
                  padding: "12px 14px",
                  borderBottom: "1px solid var(--border)",
                }}
              >
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: "var(--heading)",
                    marginBottom: 2,
                  }}
                >
                  {userName}
                </div>
                <div style={{ fontSize: 11.5, color: "var(--muted)" }}>
                  {user?.email}
                </div>
                <div
                  style={{
                    marginTop: 6,
                    display: "inline-flex",
                    alignItems: "center",
                    padding: "2px 8px",
                    borderRadius: 999,
                    fontSize: 10.5,
                    fontWeight: 500,
                    background: "var(--primary-faint)",
                    color: "var(--primary)",
                    border: "1px solid var(--primary-dim)",
                    textTransform: "capitalize",
                  }}
                >
                  {userRole}
                </div>
              </div>
              <div style={{ padding: "6px 0" }}>
                <Link
                  href="/settings"
                  onClick={() => setOpenMenu(null)}
                  style={{
                    display: "block",
                    padding: "8px 14px",
                    fontSize: 13,
                    color: "var(--body)",
                    textDecoration: "none",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = "var(--surface-hover)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "transparent")
                  }
                >
                  Settings
                </Link>
                <button
                  onClick={handleSignOut}
                  style={{
                    display: "block",
                    width: "100%",
                    padding: "8px 14px",
                    fontSize: 13,
                    color: "var(--danger)",
                    background: "none",
                    border: "none",
                    textAlign: "left",
                    cursor: "pointer",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = "var(--danger-dim)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "transparent")
                  }
                >
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

// ─────────────────────────────────────────────────────────────
// TenantMenu — the dropdown that opens from the workspace pill
// ─────────────────────────────────────────────────────────────

function TenantMenu({
  currentName,
  currentRole,
  onClose,
}: {
  currentName: string;
  currentRole: string;
  onClose: () => void;
}) {
  const router = useRouter();

  return (
    <div
      style={{
        position: "absolute",
        top: "calc(100% + 10px)",
        left: 0,
        width: 320,
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 10,
        boxShadow: "0 16px 40px #00000066",
        zIndex: 100,
        overflow: "hidden",
        animation: "fade-up .14s ease-out both",
      }}
    >
      {/* Current workspace */}
      <div
        style={{
          padding: "14px",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 8,
            background: "linear-gradient(135deg, #6ee7b7, #34d399)",
            display: "grid",
            placeItems: "center",
            color: "#04130c",
            fontWeight: 700,
            fontSize: 15,
            flexShrink: 0,
          }}
        >
          {currentName[0]?.toUpperCase()}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "var(--heading)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {currentName}
          </div>
          <div style={{ fontSize: 11.5, color: "var(--muted)", textTransform: "capitalize" }}>
            Current · {currentRole}
          </div>
        </div>
        <IconCheck size={16} stroke="var(--primary)" />
      </div>

      {/* Other workspaces */}
      {OTHER_TENANTS.length > 0 && (
        <div>
          <div
            style={{
              padding: "10px 14px 4px",
              fontSize: 10,
              color: "var(--muted)",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              fontWeight: 500,
            }}
          >
            Switch workspace
          </div>
          {OTHER_TENANTS.map((t) => (
            <button
              key={t.id}
              onClick={() => {
                // TODO: call your real "switch tenant" endpoint here
                console.log("switch to", t.id);
                onClose();
              }}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "8px 14px",
                background: "transparent",
                border: "none",
                cursor: "pointer",
                color: "var(--body)",
                fontSize: 12.5,
                transition: "background .12s",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "var(--surface-hover)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "transparent")
              }
            >
              <div
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: 6,
                  background: "#1f2e28",
                  display: "grid",
                  placeItems: "center",
                  color: "var(--primary)",
                  fontSize: 11,
                  fontWeight: 600,
                  flexShrink: 0,
                }}
              >
                {t.initial}
              </div>
              <div style={{ flex: 1, textAlign: "left", minWidth: 0 }}>
                <div
                  style={{
                    color: "var(--heading)",
                    fontWeight: 500,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {t.name}
                </div>
                <div style={{ fontSize: 11, color: "var(--muted)" }}>{t.plan}</div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Actions */}
      <div style={{ borderTop: "1px solid var(--border)", padding: "6px 0" }}>
        <button
          onClick={() => {
            router.push("/settings");
            onClose();
          }}
          style={menuItemStyle}
          onMouseEnter={(e) =>
            (e.currentTarget.style.background = "var(--surface-hover)")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.background = "transparent")
          }
        >
          <IconSettings size={14} stroke="var(--muted)" />
          <span>Workspace settings</span>
        </button>
        <button
          onClick={onClose}
          style={menuItemStyle}
          onMouseEnter={(e) =>
            (e.currentTarget.style.background = "var(--surface-hover)")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.background = "transparent")
          }
        >
          <IconUsers size={14} stroke="var(--muted)" />
          <span>Invite members</span>
        </button>
        <button
          onClick={onClose}
          style={menuItemStyle}
          onMouseEnter={(e) =>
            (e.currentTarget.style.background = "var(--surface-hover)")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.background = "transparent")
          }
        >
          <IconPlus size={14} stroke="var(--primary)" />
          <span style={{ color: "var(--primary)" }}>Create new workspace</span>
        </button>
      </div>
    </div>
  );
}

const menuItemStyle: React.CSSProperties = {
  width: "100%",
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "8px 14px",
  background: "transparent",
  border: "none",
  cursor: "pointer",
  color: "var(--body)",
  fontSize: 12.5,
  textAlign: "left",
  transition: "background .12s",
};
