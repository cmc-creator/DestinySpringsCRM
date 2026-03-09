import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const maxDuration = 30;

// GET /api/communications/templates
export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const templates = await prisma.communicationTemplate.findMany({
    where: {
      OR: [
        { isGlobal: true },
        { createdById: session.user.id },
      ],
    },
    orderBy: { category: "asc" },
  });
  return NextResponse.json(templates);
}

// POST /api/communications/templates
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const template = await prisma.communicationTemplate.create({
      data: {
        name:        body.name     ?? "Untitled Template",
        subject:     body.subject  ?? null,
        body:        body.body     ?? "",
        category:    body.category ?? "OTHER",
        isGlobal:    false,
        createdById: session.user.id,
      },
    });
    return NextResponse.json(template, { status: 201 });
  } catch (e) {
    console.error("Template create error:", e);
    return NextResponse.json({ error: "Failed to create template" }, { status: 500 });
  }
}
