import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const maxDuration = 15;

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const resource = searchParams.get("resource") ?? undefined;
  const source = searchParams.get("source") ?? undefined;
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const limit = 50;

  const where = {
    ...(resource ? { resource } : {}),
    ...(source ? { diff: { path: ["_meta", "source"], equals: source } } : {}),
  };

  const logs = await prisma.auditLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit,
    skip: (page - 1) * limit,
  });

  const total = await prisma.auditLog.count({ where });

  return NextResponse.json({ logs, total, page });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const log = await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        userEmail: session.user.email ?? undefined,
        userName: session.user.name ?? undefined,
        action: body.action,
        resource: body.resource,
        resourceId: body.resourceId ?? undefined,
        diff: body.diff ?? undefined,
        ip: req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip") ?? undefined,
      },
    });
    return NextResponse.json(log, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to log audit event" }, { status: 500 });
  }
}
