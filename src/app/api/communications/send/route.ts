import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const maxDuration = 60;

// POST /api/communications/send
// Sends a message via the specified provider, then logs it
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const { toEmail, toName, subject, body: messageBody, channel, teamsWebhook,
            hospitalId, leadId, opportunityId, contactId, templateId,
            ccEmails, bccEmails, scheduledAt } = body;

    // If scheduled for the future, save as SCHEDULED and return without sending
    if (scheduledAt && new Date(scheduledAt) > new Date()) {
      const log = await prisma.communicationLog.create({
        data: {
          fromUserId:    session.user.id,
          toEmail:       toEmail   ?? null,
          toName:        toName    ?? null,
          subject:       subject   ?? null,
          body:          messageBody,
          channel:       channel   ?? "INTERNAL",
          status:        "SCHEDULED",
          scheduledAt:   new Date(scheduledAt),
          hospitalId:    hospitalId    ?? null,
          leadId:        leadId        ?? null,
          opportunityId: opportunityId ?? null,
          contactId:     contactId     ?? null,
          templateId:    templateId    ?? null,
        },
      });
      return NextResponse.json({ success: true, scheduled: true, log }, { status: 201 });
    }

    if (!messageBody) {
      return NextResponse.json({ error: "Message body is required" }, { status: 400 });
    }

    let externalId: string | null = null;
    let status: "SENT" | "FAILED" | "DRAFT" = "SENT";
    let errorMsg: string | null = null;

    // ── Send via channel ──────────────────────────────────────────────────────
    if (channel === "OUTLOOK") {
      // ── Microsoft Graph — send email ───────────────────────────────────────
      const token = await prisma.integrationToken.findUnique({
        where: { userId_provider: { userId: session.user.id, provider: "microsoft" } },
      });
      if (!token) {
        return NextResponse.json({ error: "Microsoft account not connected" }, { status: 400 });
      }

      const accessToken = await refreshMicrosoftTokenIfNeeded(token, session.user.id);
      if (!accessToken) {
        return NextResponse.json({ error: "Failed to refresh Microsoft token" }, { status: 400 });
      }

      const graphRes = await fetch("https://graph.microsoft.com/v1.0/me/sendMail", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: {
            subject: subject ?? "(No subject)",
            body: { contentType: "HTML", content: messageBody.replace(/\n/g, "<br>") },
            toRecipients: [{ emailAddress: { address: toEmail, name: toName ?? toEmail } }],
            ccRecipients:  (ccEmails  as string[] | undefined ?? []).filter(Boolean).map((e: string) => ({ emailAddress: { address: e } })),
            bccRecipients: (bccEmails as string[] | undefined ?? []).filter(Boolean).map((e: string) => ({ emailAddress: { address: e } })),
          },
          saveToSentItems: true,
        }),
      });

      if (!graphRes.ok) {
        const err = await graphRes.json().catch(() => ({}));
        console.error("Graph sendMail error:", err);
        status = "FAILED";
        errorMsg = err?.error?.message ?? "Microsoft Graph error";
      } else {
        externalId = graphRes.headers.get("request-id") ?? null;
      }

    } else if (channel === "GMAIL") {
      // ── Gmail API — send email ─────────────────────────────────────────────
      const token = await prisma.integrationToken.findUnique({
        where: { userId_provider: { userId: session.user.id, provider: "google" } },
      });
      if (!token) {
        return NextResponse.json({ error: "Google account not connected" }, { status: 400 });
      }

      const accessToken = await refreshGoogleTokenIfNeeded(token, session.user.id);
      if (!accessToken) {
        return NextResponse.json({ error: "Failed to refresh Google token" }, { status: 400 });
      }

      // Build RFC 2822 message
      const mimeMsg = [
        `To: ${toName ? `${toName} <${toEmail}>` : toEmail}`,
        `Subject: ${subject ?? "(No subject)"}`,
        "MIME-Version: 1.0",
        "Content-Type: text/plain; charset=utf-8",
        "",
        messageBody,
      ].join("\r\n");

      const encoded = Buffer.from(mimeMsg).toString("base64url");

      const gmailRes = await fetch(
        "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ raw: encoded }),
        }
      );

      if (!gmailRes.ok) {
        const err = await gmailRes.json().catch(() => ({}));
        console.error("Gmail send error:", err);
        status = "FAILED";
        errorMsg = err?.error?.message ?? "Gmail API error";
      } else {
        const result = await gmailRes.json();
        externalId = result?.id ?? null;
      }

    } else if (channel === "TEAMS") {
      // ── Teams Incoming Webhook ─────────────────────────────────────────────
      const webhookUrl = teamsWebhook ?? (await prisma.integrationToken.findUnique({
        where: { userId_provider: { userId: session.user.id, provider: "microsoft" } },
        select: { teamsWebhook: true },
      }))?.teamsWebhook;

      if (!webhookUrl) {
        return NextResponse.json({ error: "No Teams webhook URL configured" }, { status: 400 });
      }

      const teamsRes = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          "@type": "MessageCard",
          "@context": "https://schema.org/extensions",
          summary: subject ?? "NyxAegis Message",
          themeColor: "C9A84C",
          title: subject ?? "Message from NyxAegis",
          text: messageBody,
          ...(toEmail ? { sections: [{ text: `**To:** ${toName ?? toEmail}` }] } : {}),
        }),
      });

      if (!teamsRes.ok) {
        status = "FAILED";
        errorMsg = "Teams webhook delivery failed";
      }

    } else {
      // INTERNAL — no external send
      status = "SENT";
    }

    // ── Log the communication ─────────────────────────────────────────────────
    const log = await prisma.communicationLog.create({
      data: {
        fromUserId: session.user.id,
        toEmail:      toEmail      ?? null,
        toName:       toName       ?? null,
        subject:      subject      ?? null,
        body:         messageBody,
        channel:      channel      ?? "INTERNAL",
        status,
        externalId,
        sentAt:       status === "SENT" ? new Date() : null,
        hospitalId:   hospitalId   ?? null,
        leadId:       leadId       ?? null,
        opportunityId: opportunityId ?? null,
        contactId:    contactId    ?? null,
        templateId:   templateId   ?? null,
      },
    });

    if (status === "FAILED") {
      return NextResponse.json({ error: errorMsg, log }, { status: 502 });
    }

    return NextResponse.json({ success: true, log }, { status: 201 });
  } catch (e) {
    console.error("Send communication error:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ── Token refresh helpers ──────────────────────────────────────────────────────

async function refreshMicrosoftTokenIfNeeded(
  token: { accessToken: string; refreshToken: string | null; expiresAt: Date | null; id: string },
  userId: string
): Promise<string | null> {
  const now = new Date();
  // If token not expired (with 1 min buffer), use as-is
  if (token.expiresAt && token.expiresAt > new Date(now.getTime() + 60_000)) {
    return token.accessToken;
  }
  if (!token.refreshToken) return null;

  const clientId     = process.env.MICROSOFT_CLIENT_ID!;
  const clientSecret = process.env.MICROSOFT_CLIENT_SECRET!;
  const redirectUri  = `${process.env.NEXTAUTH_URL}/api/integrations/oauth/microsoft/callback`;

  const params = new URLSearchParams({
    client_id:     clientId,
    client_secret: clientSecret,
    refresh_token: token.refreshToken,
    grant_type:    "refresh_token",
    redirect_uri:  redirectUri,
  });

  const res = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  if (!res.ok) return null;
  const data = await res.json();

  await prisma.integrationToken.update({
    where: { userId_provider: { userId, provider: "microsoft" } },
    data: {
      accessToken:  data.access_token,
      refreshToken: data.refresh_token ?? token.refreshToken,
      expiresAt:    data.expires_in ? new Date(Date.now() + data.expires_in * 1000) : null,
    },
  });

  return data.access_token;
}

async function refreshGoogleTokenIfNeeded(
  token: { accessToken: string; refreshToken: string | null; expiresAt: Date | null; id: string },
  userId: string
): Promise<string | null> {
  const now = new Date();
  if (token.expiresAt && token.expiresAt > new Date(now.getTime() + 60_000)) {
    return token.accessToken;
  }
  if (!token.refreshToken) return null;

  const clientId     = process.env.GOOGLE_CLIENT_ID!;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET!;

  const params = new URLSearchParams({
    client_id:     clientId,
    client_secret: clientSecret,
    refresh_token: token.refreshToken,
    grant_type:    "refresh_token",
  });

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  if (!res.ok) return null;
  const data = await res.json();

  await prisma.integrationToken.update({
    where: { userId_provider: { userId, provider: "google" } },
    data: {
      accessToken:  data.access_token,
      refreshToken: data.refresh_token ?? token.refreshToken,
      expiresAt:    data.expires_in ? new Date(Date.now() + data.expires_in * 1000) : null,
    },
  });

  return data.access_token;
}
