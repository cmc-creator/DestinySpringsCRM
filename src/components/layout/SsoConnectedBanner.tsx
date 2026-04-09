"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";

function BannerInner() {
  const searchParams = useSearchParams();
  const router       = useRouter();
  const pathname     = usePathname();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (searchParams.get("sso_connected") === "1") {
      setVisible(true);
      // Strip the param without a reload
      const params = new URLSearchParams(searchParams.toString());
      params.delete("sso_connected");
      const next = params.size > 0 ? `${pathname}?${params}` : pathname;
      router.replace(next, { scroll: false });
      // Auto-dismiss after 6 seconds
      const t = setTimeout(() => setVisible(false), 6000);
      return () => clearTimeout(t);
    }
  }, [searchParams, router, pathname]);

  if (!visible) return null;

  return (
    <div style={{
      position: "fixed",
      bottom: 24,
      right: 24,
      zIndex: 9999,
      background: "linear-gradient(135deg, rgba(30,30,20,0.97), rgba(20,20,14,0.97))",
      border: "1px solid var(--nyx-accent-dim, rgba(201,168,76,0.3))",
      borderLeft: "3px solid var(--nyx-accent, #c9a84c)",
      borderRadius: 10,
      padding: "13px 40px 13px 16px",
      boxShadow: "0 8px 28px rgba(0,0,0,0.45)",
      minWidth: 280,
      maxWidth: 360,
    }}>
      <button
        onClick={() => setVisible(false)}
        aria-label="Dismiss"
        style={{
          position: "absolute", top: 8, right: 10,
          background: "none", border: "none", cursor: "pointer",
          color: "rgba(237,228,207,0.5)", fontSize: "1rem", lineHeight: 1,
          padding: "2px 4px",
        }}
      >
        ×
      </button>
      <p style={{ margin: 0, fontSize: "0.83rem", fontWeight: 700, color: "var(--nyx-accent, #c9a84c)", letterSpacing: "0.05em", textTransform: "uppercase" }}>
        Integration connected
      </p>
      <p style={{ margin: "4px 0 0", fontSize: "0.84rem", color: "rgba(237,228,207,0.78)", lineHeight: 1.45 }}>
        Your Microsoft / Google account is now linked. Emails and calendar sync automatically.
      </p>
    </div>
  );
}

export default function SsoConnectedBanner() {
  return (
    <Suspense fallback={null}>
      <BannerInner />
    </Suspense>
  );
}
