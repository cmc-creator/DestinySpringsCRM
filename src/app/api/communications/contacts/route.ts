import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type ContactResult = { name: string; email: string; source: string };

// GET /api/communications/contacts?q=...
// Returns contact suggestions from CRM + Microsoft Graph contacts
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const q = (new URL(req.url).searchParams.get("q") ?? "").trim();
  if (q.length < 2) return NextResponse.json([]);

  const results: ContactResult[] = [];
  const seen = new Set<string>();

  function add(name: string | null, email: string | null, source: string) {
    if (!email) return;
    const key = email.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    results.push({ name: name ?? email, email, source });
  }

  // Search CRM contacts
  const [crmContacts, hospitals] = await Promise.all([
    prisma.contact.findMany({
      where: {
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { email: { contains: q, mode: "insensitive" } },
        ],
      },
      select: { name: true, email: true },
      take: 10,
    }),
    prisma.hospital.findMany({
      where: {
        OR: [
          { hospitalName:          { contains: q, mode: "insensitive" } },
          { primaryContactEmail:   { contains: q, mode: "insensitive" } },
          { primaryContactName:    { contains: q, mode: "insensitive" } },
        ],
      },
      select: { hospitalName: true, primaryContactName: true, primaryContactEmail: true },
      take: 8,
    }),
  ]);

  crmContacts.forEach(c  => add(c.name, c.email, "CRM"));
  hospitals.forEach(h    => add(h.primaryContactName ?? h.hospitalName, h.primaryContactEmail, "Account"));

  // Microsoft Graph contacts (use cached token — no refresh, best effort)
  const token = await prisma.integrationToken.findUnique({
    where: { userId_provider: { userId: session.user.id, provider: "microsoft" } },
    select: { accessToken: true, expiresAt: true },
  });
  if (token && (!token.expiresAt || token.expiresAt.getTime() > Date.now())) {
    try {
      const url = `https://graph.microsoft.com/v1.0/me/contacts?$search="${encodeURIComponent(q)}"&$select=displayName,emailAddresses&$top=10`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token.accessToken}` } });
      if (res.ok) {
        const data = await res.json() as {
          value: Array<{ displayName: string; emailAddresses: Array<{ address: string }> }>;
        };
        (data.value ?? []).forEach(c => {
          if (c.emailAddresses?.[0]?.address) {
            add(c.displayName, c.emailAddresses[0].address, "Outlook");
          }
        });
      }
    } catch {
      // best-effort — don't fail the whole request
    }
  }

  return NextResponse.json(results.slice(0, 15));
}
