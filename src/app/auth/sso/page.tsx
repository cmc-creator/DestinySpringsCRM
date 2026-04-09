"use client";

import { Suspense, useEffect, useRef } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";

export default function SsoPage() {
  return (
    <Suspense fallback={
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh" }}>
        <p>Signing you in&hellip;</p>
      </div>
    }>
      <SsoInner />
    </Suspense>
  );
}

function SsoInner() {
  const router        = useRouter();
  const searchParams  = useSearchParams();
  const called        = useRef(false);

  useEffect(() => {
    if (called.current) return;
    called.current = true;

    const t = searchParams.get("t");
    if (!t) {
      router.replace("/login?error=SsoTokenMissing");
      return;
    }

    signIn("sso-token", { token: t, redirect: false }).then((result) => {
      if (result?.error || !result?.ok) {
        router.replace("/login?error=OAuthNotLinked");
        return;
      }
      fetch("/api/auth/session")
        .then((r) => r.json())
        .then((session) => {
          const role = session?.user?.role as string | undefined;
          if (role === "REP") {
            router.replace("/rep/dashboard?sso_connected=1");
          } else if (role) {
            router.replace("/admin/dashboard?sso_connected=1");
          } else {
            router.replace("/login?error=OAuthNotLinked");
          }
        })
        .catch(() => router.replace("/admin/dashboard?sso_connected=1"));
    });
  }, [router, searchParams]);

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh" }}>
      <p>Signing you in&hellip;</p>
    </div>
  );
}

