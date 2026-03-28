import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const maxDuration = 30;

function normalizeIds(values: unknown): string[] {
  if (!Array.isArray(values)) return [];
  return [...new Set(values.filter((value): value is string => typeof value === "string").map((value) => value.trim()).filter(Boolean))];
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await req.json()) as { ids?: unknown };
    const ids = normalizeIds(body.ids);
    if (ids.length === 0) {
      return NextResponse.json({ error: "At least one user id is required" }, { status: 400 });
    }

    const deleted: string[] = [];
    const failed: { id: string; reason: string }[] = [];
    const skipped: string[] = [];

    for (const id of ids) {
      if (id === session.user.id) {
        skipped.push(id);
        continue;
      }

      try {
        await prisma.user.delete({ where: { id } });
        deleted.push(id);
      } catch (err) {
        failed.push({
          id,
          reason: err instanceof Error ? err.message : "Delete failed",
        });
      }
    }

    return NextResponse.json({
      ok: true,
      deletedCount: deleted.length,
      deleted,
      failedCount: failed.length,
      failed,
      skippedCount: skipped.length,
      skipped,
    });
  } catch (err) {
    console.error("[admin/users/bulk-delete POST]", err);
    return NextResponse.json({ error: "Failed to delete selected users" }, { status: 500 });
  }
}