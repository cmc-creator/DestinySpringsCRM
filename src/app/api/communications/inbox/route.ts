import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const maxDuration = 30;

// ── Microsoft token refresh ───────────────────────────────────────────────────
async function getValidMicrosoftToken(userId: string): Promise<string | null> {
  const token = await prisma.integrationToken.findUnique({
    where: { userId_provider: { userId, provider: "microsoft" } },
  });
  if (!token) return null;

  const needsRefresh = token.expiresAt && token.expiresAt.getTime() - Date.now() < 5 * 60 * 1000;
  if (!needsRefresh) return token.accessToken;
  if (!token.refreshToken) return null;

  const params = new URLSearchParams({
    client_id:     process.env.MICROSOFT_CLIENT_ID ?? "",
    client_secret: process.env.MICROSOFT_CLIENT_SECRET ?? "",
    refresh_token: token.refreshToken,
    grant_type:    "refresh_token",
    scope:         "Mail.ReadWrite offline_access",
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

// ── Google token refresh ──────────────────────────────────────────────────────
async function getValidGoogleToken(userId: string): Promise<string | null> {
  const token = await prisma.integrationToken.findUnique({
    where: { userId_provider: { userId, provider: "google" } },
  });
  if (!token) return null;

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

// ── Parse "Display Name <email@domain>" header values ────────────────────────
function parseEmail(str: string): { name: string; address: string } {
  const m = str.match(/^(.*?)\s*<([^>]+)>$/);
  return m ? { name: m[1].trim(), address: m[2].trim() } : { name: str.trim(), address: str.trim() };
}

// ── GET /api/communications/inbox ────────────────────────────────────────────
// provider=microsoft (default) | google
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const provider = searchParams.get("provider") ?? "microsoft";
  const search   = searchParams.get("search") ?? "";
  const skip     = parseInt(searchParams.get("skip") ?? "0");

  // ── Google / Gmail path ───────────────────────────────────────────────────
  if (provider === "google") {
    const accessToken = await getValidGoogleToken(session.user.id);
    if (!accessToken) return NextResponse.json({ error: "Google not connected" }, { status: 400 });

    const q = search ? encodeURIComponent(`in:inbox ${search}`) : "in%3Ainbox";
    const listRes = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=30&q=${q}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (!listRes.ok) {
      const err = await listRes.text();
      return NextResponse.json({ error: `Gmail error: ${err}` }, { status: listRes.status });
    }

    type GmailListItem = { id: string; threadId: string };
    const listData = await listRes.json() as { messages?: GmailListItem[] };
    const msgIds = listData.messages ?? [];

    // Fetch message metadata + unread count in parallel
    type GmailMsg = {
      id: string; threadId: string; labelIds?: string[]; snippet: string; internalDate: string;
      payload: { headers: Array<{ name: string; value: string }> };
    };
    const [labelRes, ...msgResults] = await Promise.all([
      fetch("https://gmail.googleapis.com/gmail/v1/users/me/labels/INBOX",
        { headers: { Authorization: `Bearer ${accessToken}` } }),
      ...msgIds.map(({ id }) =>
        fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}` +
          `?format=metadata&metadataHeaders=Subject&metadataHeaders=From` +
          `&metadataHeaders=To&metadataHeaders=Cc`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        )
      ),
    ]);

    const labelData = labelRes.ok
      ? await labelRes.json() as { messagesUnread: number; messagesTotal: number }
      : null;

    const messages = await Promise.all(
      msgResults.map(async (res) => {
        if (!res.ok) return null;
        const m = await res.json() as GmailMsg;
        const hdr = (name: string) => m.payload.headers.find(h => h.name === name)?.value ?? "";
        const from = parseEmail(hdr("From"));
        const toStr = hdr("To");
        const ccStr = hdr("Cc");
        return {
          id:               m.id,
          subject:          hdr("Subject") || null,
          from:             { emailAddress: from },
          toRecipients:     toStr ? toStr.split(",").map(s => ({ emailAddress: parseEmail(s.trim()) })) : [],
          ccRecipients:     ccStr ? ccStr.split(",").map(s => ({ emailAddress: parseEmail(s.trim()) })) : [],
          receivedDateTime: new Date(parseInt(m.internalDate)).toISOString(),
          bodyPreview:      m.snippet,
          isRead:           !(m.labelIds ?? []).includes("UNREAD"),
          conversationId:   m.threadId,
          hasAttachments:   false,
        };
      })
    );

    return NextResponse.json({
      messages:    messages.filter(Boolean),
      unreadCount: labelData?.messagesUnread ?? 0,
      totalCount:  labelData?.messagesTotal  ?? 0,
    });
  }

  // ── Microsoft / Outlook path ──────────────────────────────────────────────
  const folder = searchParams.get("folder") ?? "Inbox";
  const accessToken = await getValidMicrosoftToken(session.user.id);
  if (!accessToken) return NextResponse.json({ error: "Microsoft not connected" }, { status: 400 });

  const select = "$select=id,subject,from,toRecipients,ccRecipients,receivedDateTime,bodyPreview,isRead,conversationId,hasAttachments";
  let url: string;
  if (search) {
    url = `https://graph.microsoft.com/v1.0/me/mailFolders/${folder}/messages?${select}&$top=50&$search="${encodeURIComponent(search)}"`;
  } else {
    url = `https://graph.microsoft.com/v1.0/me/mailFolders/${folder}/messages?${select}&$top=50&$skip=${skip}&$orderby=receivedDateTime desc`;
  }

  const [msgRes, folderRes] = await Promise.all([
    fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } }),
    fetch(
      `https://graph.microsoft.com/v1.0/me/mailFolders/${folder}?$select=unreadItemCount,totalItemCount`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    ),
  ]);

  if (!msgRes.ok) {
    const err = await msgRes.text();
    return NextResponse.json({ error: `Graph error: ${err}` }, { status: msgRes.status });
  }

  const msgData    = await msgRes.json() as { value: unknown[] };
  const folderData = folderRes.ok
    ? await folderRes.json() as { unreadItemCount: number; totalItemCount: number }
    : null;

  return NextResponse.json({
    messages:    msgData.value,
    unreadCount: folderData?.unreadItemCount ?? 0,
    totalCount:  folderData?.totalItemCount  ?? 0,
  });
}

// ── PATCH /api/communications/inbox — mark message as read ───────────────────
export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { messageId, provider } = await req.json() as { messageId: string; provider?: string };
  if (!messageId) return NextResponse.json({ error: "messageId required" }, { status: 400 });

  if (provider === "google") {
    const accessToken = await getValidGoogleToken(session.user.id);
    if (!accessToken) return NextResponse.json({ error: "Google not connected" }, { status: 400 });

    const res = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/modify`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ removeLabelIds: ["UNREAD"] }),
      }
    );
    if (!res.ok) return NextResponse.json({ error: "Failed to mark as read" }, { status: res.status });
    return NextResponse.json({ ok: true });
  }

  // Microsoft
  const accessToken = await getValidMicrosoftToken(session.user.id);
  if (!accessToken) return NextResponse.json({ error: "Microsoft not connected" }, { status: 400 });

  const res = await fetch(`https://graph.microsoft.com/v1.0/me/messages/${messageId}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ isRead: true }),
  });

  if (!res.ok) return NextResponse.json({ error: "Failed to mark as read" }, { status: res.status });
  return NextResponse.json({ ok: true });
}
