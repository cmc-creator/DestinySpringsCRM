export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const MONDAY_API = "https://api.monday.com/v2";

async function mondayGQL(apiKey: string, query: string, variables?: Record<string, unknown>) {
  const res = await fetch(MONDAY_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: apiKey,
    },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) throw new Error(`Monday API returned ${res.status}`);
  const json = await res.json();
  if (json.errors?.length) throw new Error(json.errors[0]?.message ?? "Monday API error");
  return json.data;
}

// Fetch all boards accessible by this API key
async function fetchBoards(apiKey: string) {
  const data = await mondayGQL(apiKey, `{ boards(limit: 100, order_by: used_at) { id name } }`);
  return (data.boards ?? []) as { id: string; name: string }[];
}

// Fetch columns for a specific board
async function fetchColumns(apiKey: string, boardId: string) {
  const data = await mondayGQL(apiKey, `{ boards(ids: [${boardId}]) { columns { id title } } }`);
  return (data.boards?.[0]?.columns ?? []) as { id: string; title: string }[];
}

// Fetch all items (rows) for a board — uses cursor pagination
async function fetchItems(apiKey: string, boardId: string): Promise<{ id: string; name: string; columnValues: { id: string; text: string }[] }[]> {
  const query = `
    query($boardId: [ID!], $cursor: String) {
      boards(ids: $boardId) {
        items_page(limit: 200, cursor: $cursor) {
          cursor
          items {
            id
            name
            column_values { id text }
          }
        }
      }
    }
  `;
  const all: { id: string; name: string; columnValues: { id: string; text: string }[] }[] = [];
  let cursor: string | null = null;

  for (let page = 0; page < 50; page++) {
    const data = await mondayGQL(apiKey, query, { boardId: [boardId], cursor });
    const page_data = data.boards?.[0]?.items_page;
    const items = (page_data?.items ?? []) as { id: string; name: string; column_values: { id: string; text: string }[] }[];
    for (const item of items) {
      all.push({ id: item.id, name: item.name, columnValues: item.column_values ?? [] });
    }
    cursor = page_data?.cursor ?? null;
    if (!cursor || items.length === 0) break;
  }
  return all;
}

function colVal(item: { columnValues: { id: string; text: string }[] }, colId: string): string {
  return item.columnValues.find((c) => c.id === colId)?.text?.trim() ?? "";
}

function safeDate(s: string): Date | undefined {
  if (!s) return undefined;
  const d = new Date(s);
  return isNaN(d.getTime()) ? undefined : d;
}

function safeDecimal(s: string): number | undefined {
  const n = parseFloat(s.replace(/[^0-9.-]/g, ""));
  return isNaN(n) ? undefined : n;
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const { action, apiKey, boardId, entityType, mapping } = body as {
    action: string; apiKey: string; boardId?: string;
    entityType?: "leads" | "accounts" | "opportunities";
    mapping?: Record<string, string>;
  };

  if (!apiKey || typeof apiKey !== "string") {
    return NextResponse.json({ error: "apiKey is required" }, { status: 400 });
  }

  // ── TEST CONNECTION ──────────────────────────────────────────────────────────
  if (action === "test") {
    try {
      const boards = await fetchBoards(apiKey);
      return NextResponse.json({ boards });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return NextResponse.json({ error: msg }, { status: 400 });
    }
  }

  // ── FETCH COLUMNS ────────────────────────────────────────────────────────────
  if (action === "columns") {
    if (!boardId) return NextResponse.json({ error: "boardId required" }, { status: 400 });
    try {
      const columns = await fetchColumns(apiKey, boardId);
      return NextResponse.json({ columns });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return NextResponse.json({ error: msg }, { status: 400 });
    }
  }

  // ── IMPORT ───────────────────────────────────────────────────────────────────
  if (action === "import") {
    if (!boardId) return NextResponse.json({ error: "boardId required" }, { status: 400 });
    if (!entityType) return NextResponse.json({ error: "entityType required" }, { status: 400 });
    const map = (mapping ?? {}) as Record<string, string>;

    let items: Awaited<ReturnType<typeof fetchItems>>;
    try {
      items = await fetchItems(apiKey, boardId);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return NextResponse.json({ error: `Failed to fetch board items: ${msg}` }, { status: 500 });
    }

    const importId = `mon-${Date.now()}`;
    let imported = 0, updated = 0, skipped = 0, errors = 0;
    const errorLog: string[] = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      try {
        if (entityType === "leads") {
          const hospitalName = map["hospitalName"] ? colVal(item, map["hospitalName"]) : item.name;
          if (!hospitalName) { skipped++; continue; }

          // Dedup: check by hospitalName + externalId (monday item id in notes)
          const existing = await prisma.lead.findFirst({
            where: { notes: { contains: `monday-id:${item.id}` } },
            select: { id: true },
          });
          if (existing) { skipped++; continue; }

          const noteBase = map["notes"] ? colVal(item, map["notes"]) : "";
          await prisma.lead.create({
            data: {
              hospitalName,
              contactName:     map["contactName"]     ? colVal(item, map["contactName"])     : undefined,
              contactEmail:    map["contactEmail"]     ? colVal(item, map["contactEmail"])    : undefined,
              state:           map["state"]            ? colVal(item, map["state"])           : undefined,
              city:            map["city"]             ? colVal(item, map["city"])            : undefined,
              serviceInterest: map["serviceInterest"]  ? colVal(item, map["serviceInterest"]) : undefined,
              notes:           `monday-id:${item.id}${noteBase ? ` | ${noteBase}` : ""}`,
              source:          "OTHER",
              status:          "NEW",
            },
          });
          imported++;

        } else if (entityType === "accounts") {
          const hospitalName = map["hospitalName"] ? colVal(item, map["hospitalName"]) : item.name;
          if (!hospitalName) { skipped++; continue; }

          const existing = await prisma.hospital.findFirst({
            where: { hospitalName: { equals: hospitalName, mode: "insensitive" } },
            select: { id: true },
          });

          if (existing) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await (prisma.hospital as any).update({
              where: { id: existing.id },
              data: {
                systemName: map["systemName"] ? colVal(item, map["systemName"]) || undefined : undefined,
                city:       map["city"]       ? colVal(item, map["city"]) || undefined       : undefined,
                state:      map["state"]      ? colVal(item, map["state"]) || undefined      : undefined,
                notes:      map["notes"]      ? colVal(item, map["notes"]) || undefined      : undefined,
              },
            });
            updated++;
          } else {
            // Hospitals require a User — we create a placeholder user
            const email = map["primaryContactEmail"] ? colVal(item, map["primaryContactEmail"]) : null;
            const userEmail = email || `monday-${item.id}@import.nyx`;
            let user = await prisma.user.findUnique({ where: { email: userEmail }, select: { id: true } });
            if (!user) {
              user = await prisma.user.create({
                data: { email: userEmail, name: hospitalName, role: "ACCOUNT" },
              });
            }
            const existingHosp = await prisma.hospital.findUnique({ where: { userId: user.id }, select: { id: true } });
            if (!existingHosp) {
              await prisma.hospital.create({
                data: {
                  userId:      user.id,
                  hospitalName,
                  systemName:  map["systemName"] ? colVal(item, map["systemName"]) || undefined : undefined,
                  city:        map["city"]       ? colVal(item, map["city"]) || undefined       : undefined,
                  state:       map["state"]      ? colVal(item, map["state"]) || undefined      : undefined,
                  primaryContactName:  map["primaryContactName"]  ? colVal(item, map["primaryContactName"])  || undefined : undefined,
                  primaryContactEmail: email || undefined,
                  primaryContactPhone: map["primaryContactPhone"] ? colVal(item, map["primaryContactPhone"]) || undefined : undefined,
                  notes:       map["notes"] ? colVal(item, map["notes"]) || undefined : undefined,
                  status:      "PROSPECT",
                },
              });
              imported++;
            } else { skipped++; }
          }

        } else if (entityType === "opportunities") {
          const title        = map["title"]        ? colVal(item, map["title"])        : item.name;
          const hospitalName = map["hospitalName"] ? colVal(item, map["hospitalName"]) : "";
          if (!title || !hospitalName) { skipped++; continue; }

          const hospital = await prisma.hospital.findFirst({
            where: { hospitalName: { equals: hospitalName, mode: "insensitive" } },
            select: { id: true },
          });
          if (!hospital) {
            errors++;
            errorLog.push(`Item "${title}": no matching hospital found for "${hospitalName}"`);
            continue;
          }

          const valueStr   = map["value"]     ? colVal(item, map["value"])     : "";
          const closeStr   = map["closeDate"] ? colVal(item, map["closeDate"]) : "";
          const notesStr   = map["notes"]     ? colVal(item, map["notes"])     : "";

          // Dedup by title + hospitalId
          const existing = await prisma.opportunity.findFirst({
            where: { title: { equals: title, mode: "insensitive" }, hospitalId: hospital.id },
            select: { id: true },
          });
          if (existing) { skipped++; continue; }

          await prisma.opportunity.create({
            data: {
              title,
              hospitalId: hospital.id,
              stage:      "DISCOVERY",
              serviceLine: "OTHER",
              value:       safeDecimal(valueStr) ?? undefined,
              closeDate:   safeDate(closeStr),
              notes:       notesStr || undefined,
            },
          });
          imported++;
        }
      } catch (err) {
        errors++;
        const msg = err instanceof Error ? err.message : String(err);
        errorLog.push(`Item "${item.name}": ${msg}`);
      }
    }

    return NextResponse.json({ importId, totalRows: items.length, imported, updated, skipped, errors, errorLog });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
