import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSsoToken } from "@/lib/auth";

export const maxDuration = 30;

// GET /api/integrations/oauth/google/callback
// Handles the authorization code from Google OAuth and stores the token
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const code  = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");
  const appUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

  if (error || !code || !state) {
    const dest = state ? (() => {
      try {
        const d = JSON.parse(Buffer.from(state, "base64url").toString("utf-8"));
        return d.mode === "login" ? "login" : "admin/communications";
      } catch { return "admin/communications"; }
    })() : "admin/communications";
    return NextResponse.redirect(`${appUrl}/${dest}?oauth_error=Access+denied`);
  }

  let userId: string | null = null;
  let loginMode = false;
  try {
    const decoded = JSON.parse(Buffer.from(state, "base64url").toString("utf-8"));
    loginMode = decoded.mode === "login";
    if (!loginMode) {
      userId = decoded.userId;
      if (!userId) throw new Error("No userId in state");
    }
  } catch {
    return NextResponse.redirect(`${appUrl}/admin/communications?oauth_error=Invalid+state`);
  }

  const clientId     = process.env.GOOGLE_CLIENT_ID!;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET!;
  const redirectUri  = `${appUrl}/api/integrations/oauth/google/callback`;

  const tokenParams = new URLSearchParams({
    client_id:     clientId,
    client_secret: clientSecret,
    code,
    grant_type:    "authorization_code",
    redirect_uri:  redirectUri,
  });

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: tokenParams.toString(),
  });

  if (!tokenRes.ok) {
    console.error("Google token exchange failed:", await tokenRes.text());
    return NextResponse.redirect(`${appUrl}/admin/communications?oauth_error=Token+exchange+failed`);
  }

  const tokenData = await tokenRes.json();

  // Fetch the user's email from Google profile
  let email: string | null = null;
  let displayName: string | null = null;
  try {
    const profileRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    if (profileRes.ok) {
      const profile = await profileRes.json();
      email       = profile.email       ?? null;
      displayName = profile.name        ?? null;
    }
  } catch (e) {
    console.warn("Could not fetch Google profile:", e);
  }

  // ── Login mode: find user by email, create SSO session token ───────────────
  if (loginMode) {
    if (!email) {
      return NextResponse.redirect(`${appUrl}/login?error=Could+not+read+your+Google+email`);
    }
    const crmUser = await prisma.user.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
    });
    if (!crmUser) {
      const msg = encodeURIComponent(`No CRM account linked to ${email}. Contact your admin.`);
      return NextResponse.redirect(`${appUrl}/login?error=${msg}`);
    }
    await prisma.integrationToken.upsert({
      where:  { userId_provider: { userId: crmUser.id, provider: "google" } },
      create: { userId: crmUser.id, provider: "google", accessToken: tokenData.access_token, refreshToken: tokenData.refresh_token ?? null, expiresAt: tokenData.expires_in ? new Date(Date.now() + tokenData.expires_in * 1000) : null, scope: tokenData.scope ?? null, email, displayName },
      update: { accessToken: tokenData.access_token, refreshToken: tokenData.refresh_token ?? null, expiresAt: tokenData.expires_in ? new Date(Date.now() + tokenData.expires_in * 1000) : null, scope: tokenData.scope ?? null, email, displayName },
    });
    const ssoToken = createSsoToken(crmUser.id);
    return NextResponse.redirect(`${appUrl}/auth/sso?t=${encodeURIComponent(ssoToken)}`);
  }

  // ── Connect mode: upsert token for the already-logged-in user ────────────────
  await prisma.integrationToken.upsert({
    where: { userId_provider: { userId: userId!, provider: "google" } },
    create: {
      userId: userId!,
      provider:     "google",
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

  const user = await prisma.user.findUnique({ where: { id: userId! }, select: { role: true } });
  const base = user?.role === "REP" ? "/rep" : "/admin";

  return NextResponse.redirect(`${appUrl}${base}/communications?connected=google`);
}
