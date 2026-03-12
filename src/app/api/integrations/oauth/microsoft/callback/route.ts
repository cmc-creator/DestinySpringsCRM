import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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
    return NextResponse.redirect(`${appUrl}/admin/communications?oauth_error=${encodeURIComponent(desc)}`);
  }

  // Decode state to extract userId (CSRF: verifying the state was issued by us)
  let userId: string;
  try {
    const decoded = JSON.parse(Buffer.from(state, "base64url").toString("utf-8"));
    userId = decoded.userId;
    if (!userId) throw new Error("No userId in state");
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

  // Upsert the token record for this user+provider
  await prisma.integrationToken.upsert({
    where: { userId_provider: { userId, provider: "microsoft" } },
    create: {
      userId,
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

  // Detect which portal to redirect to based on user role
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  const base = user?.role === "REP" ? "/rep" : "/admin";

  return NextResponse.redirect(`${appUrl}${base}/communications?connected=microsoft`);
}
