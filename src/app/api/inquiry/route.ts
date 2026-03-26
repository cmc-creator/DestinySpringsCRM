import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const maxDuration = 30;

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const repId  = searchParams.get("repId");

  // Reps can only see their own submissions
  const isAdmin = session.user.role === "ADMIN";
  let repRecord: { id: string } | null = null;
  if (!isAdmin) {
    repRecord = await prisma.rep.findUnique({ where: { userId: session.user.id }, select: { id: true } });
    if (!repRecord) return NextResponse.json({ error: "Rep not found" }, { status: 404 });
  }

  const assessments = await prisma.preAssessment.findMany({
    where: {
      ...(isAdmin ? {} : { submittedById: session.user.id }),
      ...(isAdmin && repId ? { submittedById: repId } : {}),
      ...(status ? { status: status as never } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return NextResponse.json(assessments);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || (session.user.role !== "REP" && session.user.role !== "ADMIN"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const data = await req.json();
  const {
    patientInitials, patientAge, patientGender, presentingConcern,
    currentMedications, suicidalIdeation, substanceUse, priorTreatment, priorTreatmentDetails,
    primaryInsurance, memberId, groupNumber, payorId,
    referralSourceId, referringProvider, urgencyLevel,
    hospitalId,
  } = data;

  const assessment = await prisma.preAssessment.create({
    data: {
      submittedById:        session.user.id,
      hospitalId:           hospitalId           ? String(hospitalId)           : null,
      patientInitials:      patientInitials       ? String(patientInitials).trim() : null,
      patientAge:           patientAge            ? Number(patientAge)           : null,
      patientGender:        patientGender         ? String(patientGender)        : null,
      presentingConcern:    presentingConcern     ? String(presentingConcern)    : null,
      currentMedications:   currentMedications    ? String(currentMedications)   : null,
      suicidalIdeation:     Boolean(suicidalIdeation),
      substanceUse:         Boolean(substanceUse),
      priorTreatment:       Boolean(priorTreatment),
      priorTreatmentDetails: priorTreatmentDetails ? String(priorTreatmentDetails) : null,
      primaryInsurance:     primaryInsurance      ? String(primaryInsurance)     : null,
      memberId:             memberId              ? String(memberId)             : null,
      groupNumber:          groupNumber           ? String(groupNumber)          : null,
      payorId:              payorId               ? String(payorId)              : null,
      referralSourceId:     referralSourceId      ? String(referralSourceId)     : null,
      referringProvider:    referringProvider     ? String(referringProvider)    : null,
      urgencyLevel:         urgencyLevel          ? String(urgencyLevel)         : "ROUTINE",
    },
  });

  // Notify admins of new submission
  try {
    const admins = await prisma.user.findMany({ where: { role: "ADMIN" }, select: { id: true } });
    const urgencyEmoji = urgencyLevel === "EMERGENT" ? "🚨" : urgencyLevel === "URGENT" ? "⚠️" : "📝";
    await prisma.notification.createMany({
      data: admins.map(a => ({
        userId: a.id,
        title: `${urgencyEmoji} New Pre-Assessment Submitted`,
        body: `Patient ${patientInitials ?? "Unknown"} — ${urgencyLevel ?? "ROUTINE"} — needs clinical review.`,
        type: urgencyLevel === "EMERGENT" ? "ALERT" : "INFO",
        link: `/admin/inquiry`,
      })),
    });
  } catch { /* non-fatal */ }

  return NextResponse.json(assessment, { status: 201 });
}
