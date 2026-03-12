import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export interface CalendarEventInput {
  title: string;
  description?: string;
  start: string; // ISO 8601
  end: string;   // ISO 8601
  location?: string;
  attendees?: string[]; // email addresses
  provider?: "microsoft" | "google"; // defaults to whichever is connected
}

// ─── Token refresh ────────────────────────────────────────────────────────────

async function refreshMicrosoftToken(refreshToken: string): Promise<{ access_token: string; expires_in: number } | null> {
  const params = new URLSearchParams({
    client_id:     process.env.MICROSOFT_CLIENT_ID ?? "",
    client_secret: process.env.MICROSOFT_CLIENT_SECRET ?? "",
    refresh_token: refreshToken,
    grant_type:    "refresh_token",
    scope:         "Calendars.ReadWrite offline_access",
  });
  const res = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });
  if (!res.ok) return null;
  return res.json() as Promise<{ access_token: string; expires_in: number }>;
}

async function refreshGoogleToken(refreshToken: string): Promise<{ access_token: string; expires_in: number } | null> {
  const params = new URLSearchParams({
    client_id:     process.env.GOOGLE_CLIENT_ID ?? "",
    client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    refresh_token: refreshToken,
    grant_type:    "refresh_token",
  });
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });
  if (!res.ok) return null;
  return res.json() as Promise<{ access_token: string; expires_in: number }>;
}

async function getValidToken(userId: string, provider: "microsoft" | "google"): Promise<string | null> {
  const token = await prisma.integrationToken.findUnique({ where: { userId_provider: { userId, provider } } });
  if (!token) return null;

  // Check if still valid (5 min buffer)
  const needsRefresh = token.expiresAt && token.expiresAt.getTime() - Date.now() < 5 * 60 * 1000;
  if (!needsRefresh) return token.accessToken;

  if (!token.refreshToken) return null;

  const refreshed =
    provider === "microsoft"
      ? await refreshMicrosoftToken(token.refreshToken)
      : await refreshGoogleToken(token.refreshToken);

  if (!refreshed) return null;

  const expiresAt = new Date(Date.now() + refreshed.expires_in * 1000);
  await prisma.integrationToken.update({
    where: { userId_provider: { userId, provider } },
    data: { accessToken: refreshed.access_token, expiresAt },
  });

  return refreshed.access_token;
}

// ─── Create calendar event ────────────────────────────────────────────────────

async function createMicrosoftEvent(accessToken: string, event: CalendarEventInput) {
  const body = {
    subject: event.title,
    body: { contentType: "text", content: event.description ?? "" },
    start:   { dateTime: event.start, timeZone: "UTC" },
    end:     { dateTime: event.end,   timeZone: "UTC" },
    location: event.location ? { displayName: event.location } : undefined,
    attendees: (event.attendees ?? []).map((email) => ({
      emailAddress: { address: email },
      type: "required",
    })),
  };

  const res = await fetch("https://graph.microsoft.com/v1.0/me/events", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Microsoft Calendar error: ${err}`);
  }

  const data = await res.json() as { id: string; webLink: string };
  return { id: data.id, url: data.webLink, provider: "microsoft" };
}

async function createGoogleEvent(accessToken: string, event: CalendarEventInput) {
  const body = {
    summary:      event.title,
    description:  event.description ?? "",
    location:     event.location ?? "",
    start: { dateTime: event.start, timeZone: "UTC" },
    end:   { dateTime: event.end,   timeZone: "UTC" },
    attendees: (event.attendees ?? []).map((email) => ({ email })),
  };

  const res = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events?sendUpdates=none", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Google Calendar error: ${err}`);
  }

  const data = await res.json() as { id: string; htmlLink: string };
  return { id: data.id, url: data.htmlLink, provider: "google" };
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  let session;
  try { session = await auth(); } catch { /* ignore */ }
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const input = await req.json() as CalendarEventInput;
  if (!input.title || !input.start || !input.end) {
    return NextResponse.json({ error: "title, start, and end are required" }, { status: 400 });
  }

  // Determine which provider to use
  const preferredProvider = input.provider;
  const providers: Array<"microsoft" | "google"> = preferredProvider
    ? [preferredProvider]
    : ["microsoft", "google"];

  for (const provider of providers) {
    const accessToken = await getValidToken(userId, provider);
    if (!accessToken) continue;

    try {
      const result =
        provider === "microsoft"
          ? await createMicrosoftEvent(accessToken, input)
          : await createGoogleEvent(accessToken, input);

      return NextResponse.json({ success: true, event: result });
    } catch (err) {
      console.error(`Calendar event creation failed for ${provider}:`, err);
    }
  }

  return NextResponse.json(
    { error: "No connected calendar found. Connect Outlook or Google Calendar in Integrations." },
    { status: 422 }
  );
}

// ─── GET: check if user has any calendar connected ───────────────────────────

export async function GET() {
  let session;
  try { session = await auth(); } catch { /* ignore */ }
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tokens = await prisma.integrationToken.findMany({
    where: { userId: session.user.id, provider: { in: ["microsoft", "google"] } },
    select: { provider: true, email: true, displayName: true, scope: true, expiresAt: true },
  });

  const connected = {
    microsoft: tokens.find((t: { provider: string }) => t.provider === "microsoft") ?? null,
    google:    tokens.find((t: { provider: string }) => t.provider === "google")     ?? null,
  };

  return NextResponse.json({ connected });
}
