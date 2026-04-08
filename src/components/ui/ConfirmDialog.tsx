"use client";
import React from "react";

interface ConfirmDialogProps {
  message: string;
  subtext?: string;
  confirmLabel?: string;
  /** hex or css color for the confirm button accent — defaults to danger red */
  confirmColor?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  message,
  subtext,
  confirmLabel = "Delete",
  confirmColor = "#f87171",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  // Close on Escape key
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onCancel(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onCancel]);

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.68)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
      onClick={onCancel}
    >
      <div
        style={{ background: "var(--nyx-bg, #12090a)", border: "1px solid rgba(201,168,76,0.22)", borderRadius: 14, padding: "26px 26px 22px", width: "100%", maxWidth: 420, boxShadow: "0 24px 60px rgba(0,0,0,0.65)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Warning icon */}
        <div style={{ width: 40, height: 40, borderRadius: "50%", background: `${confirmColor}18`, border: `1px solid ${confirmColor}44`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={confirmColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
        </div>

        <p style={{ margin: "0 0 6px", fontWeight: 800, color: "var(--nyx-text, #ede4cf)", fontSize: "0.97rem", lineHeight: 1.4 }}>{message}</p>
        {subtext && (
          <p style={{ margin: "0 0 18px", fontSize: "0.82rem", color: "var(--nyx-text-muted, rgba(237,228,207,0.5))", lineHeight: 1.5 }}>{subtext}</p>
        )}
        {!subtext && <div style={{ marginBottom: 18 }} />}

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button
            onClick={onCancel}
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "9px 18px", color: "var(--nyx-text-muted, rgba(237,228,207,0.6))", cursor: "pointer", fontSize: "0.84rem", fontWeight: 700 }}
          >
            Cancel
          </button>
          <button
            autoFocus
            onClick={onConfirm}
            style={{ background: `${confirmColor}18`, border: `1px solid ${confirmColor}55`, borderRadius: 8, padding: "9px 20px", color: confirmColor, cursor: "pointer", fontSize: "0.84rem", fontWeight: 800, transition: "background 0.15s" }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
