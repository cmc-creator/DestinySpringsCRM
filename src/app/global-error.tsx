"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ margin: 0, padding: "2rem", fontFamily: "system-ui, sans-serif", background: "#100805", color: "#ede4cf" }}>
        <h2 style={{ marginTop: 0 }}>Something went wrong</h2>
        <p>We logged this issue and will investigate.</p>
        <button
          onClick={() => reset()}
          style={{
            background: "#c9a84c",
            border: "none",
            color: "#1a1208",
            fontWeight: 700,
            padding: "0.6rem 1rem",
            borderRadius: 8,
            cursor: "pointer",
          }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
