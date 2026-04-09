import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Resend } from "resend";
import crypto from "crypto";

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let userId: string;
  try {
    const body = await req.json();
    userId = (body.userId ?? "").trim();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  if (!userId) {
    return NextResponse.json({ error: "userId required" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, email: true, name: true } });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Invalidate any previous unused tokens for this user
  await prisma.passwordResetToken.updateMany({
    where: { userId: user.id, usedAt: null },
    data: { usedAt: new Date() },
  });

  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours for invite links

  await prisma.passwordResetToken.create({
    data: { userId: user.id, token, expiresAt },
  });

  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const inviteUrl = `${baseUrl}/reset-password?token=${token}`;

  const resendKey = process.env.RESEND_API_KEY;
  if (resendKey) {
    const resend = new Resend(resendKey);
    const fromEmail = process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev";
    await resend.emails.send({
      from: `Destiny Springs CRM <${fromEmail}>`,
      to: user.email,
      subject: "You've been invited to Destiny Springs CRM",
      html: `
        <div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:28px;border:1px solid #e5e7eb;border-radius:10px;">
          <h2 style="margin:0 0 12px;color:#1e293b;font-size:1.2rem;">Welcome to Destiny Springs CRM</h2>
          <p style="color:#475569;margin:0 0 8px;font-size:0.95rem;">
            Hi ${user.name ?? user.email},
          </p>
          <p style="color:#475569;margin:0 0 20px;font-size:0.95rem;">
            Your account has been set up. Click the button below to set your password and get started.
            This link expires in <strong>24 hours</strong>.
          </p>
          <a href="${inviteUrl}"
            style="display:inline-block;background:#c9a84c;color:#1a1208;padding:12px 28px;border-radius:8px;font-weight:700;text-decoration:none;font-size:0.95rem;letter-spacing:0.5px;">
            Set My Password
          </a>
          <p style="margin:20px 0 0;font-size:0.8rem;color:#94a3b8;">
            If you weren't expecting this, you can safely ignore it.<br>
            Or copy this link: <a href="${inviteUrl}" style="color:#94a3b8;">${inviteUrl}</a>
          </p>
        </div>
      `,
    });
    return NextResponse.json({ ok: true, sent: true });
  }

  // Email not configured — return the link so admin can share it manually
  return NextResponse.json({ ok: true, sent: false, inviteUrl });
}
