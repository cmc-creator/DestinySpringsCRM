import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

const BOOTSTRAP_EMAIL = "ccooper@destinysprings.com";
const BOOTSTRAP_NAME = "Connie Cooper";

/**
 * One-time admin bootstrap endpoint.
 * Creates the primary admin account if it doesn't already exist.
 *
 * Usage: GET /api/admin/bootstrap?secret=YOUR_BOOTSTRAP_SECRET
 *
 * Required env vars:
 *   BOOTSTRAP_SECRET   — a secret token you set in Vercel; call with ?secret=<value>
 *   BOOTSTRAP_PASSWORD — the initial password for the admin account (min 12 chars recommended)
 */
export async function GET(req: NextRequest) {
  const providedSecret = req.nextUrl.searchParams.get("secret");
  const expectedSecret = process.env.BOOTSTRAP_SECRET;

  if (!expectedSecret) {
    return NextResponse.json(
      { error: "BOOTSTRAP_SECRET env var is not set. Configure it in Vercel before calling this endpoint." },
      { status: 503 }
    );
  }

  if (!providedSecret || providedSecret !== expectedSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const initialPassword = process.env.BOOTSTRAP_PASSWORD;
  if (!initialPassword || initialPassword.length < 8) {
    return NextResponse.json(
      { error: "BOOTSTRAP_PASSWORD env var is missing or too short (minimum 8 characters)." },
      { status: 503 }
    );
  }

  try {
    const existing = await prisma.user.findUnique({
      where: { email: BOOTSTRAP_EMAIL },
      select: { id: true, email: true, role: true, createdAt: true },
    });

    const hashed = await bcrypt.hash(initialPassword, 12);

    if (existing) {
      // Fix the existing account: force ADMIN role and reset password to BOOTSTRAP_PASSWORD.
      const fixed = await prisma.user.update({
        where: { email: BOOTSTRAP_EMAIL },
        data: { role: "ADMIN", password: hashed },
        select: { id: true, email: true, role: true, createdAt: true },
      });
      console.log(`[bootstrap] Admin account fixed: ${fixed.email} (${fixed.id}) — role forced to ADMIN, password reset.`);
      return NextResponse.json({
        ok: true,
        message: "Admin account already existed — role forced to ADMIN and password reset to BOOTSTRAP_PASSWORD. Sign in now, then change your password in Settings.",
        user: fixed,
      });
    }

    const user = await prisma.user.create({
      data: {
        name: BOOTSTRAP_NAME,
        email: BOOTSTRAP_EMAIL,
        password: hashed,
        role: "ADMIN",
      },
      select: { id: true, email: true, role: true, createdAt: true },
    });

    console.log(`[bootstrap] Admin account created: ${user.email} (${user.id})`);

    return NextResponse.json({
      ok: true,
      message: "Admin account created successfully. Sign in at /login with your bootstrap password, then change it immediately in Settings.",
      user,
    });
  } catch (err) {
    console.error("[bootstrap] Error:", err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: "Failed to create admin account.", detail: message }, { status: 500 });
  }
}

/**
 * Provision any user account using the BOOTSTRAP_SECRET (no admin login required).
 *
 * POST /api/admin/bootstrap
 * Body: { secret, name, email, password, role: "ADMIN"|"REP"|"ACCOUNT", repTitle?, hospitalName? }
 *
 * Usage: create accounts for Shawn, Melissa, or any team member before the admin can log in.
 */
export async function POST(req: NextRequest) {
  try {
    const { secret, name, email, password, role = "REP", repTitle, hospitalName } = await req.json();

    const expectedSecret = process.env.BOOTSTRAP_SECRET;
    if (!expectedSecret || !secret || secret !== expectedSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!name || !email || !password) {
      return NextResponse.json({ error: "name, email, and password are required" }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    }

    const validRoles = ["ADMIN", "REP", "ACCOUNT"];
    if (!validRoles.includes(role)) {
      return NextResponse.json({ error: "Invalid role — must be ADMIN, REP, or ACCOUNT" }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
    if (existing) {
      return NextResponse.json({ ok: true, message: "Account already exists — no changes made.", user: { id: existing.id, email: existing.email, role: existing.role } });
    }

    const hashed = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: email.toLowerCase().trim(),
        password: hashed,
        role: role as "ADMIN" | "REP" | "ACCOUNT",
        ...(role === "REP"
          ? { rep: { create: { title: repTitle ?? "Business Development Representative", status: "ACTIVE" } } }
          : role === "ACCOUNT"
          ? { hospital: { create: { hospitalName: hospitalName ?? name.trim(), status: "ACTIVE" } } }
          : {}),
      },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    });

    console.log(`[bootstrap] User provisioned: ${user.email} (${user.role})`);
    return NextResponse.json({ ok: true, message: `Account created for ${user.name}. They can now sign in at /login.`, user }, { status: 201 });
  } catch (err) {
    console.error("[bootstrap] POST Error:", err);
    if (err && typeof err === "object" && "code" in err && (err as { code: string }).code === "P2002") {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    }
    return NextResponse.json({ error: "Failed to create user", detail: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
