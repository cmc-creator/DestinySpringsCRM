import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

/**
 * Temporary auth diagnostic. Remove after login is confirmed working.
 * Usage: GET /api/admin/auth-test?secret=X&email=Y&password=Z
 */
export async function GET(req: NextRequest) {
  const secret   = req.nextUrl.searchParams.get("secret");
  const email    = req.nextUrl.searchParams.get("email");
  const password = req.nextUrl.searchParams.get("password");

  if (!secret || secret !== process.env.BOOTSTRAP_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!email || !password) {
    return NextResponse.json({ error: "email and password params required" }, { status: 400 });
  }

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return NextResponse.json({ step: "db_lookup", result: "no user found", email });
    if (!user.password) return NextResponse.json({ step: "db_lookup", result: "user has no password set", email });

    const match = await bcrypt.compare(password, user.password);
    return NextResponse.json({
      step: "bcrypt_compare",
      result: match ? "MATCH - credentials are correct" : "NO MATCH - wrong password",
      email: user.email,
      role: user.role,
      passwordHashPrefix: user.password.substring(0, 7),
    });
  } catch (err) {
    return NextResponse.json({ step: "error", detail: String(err) }, { status: 500 });
  }
}
