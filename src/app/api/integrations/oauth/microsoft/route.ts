import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export const maxDuration = 10;

// GET /api/integrations/oauth/microsoft
// Redirects the user to Microsoft OAuth consent screen.
// ?mode=login  — called from the login page; no session required. Creates a CRM session after callback.
// (default)    — called from Communications; requires existing session to connect the integration.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode   = searchParams.get("mode");  // "login" | null
  const isLogin = mode === "login";

  const session = await auth();
  if (!isLogin && !session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const clientId   = process.env.MICROSOFT_CLIENT_ID;
  const appUrl     = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const redirectUri = `${appUrl}/api/integrations/oauth/microsoft/callback`;

  if (!clientId) {
    const msg = encodeURIComponent("Microsoft 365 is not configured. Add MICROSOFT_CLIENT_ID and MICROSOFT_CLIENT_SECRET to your Vercel environment variables, then redeploy.");
    const destination = isLogin ? `/login?error=${msg}` : `/admin/communications?oauth_error=${msg}`;
    return NextResponse.redirect(`${appUrl}${destination}`);
  }

  // Accept an optional returnTo param (must be a relative /admin or /rep path)
  const rawReturnTo = searchParams.get("returnTo") ?? "";
  const returnTo = /^\/(?:admin|rep)\//.test(rawReturnTo) ? rawReturnTo : null;

  // state encodes userId (connect mode) or mode=login flag (login mode)
  const statePayload = isLogin
    ? { mode: "login" }
    : { userId: session!.user.id, returnTo };
  const state = Buffer.from(JSON.stringify(statePayload)).toString("base64url");

  const scopes = [
    "openid",
    "email",
    "profile",
    "offline_access",
    "https://graph.microsoft.com/Mail.Send",
    "https://graph.microsoft.com/Mail.ReadWrite",
    "https://graph.microsoft.com/User.Read",
    "https://graph.microsoft.com/Calendars.ReadWrite",
    "https://graph.microsoft.com/Files.Read",
    "https://graph.microsoft.com/Sites.Read.All",
  ].join(" ");

  const params = new URLSearchParams({
    client_id:    clientId,
    response_type: "code",
    redirect_uri: redirectUri,
    scope:        scopes,
    state,
    response_mode: "query",
    prompt:       "select_account",
  });

  const authUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params}`;
  return NextResponse.redirect(authUrl);
}
