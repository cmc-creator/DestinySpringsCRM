import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const maxDuration = 30;

type CalEvent = {
  id:         string;
  title:      string;
  start:      string;
  end:        string;
  location?:  string;
  organizer?: string;
  url?:       string;
  provider:   "microsoft" | "google";
  isAllDay:   boolean;
};

async function refreshMicrosoftToken(userId: string, token: { accessToken: string; refreshToken: string | null; expiresAt: Date | null }): Promise<string | null> {
  const needsRefresh = token.expiresAt && token.expiresAt.getTime() - Date.now() < 5 * 60 * 1000;
  if (!needsRefresh) return token.accessToken;
  if (!token.refreshToken) return null;
  const params = new URLSearchParams({
    client_id:     process.env.MICROSOFT_CLIENT_ID ?? "",
    client_secret: process.env.MICROSOFT_CLIENT_SECRET ?? "",
    refresh_token: token.refreshToken,
    grant_type:    "refresh_token",
    scope:         "Calendars.ReadWrite offline_access",
  });
  const res = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });
  if (!res.ok) return null;
  const data = await res.json() as { access_token: string; expires_in: number };
  await prisma.integrationToken.update({
    where: { userId_provider: { userId, provider: "microsoft" } },
    data: { accessToken: data.access_token, expiresAt: new Date(Date.now() + data.expires_in * 1000) },
  });
  return data.access_token;
}

async function refreshGoogleToken(userId: string, token: { accessToken: string; refreshToken: string | null; expiresAt: Date | null }): Promise<string | null> {
  const needsRefresh = token.expiresAt && token.expiresAt.getTime() - Date.now() < 5 * 60 * 1000;
  if (!needsRefresh) return token.accessToken;
  if (!token.refreshToken) return null;
  const params = new URLSearchParams({
    client_id:     process.env.GOOGLE_CLIENT_ID ?? "",
    client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    refresh_token: token.refreshToken,
    grant_type:    "refresh_token",
  });
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });
  if (!res.ok) return null;
  const data = await res.json() as { access_token: string; expires_in: number };
  await prisma.integrationToken.update({
    where: { userId_provider: { userId, provider: "google" } },
    data: { accessToken: data.access_token, expiresAt: new Date(Date.now() + data.expires_in * 1000) },
  });
  return data.access_token;
}

// GET /api/calendar/events?from=ISO&to=ISO
// Returns external calendar events (Outlook + Google) for the given range
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from") ?? new Date().toISOString();
  const to   = searchParams.get("to")   ?? new Date(Date.now() + 30 * 86_400_000).toISOString();

  const events: CalEvent[] = [];

  // ── Microsoft Outlook Calendar ────────────────────────────────────────────
  const msToken = await prisma.integrationToken.findUnique({
    where: { userId_provider: { userId: session.user.id, provider: "microsoft" } },
  });
  if (msToken) {
    const accessToken = await refreshMicrosoftToken(session.user.id, msToken);
    if (accessToken) {
      const url =
        `https://graph.microsoft.com/v1.0/me/calendarview` +
        `?startDateTime=${from}&endDateTime=${to}` +
        `&$select=id,subject,start,end,location,organizer,webLink,isAllDay` +
        `&$top=200&$orderby=start/dateTime`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}`, Prefer: 'outlook.timezone="UTC"' },
      });
      if (res.ok) {
        const data = await res.json() as {
          value: Array<{
            id: string;
            subject: string;
            start: { dateTime: string };
            end:   { dateTime: string };
            location?: { displayName?: string };
            organizer?: { emailAddress?: { name?: string } };
            webLink?: string;
            isAllDay?: boolean;
          }>;
        };
        for (const e of (data.value ?? [])) {
          events.push({
            id:        e.id,
            title:     e.subject ?? "(No title)",
            start:     e.start.dateTime,
            end:       e.end.dateTime,
            location:  e.location?.displayName,
            organizer: e.organizer?.emailAddress?.name,
            url:       e.webLink,
            provider:  "microsoft",
            isAllDay:  e.isAllDay ?? false,
          });
        }
      }
    }
  }

  // ── Google Calendar ───────────────────────────────────────────────────────
  const gToken = await prisma.integrationToken.findUnique({
    where: { userId_provider: { userId: session.user.id, provider: "google" } },
  });
  if (gToken) {
    const accessToken = await refreshGoogleToken(session.user.id, gToken);
    if (accessToken) {
      const url =
        `https://www.googleapis.com/calendar/v3/calendars/primary/events` +
        `?timeMin=${from}&timeMax=${to}&singleEvents=true&orderBy=startTime&maxResults=200` +
        `&fields=items(id,summary,start,end,location,organizer,htmlLink)`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
      if (res.ok) {
        const data = await res.json() as {
          items: Array<{
            id: string;
            summary?: string;
            start: { dateTime?: string; date?: string };
            end:   { dateTime?: string; date?: string };
            location?: string;
            organizer?: { displayName?: string };
            htmlLink?: string;
          }>;
        };
        for (const e of (data.items ?? [])) {
          const isAllDay = !e.start.dateTime;
          events.push({
            id:        e.id,
            title:     e.summary ?? "(No title)",
            start:     e.start.dateTime ?? (e.start.date + "T00:00:00Z"),
            end:       e.end.dateTime   ?? (e.end.date   + "T00:00:00Z"),
            location:  e.location,
            organizer: e.organizer?.displayName,
            url:       e.htmlLink,
            provider:  "google",
            isAllDay,
          });
        }
      }
    }
  }

  events.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
  return NextResponse.json(events);
}
