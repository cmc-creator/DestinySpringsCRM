import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { ids, action, value } = await req.json();

  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: "ids array required" }, { status: 400 });
  }
  if (!["status", "rep", "priority", "delete"].includes(action)) {
    return NextResponse.json({ error: "invalid action" }, { status: 400 });
  }

  if (action === "delete") {
    await prisma.lead.deleteMany({ where: { id: { in: ids } } });
    return NextResponse.json({ ok: true, deleted: ids.length });
  }

  if (action === "status") {
    if (!value) return NextResponse.json({ error: "value required for status action" }, { status: 400 });
    await prisma.lead.updateMany({ where: { id: { in: ids } }, data: { status: value } });
    return NextResponse.json({ ok: true, updated: ids.length });
  }

  if (action === "priority") {
    if (!value) return NextResponse.json({ error: "value required for priority action" }, { status: 400 });
    await prisma.lead.updateMany({ where: { id: { in: ids } }, data: { priority: value } });
    return NextResponse.json({ ok: true, updated: ids.length });
  }

  if (action === "rep") {
    // value="" means unassign
    await prisma.lead.updateMany({
      where: { id: { in: ids } },
      data: { assignedRepId: value || null },
    });
    return NextResponse.json({ ok: true, updated: ids.length });
  }

  return NextResponse.json({ error: "unknown action" }, { status: 400 });
}
