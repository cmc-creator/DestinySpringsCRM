import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const checks: Record<string, string> = {
    DATABASE_URL: process.env.DATABASE_URL ? "SET" : "MISSING",
    AUTH_SECRET:  process.env.AUTH_SECRET  ? "SET" : "MISSING",
    NEXTAUTH_URL: process.env.NEXTAUTH_URL ? "SET" : "MISSING",
  };

  let dbStatus = "untested";
  let userCount = 0;
  try {
    userCount = await prisma.user.count();
    dbStatus = "connected";
  } catch (err) {
    dbStatus = `ERROR: ${err instanceof Error ? err.message : String(err)}`;
  }

  const ok = dbStatus === "connected" && checks.DATABASE_URL === "SET" && checks.AUTH_SECRET === "SET";

  return NextResponse.json({ ok, env: checks, db: dbStatus, userCount }, { status: ok ? 200 : 500 });
}
