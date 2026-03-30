import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { firstLoginAt: true, onboardedAt: true },
  });

  if (!user?.firstLoginAt) {
    return NextResponse.json({
      firstLoginAt: null,
      onboardedAt: user?.onboardedAt?.toISOString() ?? null,
      shouldShowWelcome: false,
    });
  }

  if (user.onboardedAt) {
    return NextResponse.json({
      firstLoginAt: user.firstLoginAt.toISOString(),
      onboardedAt: user.onboardedAt.toISOString(),
      shouldShowWelcome: false,
    });
  }

  // Atomically claim the one-time welcome on first eligible login.
  const claim = await prisma.user.updateMany({
    where: {
      id: session.user.id,
      firstLoginAt: { not: null },
      onboardedAt: null,
    },
    data: { onboardedAt: new Date() },
  });

  return NextResponse.json({
    firstLoginAt: user.firstLoginAt.toISOString(),
    onboardedAt: null,
    shouldShowWelcome: claim.count === 1,
  });
}

export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null) as { markOnboarded?: boolean } | null;
  if (!body?.markOnboarded) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data: { onboardedAt: new Date() },
    select: { firstLoginAt: true, onboardedAt: true },
  });

  return NextResponse.json({
    firstLoginAt: user.firstLoginAt?.toISOString() ?? null,
    onboardedAt: user.onboardedAt?.toISOString() ?? null,
    shouldShowWelcome: false,
  });
}
