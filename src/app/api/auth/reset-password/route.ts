import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export const maxDuration = 30;

const MIN_PASSWORD_LENGTH = 8;

export async function POST(req: NextRequest) {
  let token: string, newPassword: string;
  try {
    const body = await req.json();
    token = (body.token ?? "").trim();
    newPassword = body.password ?? "";
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  if (!token) {
    return NextResponse.json({ error: "Token required" }, { status: 400 });
  }

  if (!newPassword || newPassword.length < MIN_PASSWORD_LENGTH) {
    return NextResponse.json(
      { error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` },
      { status: 400 }
    );
  }

  // Look up the token — must be unused and not expired
  const record = await prisma.passwordResetToken.findUnique({ where: { token } });

  if (!record || record.usedAt !== null || record.expiresAt < new Date()) {
    return NextResponse.json(
      { error: "This reset link is invalid or has expired. Please request a new one." },
      { status: 400 }
    );
  }

  // Hash the new password and update the user atomically
  const hashed = await bcrypt.hash(newPassword, 12);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: record.userId },
      data: { password: hashed },
    }),
    prisma.passwordResetToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
