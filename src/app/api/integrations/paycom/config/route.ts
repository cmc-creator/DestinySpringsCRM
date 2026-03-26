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
    where: { name_method: { name: "paycom", method: "MANUAL" } },
  });
  return NextResponse.json({
    enabled: config?.enabled ?? false,
    hasApiKey: !!(config as { apiKey?: string } | null)?.apiKey,
  });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json();
  const { apiKey, enabled } = body as { apiKey?: string; enabled?: boolean };

  const config = await prisma.integrationConfig.upsert({
    where: { name_method: { name: "paycom", method: "MANUAL" } },
    create: {
      name: "paycom",
      method: "MANUAL",
      enabled: enabled ?? true,
      secret: apiKey || null,
    },
    update: {
      ...(apiKey !== undefined ? { secret: apiKey || null } : {}),
      ...(enabled !== undefined ? { enabled } : {}),
    },
  });

  return NextResponse.json({ id: config.id, enabled: config.enabled });
}
