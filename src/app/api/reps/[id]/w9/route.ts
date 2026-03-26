export const maxDuration = 30;

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  // REPs can only fetch their own W9
  if (session.user.role === "REP") {
    const myRep = await prisma.rep.findUnique({ where: { userId: session.user.id }, select: { id: true } });
    if (myRep?.id !== id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  } else if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const w9 = await prisma.w9Form.findUnique({ where: { repId: id } });
  if (!w9) return NextResponse.json(null);
  // Mask sensitive tax fields before returning
  return NextResponse.json({
    ...w9,
    ein: w9.ein ? `***-**-${w9.ein.slice(-4)}` : null,
    ssn: w9.ssn ? `***-**-${w9.ssn.slice(-4)}` : null,
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  // REPs can only submit their own W9
  if (session.user.role === "REP") {
    const myRep = await prisma.rep.findUnique({ where: { userId: session.user.id }, select: { id: true } });
    if (myRep?.id !== id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  } else if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const {
    legalName, businessName, taxClassification,
    ein, ssn, address, city, state, zip,
    signedAt, fileUrl,
  } = body;

  if (!legalName) return NextResponse.json({ error: "legalName is required" }, { status: 400 });

  try {
    const w9 = await prisma.w9Form.upsert({
      where: { repId: id },
      create: {
        repId: id,
        legalName,
        businessName: businessName || null,
        taxClassification: taxClassification || null,
        ein: ein || null,
        ssn: ssn || null,
        address: address || null,
        city: city || null,
        state: state || null,
        zip: zip || null,
        signedAt: signedAt ? new Date(signedAt) : null,
        fileUrl: fileUrl || null,
      },
      update: {
        legalName,
        businessName: businessName ?? null,
        taxClassification: taxClassification ?? null,
        ...(ein !== undefined ? { ein: ein || null } : {}),
        ...(ssn !== undefined ? { ssn: ssn || null } : {}),
        address: address ?? null,
        city: city ?? null,
        state: state ?? null,
        zip: zip ?? null,
        signedAt: signedAt ? new Date(signedAt) : undefined,
        fileUrl: fileUrl ?? null,
      },
    });

    // Mark w9OnFile on the Rep record
    await prisma.rep.update({ where: { id }, data: { w9OnFile: true } });

    return NextResponse.json({ id: w9.id, repId: w9.repId });
  } catch (e) {
    console.error("W9Form upsert error:", e);
    return NextResponse.json({ error: "Failed to save W9 form" }, { status: 500 });
  }
}
