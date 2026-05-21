"use client";

import { ReactNode } from "react";
import { IconX } from "@/components/icons";

export function Drawer({
  onClose,
  children,
  title,
  width = 480,
}: {
  onClose: () => void;
  children: ReactNode;
  title?: string;
  width?: number;
}) {
  return (
    <>
      <div className="overlay" onClick={onClose} />
      <div className="drawer" style={{ width }}>
        {title && (
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "16px 20px", borderBottom: "1px solid var(--border)", marginBottom: 20,
          }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: "var(--heading)" }}>{title}</span>
            <button className="btn btn-ghost btn-sm" onClick={onClose} style={{ width: 28, padding: 0 }}>
              <IconX size={14} />
            </button>
          </div>
        )}
        <div style={{ padding: title ? "0 20px 24px" : "24px 20px" }}>
          {children}
        </div>
      </div>
    </>
  );
}

export function Modal({
  onClose,
  children,
  width = 600,
}: {
  onClose: () => void;
  children: ReactNode;
  width?: number;
}) {
  return (
    <>
      <div className="overlay" onClick={onClose} />
      <div className="modal" style={{ width }}>
        {children}
      </div>
    </>
  );
}
