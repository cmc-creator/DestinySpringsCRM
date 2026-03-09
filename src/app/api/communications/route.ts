import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const maxDuration = 30;

// GET /api/communications — list logs for current user
export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const logs = await prisma.communicationLog.findMany({
    where: { fromUserId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return NextResponse.json(logs);
}

// POST /api/communications — save a draft or internal note (no send)
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const log = await prisma.communicationLog.create({
      data: {
        fromUserId: session.user.id,
        toEmail:      body.toEmail     ?? null,
        toName:       body.toName      ?? null,
        subject:      body.subject     ?? null,
        body:         body.body        ?? "",
        channel:      body.channel     ?? "INTERNAL",
        status:       body.status      ?? "DRAFT",
        hospitalId:   body.hospitalId  ?? null,
        leadId:       body.leadId      ?? null,
        opportunityId: body.opportunityId ?? null,
        contactId:    body.contactId   ?? null,
        templateId:   body.templateId  ?? null,
      },
    });
    return NextResponse.json(log, { status: 201 });
  } catch (e) {
    console.error("Communication create error:", e);
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }
}
