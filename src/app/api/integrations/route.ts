export const maxDuration = 30;

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const configs = await prisma.integrationConfig.findMany({
    orderBy: { name: "asc" },
    include: {
      imports: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { createdAt: true, imported: true, errors: true, method: true },
      },
    },
  });

  return NextResponse.json(configs);
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, enabled } = await req.json();
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const updated = await prisma.integrationConfig.update({
    where: { id },
    data: { enabled: !!enabled },
  });

  return NextResponse.json(updated);
}
