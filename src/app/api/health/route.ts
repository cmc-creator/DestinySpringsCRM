import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (process.env.NODE_ENV === "production") {
    const expectedToken = process.env.HEALTH_TOKEN;
    const providedToken =
      request.headers.get("x-health-token") ??
      new URL(request.url).searchParams.get("token");

    if (!expectedToken || !providedToken || providedToken !== expectedToken) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
  }

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
  } catch {
    dbStatus = "ERROR: database query failed";
  }

  const ok = dbStatus === "connected" && checks.DATABASE_URL === "SET" && checks.AUTH_SECRET === "SET";

  return NextResponse.json({ ok, env: checks, db: dbStatus, userCount }, { status: ok ? 200 : 500 });
}
