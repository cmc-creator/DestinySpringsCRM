import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const maxDuration = 10;

// GET /api/integrations/tokens — return connected providers for the current user
export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tokens = await prisma.integrationToken.findMany({
    where: { userId: session.user.id },
    select: {
      provider:     true,
      email:        true,
      displayName:  true,
      teamsWebhook: true,
      expiresAt:    true,
      updatedAt:    true,
    },
  });

  return NextResponse.json(tokens);
}

// PATCH /api/integrations/tokens — update Teams webhook URL or other metadata
export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const { provider, teamsWebhook } = body;

    if (!provider) {
      return NextResponse.json({ error: "provider required" }, { status: 400 });
    }

    const token = await prisma.integrationToken.upsert({
      where: { userId_provider: { userId: session.user.id, provider } },
      create: {
        userId:      session.user.id,
        provider,
        accessToken: "",           // placeholder; no real OAuth for webhook-only
        teamsWebhook: teamsWebhook ?? null,
      },
      update: {
        teamsWebhook: teamsWebhook ?? null,
      },
    });

    return NextResponse.json({ success: true, token });
  } catch (e) {
    console.error("Token patch error:", e);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}

// DELETE /api/integrations/tokens?provider=microsoft
export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const provider = req.nextUrl.searchParams.get("provider");
  if (!provider) return NextResponse.json({ error: "provider required" }, { status: 400 });

  try {
    await prisma.integrationToken.delete({
      where: { userId_provider: { userId: session.user.id, provider } },
    });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
