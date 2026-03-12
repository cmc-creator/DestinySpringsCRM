import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export const maxDuration = 10;

// GET /api/integrations/oauth/google
// Redirects the user to Google OAuth consent screen
export async function GET(_req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const clientId    = process.env.GOOGLE_CLIENT_ID;
  const appUrl      = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const redirectUri = `${appUrl}/api/integrations/oauth/google/callback`;

  if (!clientId) {
    return NextResponse.json({ error: "GOOGLE_CLIENT_ID not configured" }, { status: 500 });
  }

  const state = Buffer.from(JSON.stringify({ userId: session.user.id })).toString("base64url");

  const scopes = [
    "openid",
    "email",
    "profile",
    "https://www.googleapis.com/auth/gmail.send",
    "https://www.googleapis.com/auth/gmail.compose",
    "https://www.googleapis.com/auth/calendar.events",
  ].join(" ");

  const params = new URLSearchParams({
    client_id:    clientId,
    response_type: "code",
    redirect_uri: redirectUri,
    scope:        scopes,
    state,
    access_type:  "offline", // request refresh_token
    prompt:       "consent", // ensure refresh_token is always returned
  });

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
  return NextResponse.redirect(authUrl);
}
