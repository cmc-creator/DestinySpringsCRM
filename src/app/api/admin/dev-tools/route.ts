import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { action } = await req.json();

  if (action === "clear-demo") {
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
      { hospitalName: "St. Mary's Medical Center", city: "Dallas", state: "TX", contactName: "Dr. James Wright", contactTitle: "CMO", contactEmail: "jwright@stmarys.org", status: "QUALIFIED" as const, source: "REFERRAL" as const, estimatedValue: 125000, assignedRepId: reps[0]?.id },
      { hospitalName: "Coastal Health Network", city: "Miami", state: "FL", contactName: "Sarah Chen", contactTitle: "CFO", status: "NEW" as const, source: "CONFERENCE" as const, estimatedValue: 89000, assignedRepId: reps[0]?.id },
      { hospitalName: "Blue Ridge Regional", city: "Asheville", state: "NC", contactName: "Mike Torres", contactTitle: "CEO", status: "PROPOSAL_SENT" as const, source: "COLD_OUTREACH" as const, estimatedValue: 210000, assignedRepId: reps[1]?.id ?? reps[0]?.id },
      { hospitalName: "Midwest Children's Hospital", city: "Chicago", state: "IL", contactName: "Dr. Amy Patel", contactTitle: "CNO", status: "CONTACTED" as const, source: "INBOUND" as const, estimatedValue: 175000, assignedRepId: reps[1]?.id ?? reps[0]?.id },
      { hospitalName: "Pacific Oncology Center", city: "Seattle", state: "WA", contactName: "Robert Kim", contactTitle: "COO", status: "NEGOTIATING" as const, source: "LINKEDIN" as const, estimatedValue: 340000, assignedRepId: reps[2]?.id ?? reps[0]?.id },
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
