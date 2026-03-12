export const maxDuration = 30;

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// ---------------------------------------------------------------------------
// HL7 v2 ADT^A01 (Admit) listener for MedWorxs
//
// MedWorxs sends a raw HL7 v2 pipe-delimited message over HTTP POST.
// We parse it, extract the referring provider from PV1-8, match it to
// a ReferralSource, create a Referral record, and return an HL7 ACK.
//
// Authentication: shared secret via X-HL7-Secret header.
// The secret is stored in IntegrationConfig { name: "medworxs", method: "HL7" }.
// ---------------------------------------------------------------------------

interface HL7Segment { [field: number]: string }

function parseHL7(raw: string): Map<string, HL7Segment[]> {
  const segments = raw
    .replace(/\r\n/g, "\r")
    .replace(/\n/g, "\r")
    .split("\r")
    .filter((s) => s.trim().length > 0);

  const map = new Map<string, HL7Segment[]>();

  for (const seg of segments) {
    const fields = seg.split("|");
    const name = fields[0];
    const parsed: HL7Segment = {};
    for (let i = 0; i < fields.length; i++) {
      parsed[i] = fields[i] ?? "";
    }
    const arr = map.get(name) ?? [];
    arr.push(parsed);
    map.set(name, arr);
  }
  return map;
}

function buildACK(
  receivingApp: string,
  receivingFacility: string,
  msgControlId: string,
  ackCode: "AA" | "AE" | "AR",
  text: string,
): string {
  const now = new Date()
    .toISOString()
    .replace(/[-T:.Z]/g, "")
    .slice(0, 14);
  const ackId = `NACK${Date.now()}`;

  return [
    `MSH|^~\\&|NYXAEGIS|NYXAEGIS|${receivingApp}|${receivingFacility}|${now}||ACK^A01^ACK|${ackId}|P|2.5.1`,
    `MSA|${ackCode}|${msgControlId}|${text}`,
  ].join("\r");
}

export async function POST(req: NextRequest) {
  // 1. Authenticate via shared secret
  const incomingSecret = req.headers.get("x-hl7-secret") ?? "";

  const integration = await prisma.integrationConfig.findUnique({
    where: { name_method: { name: "medworxs", method: "HL7" } },
  });

  if (!integration?.enabled) {
    return new NextResponse(
      buildACK("MEDWORXS", "HOSPITAL", "UNKNOWN", "AE",
        "HL7 integration not enabled"),
      { status: 503, headers: { "Content-Type": "text/plain" } },
    );
  }

  if (integration.secret && integration.secret !== incomingSecret) {
    return new NextResponse(
      buildACK("MEDWORXS", "HOSPITAL", "UNKNOWN", "AR",
        "Authentication failed"),
      { status: 401, headers: { "Content-Type": "text/plain" } },
    );
  }

  // 2. Parse HL7 message
  const rawMessage = await req.text();
  const hl7 = parseHL7(rawMessage);

  const msh = hl7.get("MSH")?.[0];
  const pv1 = hl7.get("PV1")?.[0];

  if (!msh || !pv1) {
    return new NextResponse(
      buildACK("MEDWORXS", "HOSPITAL", msh?.[10] ?? "UNKNOWN", "AE",
        "Missing required segments: MSH or PV1"),
      { status: 400, headers: { "Content-Type": "text/plain" } },
    );
  }

  const msgControlId   = msh[10] ?? "UNKNOWN";
  const sendingApp     = msh[3] ?? "MEDWORXS";
  const sendingFacility= msh[4] ?? "HOSPITAL";

  // PV1 field 8 = Referring Doctor:
  // format: ID^LastName^FirstName^MI^Suffix^Prefix^...
  const pv1_8 = pv1[8] ?? "";
  const referrerParts  = pv1_8.split("^");
  const referrerNpi    = referrerParts[0]?.trim() || null;
  const referrerLast   = referrerParts[1]?.trim() || "";
  const referrerFirst  = referrerParts[2]?.trim() || "";
  const referrerName   = referrerLast
    ? `Dr. ${referrerFirst} ${referrerLast}`.trim()
    : null;

  if (!referrerName && !referrerNpi) {
    // No referring provider in message - still ACK but log nothing
    return new NextResponse(
      buildACK(sendingApp, sendingFacility, msgControlId, "AA",
        "Accepted - no referring provider in PV1-8, no referral logged"),
      { status: 200, headers: { "Content-Type": "text/plain" } },
    );
  }

  // PV1-44 = Admit date/time (YYYYMMDDHHMMSS)
  const admitRaw = pv1[44] ?? "";
  let admissionDate: Date | undefined;
  if (admitRaw.length >= 8) {
    const y = admitRaw.slice(0, 4);
    const m = admitRaw.slice(4, 6);
    const d = admitRaw.slice(6, 8);
    admissionDate = new Date(`${y}-${m}-${d}`);
  }

  // PID-3 = Patient ID list (use first component as external encounter ID)
  const pid      = hl7.get("PID")?.[0];
  const patientId= pid?.[3]?.split("^")?.[0]?.trim() || undefined;

  // PV1-10 = Hospital Service (service line)
  const serviceRaw = pv1[10]?.split("^")?.[0]?.trim() || undefined;

  // PID-5 = Patient Name - grab initials (LastName^FirstName)
  const pidName     = pid?.[5] ?? "";
  const nameParts   = pidName.split("^");
  const patientInitials = nameParts[0] && nameParts[1]
    ? `${nameParts[0][0]}${nameParts[1][0]}`.toUpperCase()
    : undefined;

  try {
    // Ensure IntegrationConfig import log
    const hl7Config = await prisma.integrationConfig.upsert({
      where: { name_method: { name: "medworxs", method: "HL7" } },
      create: { name: "medworxs", method: "HL7", enabled: true },
      update: {},
    });

    const importLog = await prisma.medworxsImport.create({
      data: {
        integrationId: hl7Config.id,
        method: "HL7",
        totalRows: 1,
        importedBy: "hl7-listener",
      },
    });

    // Find or create ReferralSource
    let source = await prisma.referralSource.findFirst({
      where: referrerNpi
        ? { OR: [{ npi: referrerNpi }, ...(referrerName ? [{ name: { equals: referrerName, mode: "insensitive" as const } }] : [])] }
        : { name: { equals: referrerName!, mode: "insensitive" } },
    });

    if (!source) {
      source = await prisma.referralSource.create({
        data: {
          name: referrerName ?? `Provider NPI ${referrerNpi}`,
          npi: referrerNpi ?? undefined,
          type: "PHYSICIAN",
        },
      });
    }

    // Check duplicate
    if (patientId) {
      const dup = await prisma.referral.findUnique({
        where: { referralSourceId_externalId: { referralSourceId: source.id, externalId: patientId } },
      });
      if (dup) {
        await prisma.medworxsImport.update({
          where: { id: importLog.id },
          data: { skipped: 1, imported: 0, errors: 0 },
        });
        return new NextResponse(
          buildACK(sendingApp, sendingFacility, msgControlId, "AA",
            "Accepted - duplicate referral skipped"),
          { status: 200, headers: { "Content-Type": "text/plain" } },
        );
      }
    }

    await prisma.referral.create({
      data: {
        referralSourceId: source.id,
        patientInitials,
        admissionDate,
        serviceLine: serviceRaw,
        externalId: patientId,
        importId: importLog.id,
        status: "RECEIVED",
      },
    });

    await prisma.medworxsImport.update({
      where: { id: importLog.id },
      data: { imported: 1, skipped: 0, errors: 0 },
    });

    return new NextResponse(
      buildACK(sendingApp, sendingFacility, msgControlId, "AA",
        `Referral from ${source.name} logged successfully`),
      { status: 200, headers: { "Content-Type": "text/plain" } },
    );
  } catch (err) {
    console.error("[HL7] Error processing ADT message:", err);
    return new NextResponse(
      buildACK(sendingApp ?? "MEDWORXS", sendingFacility ?? "HOSPITAL",
        msgControlId, "AE",
        "Internal processing error - please retry"),
      { status: 500, headers: { "Content-Type": "text/plain" } },
    );
  }
}
