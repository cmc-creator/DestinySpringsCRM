import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const maxDuration = 30;

function normalizeEmails(values: string[]): string[] {
  return [...new Set(values.map((value) => value.toLowerCase().trim()).filter(Boolean))];
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await req.json()) as { keepEmails?: string[]; dryRun?: boolean };
    const requestedKeep = Array.isArray(body.keepEmails) ? body.keepEmails : [];
    const keepEmails = normalizeEmails([
      ...requestedKeep,
      session.user.email ?? "",
    ]);

    if (keepEmails.length === 0) {
      return NextResponse.json({ error: "At least one keep email is required." }, { status: 400 });
    }

    const usersToRemove = await prisma.user.findMany({
      where: {
        email: { notIn: keepEmails },
        id: { not: session.user.id },
      },
      select: { id: true, email: true },
    });

    if (body.dryRun) {
      return NextResponse.json({
        ok: true,
        dryRun: true,
        keepEmails,
        wouldDeleteCount: usersToRemove.length,
        wouldDeleteEmails: usersToRemove.map((user) => user.email),
      });
    }

    const deleted: string[] = [];
    const failed: { email: string; reason: string }[] = [];

    for (const user of usersToRemove) {
      try {
        await prisma.user.delete({ where: { id: user.id } });
        deleted.push(user.email);
      } catch (err) {
        failed.push({
          email: user.email,
          reason: err instanceof Error ? err.message : "Delete failed",
        });
      }
    }

    return NextResponse.json({
      ok: true,
      keepEmails,
      deletedCount: deleted.length,
      deletedEmails: deleted,
      failedCount: failed.length,
      failed,
    });
  } catch (err) {
    console.error("[admin/users/prune POST]", err);
    return NextResponse.json({ error: "Failed to prune users" }, { status: 500 });
  }
}
