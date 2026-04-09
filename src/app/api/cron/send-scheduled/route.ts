import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { prisma } from "@/lib/prisma";

export const maxDuration = 60;

function safeCompare(a: string, b: string): boolean {
  const len = Math.max(a.length, b.length);
  const bufA = Buffer.alloc(len);
  const bufB = Buffer.alloc(len);
  Buffer.from(a).copy(bufA);
  Buffer.from(b).copy(bufB);
  return timingSafeEqual(bufA, bufB) && a.length === b.length;
}

async function refreshMicrosoftToken(userId: string, token: { accessToken: string; refreshToken: string | null; expiresAt: Date | null }): Promise<string | null> {
  const needsRefresh = token.expiresAt && token.expiresAt.getTime() - Date.now() < 60 * 1000;
  if (!needsRefresh) return token.accessToken;
  if (!token.refreshToken) return null;
  const params = new URLSearchParams({
    client_id:     process.env.MICROSOFT_CLIENT_ID ?? "",
    client_secret: process.env.MICROSOFT_CLIENT_SECRET ?? "",
    refresh_token: token.refreshToken,
    grant_type:    "refresh_token",
    scope:         "Mail.Send offline_access",
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
  const needsRefresh = token.expiresAt && token.expiresAt.getTime() - Date.now() < 60 * 1000;
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

// GET /api/cron/send-scheduled
// Processes CommunicationLogs with status=SCHEDULED whose scheduledAt has passed
export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });

  const authHeader = req.headers.get("authorization") ?? "";
  if (!safeCompare(authHeader, `Bearer ${cronSecret}`)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const due = await prisma.communicationLog.findMany({
    where: { status: "SCHEDULED", scheduledAt: { lte: new Date() } },
    take: 50,
  });

  if (due.length === 0) return NextResponse.json({ ok: true, sent: 0 });

  let sent = 0;
  let failed = 0;

  for (const log of due) {
    try {
      let status: "SENT" | "FAILED" = "SENT";

      if (log.channel === "OUTLOOK") {
        const token = await prisma.integrationToken.findUnique({
          where: { userId_provider: { userId: log.fromUserId, provider: "microsoft" } },
        });
        if (!token) { status = "FAILED"; }
        else {
          const accessToken = await refreshMicrosoftToken(log.fromUserId, token);
          if (!accessToken) { status = "FAILED"; }
          else {
            const graphRes = await fetch("https://graph.microsoft.com/v1.0/me/sendMail", {
              method: "POST",
              headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
              body: JSON.stringify({
                message: {
                  subject: log.subject ?? "(No subject)",
                  body: { contentType: "HTML", content: log.body.replace(/\n/g, "<br>") },
                  toRecipients: log.toEmail
                    ? [{ emailAddress: { address: log.toEmail, name: log.toName ?? log.toEmail } }]
                    : [],
                },
                saveToSentItems: true,
              }),
            });
            if (!graphRes.ok) status = "FAILED";
          }
        }

      } else if (log.channel === "GMAIL") {
        const token = await prisma.integrationToken.findUnique({
          where: { userId_provider: { userId: log.fromUserId, provider: "google" } },
        });
        if (!token) { status = "FAILED"; }
        else {
          const accessToken = await refreshGoogleToken(log.fromUserId, token);
          if (!accessToken) { status = "FAILED"; }
          else {
            const mimeMsg = [
              `To: ${log.toName ? `${log.toName} <${log.toEmail}>` : log.toEmail}`,
              `Subject: ${log.subject ?? "(No subject)"}`,
              "MIME-Version: 1.0",
              "Content-Type: text/plain; charset=utf-8",
              "",
              log.body,
            ].join("\r\n");
            const encoded = Buffer.from(mimeMsg).toString("base64url");
            const gmailRes = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
              method: "POST",
              headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
              body: JSON.stringify({ raw: encoded }),
            });
            if (!gmailRes.ok) status = "FAILED";
          }
        }

      } else if (log.channel === "TEAMS") {
        const token = await prisma.integrationToken.findUnique({
          where: { userId_provider: { userId: log.fromUserId, provider: "microsoft" } },
          select: { teamsWebhook: true },
        });
        if (!token?.teamsWebhook) { status = "FAILED"; }
        else {
          const teamsRes = await fetch(token.teamsWebhook, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              "@type": "MessageCard",
              "@context": "https://schema.org/extensions",
              summary: log.subject ?? "Scheduled message",
              title:   log.subject ?? "Scheduled message from NyxAegis",
              text:    log.body,
            }),
          });
          if (!teamsRes.ok) status = "FAILED";
        }

      }
      // INTERNAL: just mark as SENT

      await prisma.communicationLog.update({
        where: { id: log.id },
        data: { status, sentAt: status === "SENT" ? new Date() : null },
      });

      if (status === "SENT") sent++;
      else failed++;

    } catch {
      failed++;
      await prisma.communicationLog.update({
        where: { id: log.id },
        data: { status: "FAILED" },
      }).catch(() => null);
    }
  }

  return NextResponse.json({ ok: true, sent, failed, total: due.length });
}
