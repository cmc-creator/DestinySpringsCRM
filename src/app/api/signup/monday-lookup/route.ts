import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 20;

// Public endpoint — no auth required (called from public signup page)
// Uses server-side env vars only, never exposes Monday API key to client.
//
// Required env vars:
//   MONDAY_API_KEY        — your Monday.com API v2 key
//   MONDAY_BD_BOARD_ID    — board ID of your BD rep board (comma-separated for multiple)

const MONDAY_API = "https://api.monday.com/v2";

type MondayItem = {
  id: string;
  name: string;
  column_values: { id: string; text: string; type: string }[];
};

async function searchBoardForEmail(
  apiKey: string,
  boardId: string,
  email: string,
): Promise<{ name: string; title: string; phone: string; territory: string } | null> {
  const query = `{
    boards(ids: [${boardId}]) {
      items_page(limit: 500) {
        items {
          id
          name
          column_values { id text type }
        }
      }
    }
  }`;

  const res = await fetch(MONDAY_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: apiKey,
    },
    body: JSON.stringify({ query }),
  });

  if (!res.ok) return null;
  const json = await res.json() as { data?: { boards?: { items_page?: { items?: MondayItem[] } }[] } };
  const items = json.data?.boards?.[0]?.items_page?.items ?? [];

  const needle = email.toLowerCase().trim();

  for (const item of items) {
    // Check if any column value looks like the target email
    const emailMatch = item.column_values.some(
      (col) =>
        (col.type === "email" || col.id.includes("email") || col.id.includes("mail")) &&
        col.text.toLowerCase().includes(needle),
    );
    // Also check item name if it resembles the email local part
    const nameMatch = item.name.toLowerCase().includes(needle.split("@")[0]);

    if (emailMatch || nameMatch) {
      return {
        name:      item.name.trim(),
        title:     item.column_values.find((c) => c.id.includes("title") || c.id.includes("role") || c.id.includes("job"))?.text?.trim() ?? "",
        phone:     item.column_values.find((c) => c.type === "phone" || c.id.includes("phone"))?.text?.trim() ?? "",
        territory: item.column_values.find((c) => c.id.includes("territ") || c.id.includes("region") || c.id.includes("area"))?.text?.trim() ?? "",
      };
    }
  }

  return null;
}

export async function GET(req: NextRequest) {
  const apiKey  = process.env.MONDAY_API_KEY ?? "";
  const boardIds = (process.env.MONDAY_BD_BOARD_ID ?? "").split(",").map((s) => s.trim()).filter(Boolean);

  // Return feature flag so the signup form knows whether to show the lookup button
  if (!apiKey || boardIds.length === 0) {
    return NextResponse.json({ available: false });
  }

  const { searchParams } = req.nextUrl;
  const email = (searchParams.get("email") ?? "").trim();

  // No email param = just checking availability
  if (!email) {
    return NextResponse.json({ available: true });
  }

  // Basic email format guard
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ available: true, found: false });
  }

  for (const boardId of boardIds) {
    try {
      const profile = await searchBoardForEmail(apiKey, boardId, email);
      if (profile) {
        return NextResponse.json({ available: true, found: true, profile });
      }
    } catch {
      // Board lookup failed — continue to next board
    }
  }

  return NextResponse.json({ available: true, found: false });
}
