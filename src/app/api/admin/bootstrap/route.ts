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

    if (existing) {
      return NextResponse.json({
        ok: true,
        message: "Admin account already exists — no changes made.",
        user: existing,
      });
    }

    const hashed = await bcrypt.hash(initialPassword, 12);

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
