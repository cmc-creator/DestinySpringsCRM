"use client";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[GlobalError]", error);
  }, [error]);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--nyx-bg, #0d0a04)",
        color: "var(--nyx-text, #ede4cf)",
        fontFamily: "system-ui, sans-serif",
        padding: 32,
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: "2.5rem", marginBottom: 16 }}>⚠️</div>
      <h1
        style={{
          fontSize: "1.4rem",
          fontWeight: 800,
          color: "#c9a84c",
          marginBottom: 10,
        }}
      >
        Something went wrong
      </h1>
      <p
        style={{
          fontSize: "0.875rem",
          color: "rgba(237,228,207,0.55)",
          maxWidth: 400,
          lineHeight: 1.6,
          marginBottom: 28,
        }}
      >
        An unexpected error occurred. Our team has been notified. You can try
        again or return to the dashboard.
      </p>
      {error.digest && (
        <p
          style={{
            fontSize: "0.7rem",
            color: "rgba(237,228,207,0.3)",
            marginBottom: 24,
            fontFamily: "monospace",
          }}
        >
          Error ID: {error.digest}
        </p>
      )}
      <div style={{ display: "flex", gap: 12 }}>
        <button
          onClick={reset}
          style={{
            background: "#c9a84c",
            color: "#100805",
            border: "none",
            borderRadius: 10,
            padding: "10px 22px",
            fontWeight: 800,
            fontSize: "0.85rem",
            cursor: "pointer",
          }}
        >
          Try Again
        </button>
        <a
          href="/admin/dashboard"
          style={{
            background: "rgba(255,255,255,0.05)",
            color: "rgba(237,228,207,0.7)",
            border: "1px solid rgba(201,168,76,0.2)",
            borderRadius: 10,
            padding: "10px 22px",
            fontWeight: 600,
            fontSize: "0.85rem",
            cursor: "pointer",
            textDecoration: "none",
          }}
        >
          Go to Dashboard
        </a>
      </div>
    </div>
  );
}
