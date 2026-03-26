export const maxDuration = 30;

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createHmac, timingSafeEqual } from "crypto";

// Verifies the HMAC-SHA256 signature iCANotes sends in the X-ICANotes-Signature header.
// Signature format: "sha256=<hex-digest>"
function verifySignature(payload: string, signature: string | null, secret: string): boolean {
  if (!signature) return false;
  const [algo, digest] = signature.split("=");
  if (algo !== "sha256" || !digest) return false;
  const expected = createHmac("sha256", secret).update(payload).digest("hex");
  try {
    return timingSafeEqual(Buffer.from(digest, "hex"), Buffer.from(expected, "hex"));
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  // Load shared webhook secret
  const config = await prisma.integrationConfig.findUnique({
    where: { name_method: { name: "icanotes", method: "CSV" } },
  });

  const rawBody = await req.text();

  // Verify signature if a secret is configured
  if (config?.secret) {
    const sig = req.headers.get("x-icanotes-signature");
    if (!verifySignature(rawBody, sig, config.secret)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const {
    eventType,
    referringProvider,
    referringNpi,
    patientInitials,
    referralDate,
    serviceRequested,
    diagnosis,
    authNumber,
    externalId,
  } = payload as Record<string, string | undefined>;

  // Only handle referral-related events
  if (eventType && !["REFERRAL_CREATED", "REFERRAL_UPDATED", "NEW_REFERRAL"].includes(eventType)) {
    return NextResponse.json({ received: true, action: "ignored" });
  }

  if (!referringProvider) {
    return NextResponse.json({ error: "referringProvider is required" }, { status: 400 });
  }

  // Dedup: skip if externalId already in DB
  if (externalId) {
    const existing = await prisma.lead.findFirst({
      where: { notes: { contains: `ICANotes-ID:${externalId}` } },
      select: { id: true },
    });
    if (existing) {
      return NextResponse.json({ received: true, action: "duplicate_skipped", id: existing.id });
    }
  }

  const notesParts: string[] = ["ICANotes webhook"];
  if (externalId)      notesParts.push(`ICANotes-ID:${externalId}`);
  if (referringNpi)    notesParts.push(`NPI:${referringNpi}`);
  if (authNumber)      notesParts.push(`Auth:${authNumber}`);
  if (diagnosis)       notesParts.push(`ICD-10:${diagnosis}`);
  if (patientInitials) notesParts.push(`Pt:${patientInitials}`);

  try {
    const lead = await prisma.lead.create({
      data: {
        hospitalName:    referringProvider,
        contactName:     referringProvider,
        source:          "REFERRAL",
        status:          "NEW",
        hospitalType:    "OUTPATIENT_PSYCHIATRY",
        serviceInterest: serviceRequested || undefined,
        notes:           notesParts.join(" | "),
        createdAt:       referralDate ? new Date(referralDate) : undefined,
      },
    });
    return NextResponse.json({ received: true, action: "created", id: lead.id });
  } catch (e) {
    console.error("iCANotes webhook lead create error:", e);
    return NextResponse.json({ error: "Failed to create lead" }, { status: 500 });
  }
}
