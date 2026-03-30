import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function normalizedName(v: string): string {
  return v.toLowerCase().replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
}

/** Try to find a matching hospital for a given candidate string. */
function matchHospital(
  candidate: string,
  hospitals: { id: string; hospitalName: string }[],
): string | undefined {
  const norm = normalizedName(candidate);
  if (!norm) return undefined;
  // 1. Exact
  const exact = hospitals.find((h) => normalizedName(h.hospitalName) === norm);
  if (exact) return exact.id;
  // 2. Contains
  const fuzzy = hospitals.find((h) => {
    const n = normalizedName(h.hospitalName);
    return n.includes(norm) || norm.includes(n);
  });
  if (fuzzy) return fuzzy.id;
  // 3. First-word (≥4 chars)
  const firstWord = norm.split(/\s+/)[0];
  if (firstWord.length >= 4) {
    const byWord = hospitals.find((h) => normalizedName(h.hospitalName).startsWith(firstWord));
    if (byWord) return byWord.id;
  }
  return undefined;
}

export async function POST() {
  const hospitals = await prisma.hospital.findMany({
    select: { id: true, hospitalName: true },
  });

  // Fetch all activities that have no account linked yet
  const unlinked = await prisma.activity.findMany({
    where: { hospitalId: null },
    select: { id: true, title: true, notes: true },
  });

  let matched = 0;
  const updates: { id: string; hospitalId: string }[] = [];

  for (const act of unlinked) {
    const title = act.title ?? "";

    // Build candidate list from the activity title.
    // Format 1: "Account Name - Activity Title"  → try the prefix
    // Format 2: "Activity Title"                  → try the whole title
    const candidates: string[] = [];

    const dashIdx = title.indexOf(" - ");
    if (dashIdx > 2 && dashIdx < 80) {
      candidates.push(title.slice(0, dashIdx).trim()); // prefix = account name
    }
    // Always try full title as a fallback (some titles ARE just the account name)
    candidates.push(title.trim());

    // Also try comma-separated segments in case the title has multiple accounts
    for (const seg of title.split(/[,;]+/)) {
      const clean = seg.replace(/\s*\([^)]*\)\s*$/, "").trim();
      if (clean && !candidates.includes(clean)) candidates.push(clean);
    }

    for (const candidate of candidates) {
      const hospitalId = matchHospital(candidate, hospitals);
      if (hospitalId) {
        updates.push({ id: act.id, hospitalId });
        matched++;
        break;
      }
    }
  }

  // Batch update in parallel (up to 50 at a time)
  const BATCH = 50;
  for (let i = 0; i < updates.length; i += BATCH) {
    await Promise.all(
      updates.slice(i, i + BATCH).map(({ id, hospitalId }) =>
        prisma.activity.update({ where: { id }, data: { hospitalId } })
      )
    );
  }

  return NextResponse.json({
    total: unlinked.length,
    linked: matched,
    skipped: unlinked.length - matched,
  });
}
