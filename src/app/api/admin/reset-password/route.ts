import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

/**
 * Emergency password reset for the admin account.
 * Usage: GET /api/admin/reset-password?secret=YOUR_BOOTSTRAP_SECRET&password=NewPassword123
 */
export async function GET(req: NextRequest) {
  const secret   = req.nextUrl.searchParams.get("secret");
  const password = req.nextUrl.searchParams.get("password");

  const expectedSecret = process.env.BOOTSTRAP_SECRET;

  if (!expectedSecret || !secret || secret !== expectedSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!password || password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  }

  const hashed = await bcrypt.hash(password, 12);

  await prisma.user.update({
    where: { email: "ccooper@destinysprings.com" },
    data: { password: hashed },
  });

  return NextResponse.json({ ok: true, message: "Password updated. You can now log in." });
}
