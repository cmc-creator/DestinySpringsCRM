import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const maxDuration = 30;

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

// GET /api/communications/inbox
// Fetches Outlook inbox messages for the authenticated user
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const folder = searchParams.get("folder") ?? "Inbox";
  const search = searchParams.get("search") ?? "";
  const skip   = parseInt(searchParams.get("skip") ?? "0");

  const accessToken = await getValidMicrosoftToken(session.user.id);
  if (!accessToken) return NextResponse.json({ error: "Microsoft not connected" }, { status: 400 });

  const select = "$select=id,subject,from,toRecipients,ccRecipients,receivedDateTime,bodyPreview,isRead,conversationId,hasAttachments";
  let url: string;
  if (search) {
    // $search and $orderby cannot coexist in Graph
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

  const msgData   = await msgRes.json() as { value: unknown[] };
  const folderData = folderRes.ok
    ? await folderRes.json() as { unreadItemCount: number; totalItemCount: number }
    : null;

  return NextResponse.json({
    messages:    msgData.value,
    unreadCount: folderData?.unreadItemCount ?? 0,
    totalCount:  folderData?.totalItemCount  ?? 0,
  });
}

// PATCH /api/communications/inbox — mark message as read
export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { messageId } = await req.json() as { messageId: string };
  if (!messageId) return NextResponse.json({ error: "messageId required" }, { status: 400 });

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
