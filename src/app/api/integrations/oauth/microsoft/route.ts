import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export const maxDuration = 10;

// GET /api/integrations/oauth/microsoft
// Redirects the user to Microsoft OAuth consent screen
export async function GET(_req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const clientId   = process.env.MICROSOFT_CLIENT_ID;
  const appUrl     = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const redirectUri = `${appUrl}/api/integrations/oauth/microsoft/callback`;

  if (!clientId) {
    return NextResponse.json({ error: "MICROSOFT_CLIENT_ID not configured" }, { status: 500 });
  }

  // state encodes the userId for verification in the callback (CSRF-safe opaque token)
  const state = Buffer.from(JSON.stringify({ userId: session.user.id })).toString("base64url");

  const scopes = [
    "openid",
    "email",
    "profile",
    "offline_access",
    "https://graph.microsoft.com/Mail.Send",
    "https://graph.microsoft.com/Mail.ReadWrite",
    "https://graph.microsoft.com/User.Read",
    "https://graph.microsoft.com/Calendars.ReadWrite",
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
