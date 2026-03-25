import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export const maxDuration = 30;

// Basic email format validation — prevents obviously malformed inputs
function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Minimum password length
const MIN_PASSWORD_LENGTH = 8;

export async function POST(req: NextRequest) {
  try {
    const { name, email, password, role = "ACCOUNT", hospitalName, repTitle } = await req.json();

    if (!email || !password || !name) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (!isValidEmail(email)) {
      return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
    }

    if (typeof password !== "string" || password.length < MIN_PASSWORD_LENGTH) {
      return NextResponse.json({ error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` }, { status: 400 });
    }

    // Enforce name length to prevent abuse
    if (typeof name !== "string" || name.trim().length < 2 || name.length > 100) {
      return NextResponse.json({ error: "Name must be between 2 and 100 characters" }, { status: 400 });
    }

    // Only ACCOUNT and REP roles can self-register — ADMIN must be created directly
    const allowedRoles = ["ACCOUNT", "REP"];
    if (!allowedRoles.includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
    if (existing) {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    }

    const hashedPw = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: email.toLowerCase().trim(),
        password: hashedPw,
        role: role === "REP" ? "REP" : "ACCOUNT",
        ...(role === "REP" ? {
          rep: { create: { title: repTitle ?? "Behavioral Health Liaison", status: "PENDING_REVIEW" } },
        } : {
          hospital: { create: { hospitalName: hospitalName ?? name.trim(), status: "PROSPECT" } },
        }),
      },
    });

    return NextResponse.json({ id: user.id, email: user.email, role: user.role }, { status: 201 });
  } catch (err) {
    // Always log the real error server-side (visible in Vercel logs)
    console.error("[signup] Error:", err);

    // Handle known Prisma error codes
    if (err && typeof err === "object" && "code" in err) {
      const code = (err as { code: string }).code;
      if (code === "P2002") return NextResponse.json({ error: "Email already registered" }, { status: 409 });
      if (code === "P1001") return NextResponse.json({ error: "Cannot reach the database. Please try again in a moment." }, { status: 503 });
      if (code === "P1003") return NextResponse.json({ error: "Database setup is incomplete. Please contact support." }, { status: 503 });
    }

    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("database URL") || message.includes("DATABASE_URL")) {
      return NextResponse.json({ error: "Service is not configured. Please contact support." }, { status: 503 });
    }

    // In development, expose the real message to ease debugging
    if (process.env.NODE_ENV !== "production") {
      return NextResponse.json({ error: message }, { status: 500 });
    }

    return NextResponse.json({ error: "Server error. Please try again." }, { status: 500 });
  }
}
