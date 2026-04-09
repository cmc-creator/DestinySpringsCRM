import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSsoToken } from "@/lib/auth";

export const maxDuration = 30;

// GET /api/integrations/oauth/microsoft/callback
// Handles the authorization code from Microsoft OIDC and stores the token
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const code  = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");
  const appUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

  if (error || !code || !state) {
    const desc = searchParams.get("error_description") ?? "Access denied";
    const dest = state ? (() => {
      try {
        const d = JSON.parse(Buffer.from(state, "base64url").toString("utf-8"));
        return d.mode === "login" ? "login" : "admin/communications";
      } catch { return "admin/communications"; }
    })() : "admin/communications";
    return NextResponse.redirect(`${appUrl}/${dest}?oauth_error=${encodeURIComponent(desc)}`);
  }

  // Decode state
  let userId: string | null = null;
  let loginMode = false;
  let returnTo: string | null = null;
  try {
    const decoded = JSON.parse(Buffer.from(state, "base64url").toString("utf-8"));
    loginMode = decoded.mode === "login";
    if (!loginMode) {
      userId = decoded.userId;
      if (!userId) throw new Error("No userId in state");
      // Validate returnTo to prevent open redirect
      const raw = decoded.returnTo ?? "";
      returnTo = /^\/(?:admin|rep)\//.test(raw) ? (raw as string) : null;
    }
  } catch {
    return NextResponse.redirect(`${appUrl}/admin/communications?oauth_error=Invalid+state`);
  }

  const clientId     = process.env.MICROSOFT_CLIENT_ID!;
  const clientSecret = process.env.MICROSOFT_CLIENT_SECRET!;
  const redirectUri  = `${appUrl}/api/integrations/oauth/microsoft/callback`;

  // Exchange code for tokens
  const tokenParams = new URLSearchParams({
    client_id:     clientId,
    client_secret: clientSecret,
    code,
    grant_type:    "authorization_code",
    redirect_uri:  redirectUri,
  });

  const tokenRes = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: tokenParams.toString(),
  });

  if (!tokenRes.ok) {
    console.error("Microsoft token exchange failed:", await tokenRes.text());
    return NextResponse.redirect(`${appUrl}/admin/communications?oauth_error=Token+exchange+failed`);
  }

  const tokenData = await tokenRes.json();

  // Fetch the user's email/display name from Graph
  let email: string | null = null;
  let displayName: string | null = null;
  try {
    const meRes = await fetch("https://graph.microsoft.com/v1.0/me?$select=mail,displayName,userPrincipalName", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    if (meRes.ok) {
      const me = await meRes.json();
      email       = me.mail ?? me.userPrincipalName ?? null;
      displayName = me.displayName ?? null;
    }
  } catch (e) {
    console.warn("Could not fetch Microsoft profile:", e);
  }

  // ── Login mode: find user by email, create SSO session token ───────────────
  if (loginMode) {
    if (!email) {
      return NextResponse.redirect(`${appUrl}/login?error=Could+not+read+your+Microsoft+email`);
    }
    const crmUser = await prisma.user.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
    });
    if (!crmUser) {
      const msg = encodeURIComponent(`No CRM account linked to ${email}. Contact your admin.`);
      return NextResponse.redirect(`${appUrl}/login?error=${msg}`);
    }
    // Save / refresh the integration token for this user
    await prisma.integrationToken.upsert({
      where:  { userId_provider: { userId: crmUser.id, provider: "microsoft" } },
      create: { userId: crmUser.id, provider: "microsoft", accessToken: tokenData.access_token, refreshToken: tokenData.refresh_token ?? null, expiresAt: tokenData.expires_in ? new Date(Date.now() + tokenData.expires_in * 1000) : null, scope: tokenData.scope ?? null, email, displayName },
      update: { accessToken: tokenData.access_token, refreshToken: tokenData.refresh_token ?? null, expiresAt: tokenData.expires_in ? new Date(Date.now() + tokenData.expires_in * 1000) : null, scope: tokenData.scope ?? null, email, displayName },
    });
    const ssoToken = createSsoToken(crmUser.id);
    return NextResponse.redirect(`${appUrl}/auth/sso?t=${encodeURIComponent(ssoToken)}`);
  }

  // ── Connect mode: upsert token for the already-logged-in user ────────────────
  // Upsert the token record for this user+provider
  await prisma.integrationToken.upsert({
    where: { userId_provider: { userId: userId!, provider: "microsoft" } },
    create: {
      userId: userId!,
      provider:     "microsoft",
      accessToken:  tokenData.access_token,
      refreshToken: tokenData.refresh_token ?? null,
      expiresAt:    tokenData.expires_in ? new Date(Date.now() + tokenData.expires_in * 1000) : null,
      scope:        tokenData.scope ?? null,
      email,
      displayName,
    },
    update: {
      accessToken:  tokenData.access_token,
      refreshToken: tokenData.refresh_token ?? null,
      expiresAt:    tokenData.expires_in ? new Date(Date.now() + tokenData.expires_in * 1000) : null,
      scope:        tokenData.scope ?? null,
      email,
      displayName,
    },
  });

  // Redirect: use returnTo if provided, otherwise fall back to communications hub
  const user = await prisma.user.findUnique({ where: { id: userId! }, select: { role: true } });
  const base = user?.role === "REP" ? "/rep" : "/admin";
  const destination = returnTo ?? `${base}/communications`;

  return NextResponse.redirect(`${appUrl}${destination}?connected=microsoft`);
}
