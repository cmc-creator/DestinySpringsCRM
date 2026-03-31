import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Resend } from "resend";
import crypto from "crypto";

export const maxDuration = 30;

const RATE_LIMIT_MS = 60_000; // 1 request per email per minute

export async function POST(req: NextRequest) {
  let email: string;
  try {
    const body = await req.json();
    email = (body.email ?? "").trim().toLowerCase();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Valid email required" }, { status: 400 });
  }

  // Always return a generic success — never reveal whether the email exists
  const user = await prisma.user.findUnique({ where: { email } });

  if (user) {
    // Rate-limit: don't allow a new token if a non-expired, non-used one was created recently (within 1 min)
    const recent = await prisma.passwordResetToken.findFirst({
      where: {
        userId: user.id,
        usedAt: null,
        expiresAt: { gt: new Date() },
        createdAt: { gt: new Date(Date.now() - RATE_LIMIT_MS) },
      },
    });

    if (!recent) {
      // Invalidate any previous unused tokens for this user
      await prisma.passwordResetToken.updateMany({
        where: { userId: user.id, usedAt: null },
        data: { usedAt: new Date() }, // mark as used so they can't be replayed
      });

      const token = crypto.randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await prisma.passwordResetToken.create({
        data: { userId: user.id, token, expiresAt },
      });

      const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
      const resetUrl = `${baseUrl}/reset-password?token=${token}`;

      const resendKey = process.env.RESEND_API_KEY;
      if (resendKey) {
        const resend = new Resend(resendKey);
        const fromEmail = process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev";
        resend.emails.send({
          from: `Destiny Springs CRM <${fromEmail}>`,
          to: user.email,
          subject: "Reset your password",
          html: `
            <div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:28px;border:1px solid #e5e7eb;border-radius:10px;">
              <h2 style="margin:0 0 12px;color:#1e293b;font-size:1.2rem;">Reset Your Password</h2>
              <p style="color:#475569;margin:0 0 20px;font-size:0.95rem;">
                You requested a password reset for your Destiny Springs CRM account.
                Click the button below — this link expires in <strong>1 hour</strong>.
              </p>
              <a href="${resetUrl}"
                style="display:inline-block;background:#c9a84c;color:#1a1208;padding:12px 28px;border-radius:8px;font-weight:700;text-decoration:none;font-size:0.95rem;letter-spacing:0.5px;">
                Reset Password
              </a>
              <p style="margin:20px 0 0;font-size:0.8rem;color:#94a3b8;">
                If you didn't request this, you can safely ignore this email.<br>
                Or copy this link: <a href="${resetUrl}" style="color:#94a3b8;">${resetUrl}</a>
              </p>
            </div>
          `,
        }).catch((e: unknown) => console.error("[forgot-password] email failed:", e));
      } else {
        // Dev fallback - never log reset tokens or URLs
        console.log(`[forgot-password] Reset requested for ${email}; email provider not configured`);
      }
    }
  }

  // Generic response — never reveal whether the email is registered
  return NextResponse.json({ ok: true });
}
