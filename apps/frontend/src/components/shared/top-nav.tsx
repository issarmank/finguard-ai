"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import {
  IconChevronDown,
  IconSearch,
  IconShield,
} from "@/components/icons";

interface TopNavProps {
  userName: string;
  userInitials: string;
  userRole: string;
}

export function TopNav({
  userName,
  userInitials,
  userRole,
}: TopNavProps) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [openMenu, setOpenMenu] = useState<"user" | null>(null);
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

      {/* Center: search */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, maxWidth: 720, position: "relative" }}>
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

      {/* Right: user dropdown */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, position: "relative" }}>
        {/* User dropdown */}
        <div ref={wrapRef} style={{ position: "relative" }}>
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

