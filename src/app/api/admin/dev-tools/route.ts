import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const isProduction = process.env.NODE_ENV === "production";
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { action } = await req.json();

  if (action === "clear-demo") {
    if (isProduction) {
      return NextResponse.json({ ok: false, message: "Data clearing is disabled in production." }, { status: 403 });
    }
    // Delete in dependency order
    await prisma.activity.deleteMany({});
    await prisma.invoice.deleteMany({});
    await prisma.contract.deleteMany({});
    await prisma.opportunity.deleteMany({});
    await prisma.lead.deleteMany({});
    await prisma.repTerritory.deleteMany({});
    // Keep users/reps/hospitals (auth) but clear contacts
    await prisma.contact.deleteMany({});
    return NextResponse.json({ ok: true, message: "Demo data cleared (activities, invoices, contracts, opportunities, leads, contacts)" });
  }

  if (action === "clear-all") {
    if (isProduction) {
      return NextResponse.json({ ok: false, message: "Data clearing is disabled in production." }, { status: 403 });
    }
    await prisma.activity.deleteMany({});
    await prisma.invoice.deleteMany({});
    await prisma.contract.deleteMany({});
    await prisma.opportunity.deleteMany({});
    await prisma.lead.deleteMany({});
    await prisma.contact.deleteMany({});
    await prisma.repTerritory.deleteMany({});
    return NextResponse.json({ ok: true, message: "All transactional data cleared" });
  }

  if (action === "seed-demo") {
    if (isProduction) {
      return NextResponse.json({ ok: false, message: "Demo seeding is disabled in production." }, { status: 403 });
    }

    // Check if demo data already exists
    const existingLeads = await prisma.lead.count();
    if (existingLeads > 5) {
      return NextResponse.json({ ok: false, message: `Already has ${existingLeads} leads. Clear first.` });
    }

    const reps = await prisma.rep.findMany({ include: { user: true }, take: 3 });
    const hospitals = await prisma.hospital.findMany({ take: 3 });

    if (reps.length === 0) {
      return NextResponse.json({ ok: false, message: "No reps found. Create reps first." });
    }

    const demoLeads = [
      { hospitalName: "HonorHealth Deer Valley Medical Center", city: "Phoenix", state: "AZ", contactName: "Dr. Michelle Nguyen", contactTitle: "ED Medical Director", contactEmail: "m.nguyen@honorhealth.org", status: "QUALIFIED" as const, source: "REFERRAL" as const, estimatedValue: 0, assignedRepId: reps[0]?.id },
      { hospitalName: "Abrazo Central Campus", city: "Phoenix", state: "AZ", contactName: "Rachel Ford", contactTitle: "BH Care Coordinator", status: "NEW" as const, source: "COLD_OUTREACH" as const, estimatedValue: 0, assignedRepId: reps[0]?.id },
      { hospitalName: "Dignity Health - St. Joseph's Hospital", city: "Phoenix", state: "AZ", contactName: "Dr. Kevin Park", contactTitle: "Psychiatry Department Chair", status: "PROPOSAL_SENT" as const, source: "CONFERENCE" as const, estimatedValue: 0, assignedRepId: reps[1]?.id ?? reps[0]?.id },
      { hospitalName: "Maricopa County Probation Department", city: "Phoenix", state: "AZ", contactName: "Officer Sandra Ruiz", contactTitle: "Senior Probation Officer", status: "CONTACTED" as const, source: "INBOUND" as const, estimatedValue: 0, assignedRepId: reps[1]?.id ?? reps[0]?.id },
      { hospitalName: "Southern Arizona Mental Health Corp", city: "Tucson", state: "AZ", contactName: "Dr. Thomas Ely", contactTitle: "Clinical Director", status: "NEGOTIATING" as const, source: "EXISTING_RELATIONSHIP" as const, estimatedValue: 0, assignedRepId: reps[2]?.id ?? reps[0]?.id },
      { hospitalName: "Banner Desert Medical Center ED", city: "Mesa", state: "AZ", contactName: "Ashley Tran", contactTitle: "Social Work Supervisor", status: "NEW" as const, source: "REFERRAL" as const, estimatedValue: 0, assignedRepId: reps[2]?.id ?? reps[0]?.id },
    ];

    await prisma.lead.createMany({ data: demoLeads });

    if (hospitals.length > 0) {
      const demoOpps = [
        { title: "Adult Inpatient Psych Referral Pathway", hospitalId: hospitals[0].id, stage: "ADMITTED" as const, serviceLine: "ADULT_INPATIENT_PSYCH" as const, value: 0, priority: "HIGH", assignedRepId: reps[0]?.id },
        { title: "Detox Track - ED Referral", hospitalId: hospitals[0].id, stage: "INSURANCE_AUTH" as const, serviceLine: "DETOX_STABILIZATION" as const, value: 0, priority: "MEDIUM", assignedRepId: reps[0]?.id },
        { title: "Dual Diagnosis Step-Down", hospitalId: hospitals[1]?.id ?? hospitals[0].id, stage: "ACTIVE" as const, serviceLine: "DUAL_DIAGNOSIS" as const, value: 0, priority: "HIGH", assignedRepId: reps[1]?.id ?? reps[0]?.id },
        { title: "Adolescent Psych Pathway", hospitalId: hospitals[2]?.id ?? hospitals[0].id, stage: "CLINICAL_REVIEW" as const, serviceLine: "ADOLESCENT_PSYCH" as const, value: 0, priority: "LOW", assignedRepId: reps[2]?.id ?? reps[0]?.id },
      ];
      await prisma.opportunity.createMany({ data: demoOpps });
    }

    const leadCount = await prisma.lead.count();
    const oppCount = await prisma.opportunity.count();
    return NextResponse.json({ ok: true, message: `Seeded ${demoLeads.length} leads and ${hospitals.length > 0 ? 4 : 0} opportunities. Total: ${leadCount} leads, ${oppCount} opps.` });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
