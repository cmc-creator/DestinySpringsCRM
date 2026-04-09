import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";

export const maxDuration = 120;

type SyncResult = {
  ok: boolean;
  status: number;
  payload: unknown;
};

function safeCompare(a: string, b: string): boolean {
  const len = Math.max(a.length, b.length);
  const bufA = Buffer.alloc(len);
  const bufB = Buffer.alloc(len);
  Buffer.from(a).copy(bufA);
  Buffer.from(b).copy(bufB);
  return timingSafeEqual(bufA, bufB) && a.length === b.length;
}

async function runSync(req: NextRequest, path: string): Promise<SyncResult> {
  const cronSecret = process.env.CRON_SECRET ?? "";
  const response = await fetch(`${req.nextUrl.origin}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${cronSecret}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    payload = { error: "Non-JSON response from sync route" };
  }

  return {
    ok: response.ok,
    status: response.status,
    payload,
  };
}

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
  }

  const authHeader = req.headers.get("authorization") ?? "";
  if (!safeCompare(authHeader, `Bearer ${cronSecret}`)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [intake, discharge, bedboard] = await Promise.all([
    runSync(req, "/api/referrals/intake/m365/sync"),
    runSync(req, "/api/referrals/discharge/sync"),
    runSync(req, "/api/integrations/sharepoint/bedboard-sync"),
  ]);

  const ok = intake.ok && discharge.ok && bedboard.ok;
  return NextResponse.json(
    {
      ok,
      ranAt: new Date().toISOString(),
      intake,
      discharge,
      bedboard,
    },
    { status: ok ? 200 : 207 },
  );
}
