"use client";

import { useEffect, useRef } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";

// This page is the SSO bridge: OAuth callback mints an HMAC token, redirects here,
// and this page calls signIn("sso-token") so NextAuth creates the session cookie.
export default function SsoPage() {
  const router        = useRouter();
  const searchParams  = useSearchParams();
  const called        = useRef(false);

  useEffect(() => {
    if (called.current) return;
    called.current = true;

    const t = searchParams.get("t");
    if (!t) {
      router.replace("/login?error=Invalid+SSO+token");
      return;
    }

    signIn("sso-token", { token: t, redirect: false }).then((result) => {
      if (result?.error || !result?.ok) {
        router.replace("/login?error=OAuthNotLinked");
        return;
      }
      // Read role from session to redirect to the correct dashboard
      fetch("/api/auth/session")
        .then((r) => r.json())
        .then((session) => {
          const role = session?.user?.role as string | undefined;
          if (role === "REP") {
            router.replace("/rep/dashboard");
          } else if (role) {
            router.replace("/admin/dashboard");
          } else {
            router.replace("/login?error=OAuthNotLinked");
          }
        })
        .catch(() => router.replace("/admin/dashboard"));
    });
  }, [router, searchParams]);

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh" }}>
      <p>Signing you in&hellip;</p>
    </div>
  );
}
