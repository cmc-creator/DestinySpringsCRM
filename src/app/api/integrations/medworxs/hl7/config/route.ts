export const maxDuration = 30;

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const config = await prisma.integrationConfig.findUnique({
    where: { name_method: { name: "medworxs", method: "HL7" } },
  });
  return NextResponse.json({
    enabled: config?.enabled ?? false,
    hasSecret: !!config?.secret,
  });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json();
  const { secret, enabled } = body as { secret?: string; enabled?: boolean };

  const config = await prisma.integrationConfig.upsert({
    where: { name_method: { name: "medworxs", method: "HL7" } },
    create: {
      name: "medworxs",
      method: "HL7",
      enabled: enabled ?? true,
      secret: secret || null,
    },
    update: {
      ...(secret !== undefined ? { secret: secret || null } : {}),
      ...(enabled !== undefined ? { enabled } : {}),
    },
  });

  return NextResponse.json({ id: config.id, enabled: config.enabled });
}
