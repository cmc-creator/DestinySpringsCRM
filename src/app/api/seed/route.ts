import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  const expectedSecret = process.env.SEED_SECRET;
  if (!secret || !expectedSecret || secret !== expectedSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const adminPw = await bcrypt.hash("admin123!", 10);
    const repPw   = await bcrypt.hash("rep123!", 10);
    const accPw   = await bcrypt.hash("account123!", 10);

    const adminUser = await prisma.user.upsert({
      where: { email: "admin@destinysprings.com" }, update: {},
      create: { email: "admin@destinysprings.com", name: "Destiny Springs Admin", password: adminPw, role: "ADMIN" },
    });

    const repUser = await prisma.user.upsert({
      where: { email: "liaison1@destinysprings.com" }, update: {},
      create: {
        email: "liaison1@destinysprings.com", name: "Maria Reyes", password: repPw, role: "REP",
        rep: { create: { phone: "602-555-1122", city: "Phoenix", state: "AZ", title: "Senior Behavioral Health Liaison", territory: "Maricopa County Central", status: "ACTIVE", rating: 4.9, hipaaTrainedAt: new Date("2024-02-10"), licensedStates: ["AZ"], businessName: "Reyes BH Consulting", w9OnFile: true, territories: { create: [{ state: "AZ", city: "Phoenix", region: "Central Phoenix" }, { state: "AZ", city: "Tempe", region: "East Valley" }] } } },
      },
    });

    const rep2User = await prisma.user.upsert({
      where: { email: "liaison2@destinysprings.com" }, update: {},
      create: {
        email: "liaison2@destinysprings.com", name: "Derek Owens", password: repPw, role: "REP",
        rep: { create: { phone: "480-555-3344", city: "Scottsdale", state: "AZ", title: "BH Liaison – East Valley", territory: "Scottsdale / Mesa / Chandler", status: "ACTIVE", rating: 4.6, hipaaTrainedAt: new Date("2024-04-01"), licensedStates: ["AZ"], businessName: "Owens Healthcare Outreach", w9OnFile: true, territories: { create: [{ state: "AZ", city: "Scottsdale", region: "North Scottsdale" }, { state: "AZ", city: "Mesa", region: "East Valley" }] } } },
      },
    });

    const rep3User = await prisma.user.upsert({
      where: { email: "liaison3@destinysprings.com" }, update: {},
      create: {
        email: "liaison3@destinysprings.com", name: "Jasmine Thornton", password: repPw, role: "REP",
        rep: { create: { phone: "520-555-5566", city: "Tucson", state: "AZ", title: "BH Liaison - Southern AZ", territory: "Tucson / Pima County", status: "ACTIVE", rating: 4.7, hipaaTrainedAt: new Date("2023-12-15"), licensedStates: ["AZ"], businessName: "Thornton Behavioral Connections", w9OnFile: true, territories: { create: [{ state: "AZ", city: "Tucson", region: "Pima County" }] } } },
      },
    });

    await prisma.user.upsert({
      where: { email: "bh@honorhealth.com" }, update: {},
      create: {
        email: "bh@honorhealth.com", name: "Dr. Priya Mehta", password: accPw, role: "ACCOUNT",
        hospital: { create: { hospitalName: "HonorHealth Scottsdale Shea Medical Center", systemName: "HonorHealth", hospitalType: "EMERGENCY_DEPARTMENT", npi: "1122334455", bedCount: 433, serviceLines: ["Adult Inpatient Psych","Detox","Dual Diagnosis"], primaryContactName: "Dr. Priya Mehta", primaryContactTitle: "ED Medical Director", primaryContactEmail: "bh@honorhealth.com", primaryContactPhone: "480-555-2201", address: "9003 E Shea Blvd", city: "Scottsdale", state: "AZ", zip: "85260", status: "ACTIVE", source: "REFERRAL", contractValue: 0 } },
      },
    });

    const rep1 = await prisma.rep.findUnique({ where: { userId: repUser.id } });
    const rep2 = await prisma.rep.findUnique({ where: { userId: rep2User.id } });
    const rep3 = await prisma.rep.findUnique({ where: { userId: rep3User.id } });
    const h1 = await prisma.hospital.findFirst({ where: { hospitalName: "HonorHealth Scottsdale Shea Medical Center" } });

    const h2u = await prisma.user.upsert({ where: { email: "psych@bwh.com" }, update: {}, create: { email: "psych@bwh.com", name: "Dr. Carlos Vega", password: accPw, role: "ACCOUNT" } });
    const h2 = await prisma.hospital.upsert({ where: { userId: h2u.id }, update: {}, create: { userId: h2u.id, hospitalName: "Banner - University Medical Center Phoenix", systemName: "Banner Health", hospitalType: "EMERGENCY_DEPARTMENT", npi: "2233445566", bedCount: 759, serviceLines: ["Adult Psych","Adolescent Psych","Crisis"], primaryContactName: "Dr. Carlos Vega", primaryContactTitle: "Psychiatry Department Chair", primaryContactEmail: "psych@bwh.com", primaryContactPhone: "602-555-3101", address: "1111 E McDowell Rd", city: "Phoenix", state: "AZ", zip: "85006", status: "ACTIVE", source: "CONFERENCE", contractValue: 0, assignedRepId: rep1?.id } });

    const h3u = await prisma.user.upsert({ where: { email: "intake@valleywise.org" }, update: {}, create: { email: "intake@valleywise.org", name: "Sarah Kim", password: accPw, role: "ACCOUNT" } });
    const h3 = await prisma.hospital.upsert({ where: { userId: h3u.id }, update: {}, create: { userId: h3u.id, hospitalName: "Valleywise Health - Crisis Response Network", systemName: "Valleywise Health", hospitalType: "CRISIS_STABILIZATION_UNIT", npi: "3344556677", bedCount: 120, serviceLines: ["Crisis Stabilization","Detox"], primaryContactName: "Sarah Kim", primaryContactTitle: "Director of Crisis Services", primaryContactEmail: "intake@valleywise.org", primaryContactPhone: "602-555-4202", address: "2525 E Roosevelt St", city: "Phoenix", state: "AZ", zip: "85008", status: "ACTIVE", source: "EXISTING_RELATIONSHIP", contractValue: 0, assignedRepId: rep1?.id } });

    const h4u = await prisma.user.upsert({ where: { email: "mh@azcourtservices.gov" }, update: {}, create: { email: "mh@azcourtservices.gov", name: "Judge Marcus Ellis", password: accPw, role: "ACCOUNT" } });
    const h4 = await prisma.hospital.upsert({ where: { userId: h4u.id }, update: {}, create: { userId: h4u.id, hospitalName: "Maricopa County Superior Court - Behavioral Health Court", systemName: "Maricopa County", hospitalType: "COURT_LEGAL", npi: "4455667788", bedCount: 0, serviceLines: ["Court-Ordered Treatment","Adult Psych"], primaryContactName: "Judge Marcus Ellis", primaryContactTitle: "Presiding Judge - BH Court", primaryContactEmail: "mh@azcourtservices.gov", primaryContactPhone: "602-555-5303", address: "201 W Jefferson St", city: "Phoenix", state: "AZ", zip: "85003", status: "PROSPECT", source: "COLD_OUTREACH", contractValue: 0, assignedRepId: rep1?.id } });

    const h5u = await prisma.user.upsert({ where: { email: "outreach@cpsa.org" }, update: {}, create: { email: "outreach@cpsa.org", name: "Dr. Angela Torres", password: accPw, role: "ACCOUNT" } });
    const h5 = await prisma.hospital.upsert({ where: { userId: h5u.id }, update: {}, create: { userId: h5u.id, hospitalName: "Community Psychiatric Services of Arizona", systemName: "CPSA", hospitalType: "OUTPATIENT_PSYCHIATRY", npi: "5566778899", bedCount: 0, serviceLines: ["Outpatient Therapy","Medication Management","IOP"], primaryContactName: "Dr. Angela Torres", primaryContactTitle: "Clinical Director", primaryContactEmail: "outreach@cpsa.org", primaryContactPhone: "480-555-6404", address: "8765 E Bell Rd", city: "Scottsdale", state: "AZ", zip: "85260", status: "ACTIVE", source: "REFERRAL", contractValue: 0, assignedRepId: rep2?.id } });

    const h6u = await prisma.user.upsert({ where: { email: "intake@tucsonied.com" }, update: {}, create: { email: "intake@tucsonied.com", name: "Dr. Linda Hayes", password: accPw, role: "ACCOUNT" } });
    const h6 = await prisma.hospital.upsert({ where: { userId: h6u.id }, update: {}, create: { userId: h6u.id, hospitalName: "Tucson Medical Center - Emergency Department", systemName: "TMC Health", hospitalType: "EMERGENCY_DEPARTMENT", npi: "6677889900", bedCount: 601, serviceLines: ["Adult Psych","Geriatric Psych","Dual Diagnosis"], primaryContactName: "Dr. Linda Hayes", primaryContactTitle: "ED Behavioral Health Navigator", primaryContactEmail: "intake@tucsonied.com", primaryContactPhone: "520-555-7505", address: "5301 E Grant Rd", city: "Tucson", state: "AZ", zip: "85712", status: "ACTIVE", source: "CONFERENCE", contractValue: 0, assignedRepId: rep3?.id } });

    if (h1) await prisma.contact.createMany({ skipDuplicates: true, data: [
      { hospitalId: h1.id, name: "Dr. Priya Mehta", title: "ED Medical Director", type: "CMO", email: "bh@honorhealth.com", phone: "480-555-2201", isPrimary: true },
      { hospitalId: h1.id, name: "Rosa Gomez", title: "Behavioral Health Care Coordinator", type: "COORDINATOR", email: "r.gomez@honorhealth.com", phone: "480-555-2202" },
    ]});
    await prisma.contact.createMany({ skipDuplicates: true, data: [
      { hospitalId: h2.id, name: "Dr. Carlos Vega", title: "Psychiatry Department Chair", type: "CMO", email: "psych@bwh.com", isPrimary: true },
      { hospitalId: h3.id, name: "Sarah Kim", title: "Director of Crisis Services", type: "DIRECTOR", email: "intake@valleywise.org", isPrimary: true },
      { hospitalId: h4.id, name: "Judge Marcus Ellis", title: "Presiding Judge - BH Court", type: "OTHER", email: "mh@azcourtservices.gov", isPrimary: true },
      { hospitalId: h5.id, name: "Dr. Angela Torres", title: "Clinical Director", type: "CMO", email: "outreach@cpsa.org", isPrimary: true },
      { hospitalId: h6.id, name: "Dr. Linda Hayes", title: "ED BH Navigator", type: "COORDINATOR", email: "intake@tucsonied.com", isPrimary: true },
    ]});

    await prisma.lead.createMany({ skipDuplicates: true, data: [
      { hospitalName: "Chandler Regional Medical Center ED", city: "Chandler", state: "AZ", hospitalType: "EMERGENCY_DEPARTMENT", contactName: "Dr. Amy Foster", contactTitle: "ED Director", status: "QUALIFIED", source: "CONFERENCE", estimatedValue: 0, priority: "HIGH", assignedRepId: rep2?.id },
      { hospitalName: "St. Joseph Hospital Phoenix - Behavioral Health Unit", city: "Phoenix", state: "AZ", hospitalType: "INPATIENT_MEDICAL", contactName: "Dr. Robert Moore", contactTitle: "BH Unit Chief", contactEmail: "rmoore@dignityhealth.org", status: "PROPOSAL_SENT", source: "REFERRAL", estimatedValue: 0, priority: "HIGH", assignedRepId: rep1?.id },
      { hospitalName: "Mercy Gilbert Medical Center ED", city: "Gilbert", state: "AZ", hospitalType: "EMERGENCY_DEPARTMENT", contactName: "Sandra Kim", contactTitle: "Charge Nurse - Psych Holds", status: "CONTACTED", source: "LINKEDIN", estimatedValue: 0, priority: "MEDIUM", assignedRepId: rep2?.id },
      { hospitalName: "Pima County Adult Drug Court", city: "Tucson", state: "AZ", hospitalType: "COURT_LEGAL", contactName: "Magistrate Carol Brown", contactTitle: "Drug Court Judge", status: "NEGOTIATING", source: "EXISTING_RELATIONSHIP", estimatedValue: 0, priority: "HIGH", assignedRepId: rep3?.id },
      { hospitalName: "Peoria Unified School District - Student BH Services", city: "Peoria", state: "AZ", hospitalType: "SCHOOL_COUNSELOR", contactName: "Michael Torres", contactTitle: "Director of Student Services", status: "NEW", source: "COLD_OUTREACH", estimatedValue: 0, priority: "LOW", assignedRepId: rep1?.id },
      { hospitalName: "Sun Life Family Health Center", city: "Casa Grande", state: "AZ", hospitalType: "COMMUNITY_MENTAL_HEALTH", contactName: "Janet Reyes", contactTitle: "Behavioral Health Program Manager", status: "QUALIFIED", source: "CONFERENCE", estimatedValue: 0, priority: "MEDIUM", assignedRepId: rep1?.id },
      { hospitalName: "Kino Community Hospital ED", city: "Tucson", state: "AZ", hospitalType: "EMERGENCY_DEPARTMENT", contactName: "Dr. Steven Park", contactTitle: "ED Attending", status: "WON", source: "INBOUND", estimatedValue: 0, priority: "MEDIUM", assignedRepId: rep3?.id },
      { hospitalName: "Native Health Phoenix - Behavioral Health", city: "Phoenix", state: "AZ", hospitalType: "COMMUNITY_MENTAL_HEALTH", contactName: "Dr. Linda Yazzie", contactTitle: "BH Clinical Director", status: "NEW", source: "REFERRAL", estimatedValue: 0, priority: "MEDIUM", assignedRepId: rep1?.id },
    ]});

    const opp1 = await prisma.opportunity.create({ data: { title: "Adult Inpatient Psych - HonorHealth Shea ED Referral", hospitalId: h1!.id, assignedRepId: rep2?.id, stage: "ADMITTED", serviceLine: "ADULT_INPATIENT_PSYCH", value: 0, closeDate: new Date("2026-04-30"), priority: "HIGH", description: "ED-to-inpatient pathway for uninsured adult psych holds." } });
    const opp2 = await prisma.opportunity.create({ data: { title: "Detox + Dual Dx Track - Banner Phoenix ED", hospitalId: h2.id, assignedRepId: rep1?.id, stage: "INSURANCE_AUTH", serviceLine: "DUAL_DIAGNOSIS", value: 0, closeDate: new Date("2026-03-31"), priority: "HIGH" } });
    const opp3 = await prisma.opportunity.create({ data: { title: "Crisis Step-Down - Valleywise CSU", hospitalId: h3.id, assignedRepId: rep1?.id, stage: "DISCHARGED", serviceLine: "CRISIS_STABILIZATION", value: 0, closeDate: new Date("2026-02-15"), priority: "HIGH" } });
    await prisma.opportunity.create({ data: { title: "Adolescent Psych Pathway - CPSA IOP Step-Up", hospitalId: h5.id, assignedRepId: rep2?.id, stage: "CLINICAL_REVIEW", serviceLine: "ADOLESCENT_PSYCH", value: 0, closeDate: new Date("2026-05-15"), priority: "MEDIUM" } });
    const opp5 = await prisma.opportunity.create({ data: { title: "Court-Ordered Adult Psych - Maricopa BH Court", hospitalId: h4.id, assignedRepId: rep1?.id, stage: "CLINICAL_REVIEW", serviceLine: "COURT_ORDERED_TREATMENT", value: 0, closeDate: new Date("2026-06-01"), priority: "MEDIUM" } });
    const opp6 = await prisma.opportunity.create({ data: { title: "Geriatric Psych Pathway - Tucson MC ED", hospitalId: h6.id, assignedRepId: rep3?.id, stage: "ADMITTED", serviceLine: "GERIATRIC_PSYCH", value: 0, closeDate: new Date("2026-04-15"), priority: "HIGH" } });
    const _opp7 = await prisma.opportunity.create({ data: { title: "Adult Dual Dx Referral - Banner Phoenix Psych", hospitalId: h2.id, assignedRepId: rep1?.id, stage: "INQUIRY", serviceLine: "DUAL_DIAGNOSIS", value: 0, closeDate: new Date("2026-07-01"), priority: "HIGH" } });
    const opp8 = await prisma.opportunity.create({ data: { title: "Adolescent Psych - CPSA Outpatient to Inpatient", hospitalId: h5.id, assignedRepId: rep2?.id, stage: "DISCHARGED", serviceLine: "ADOLESCENT_PSYCH", value: 0, closeDate: new Date("2025-12-01"), priority: "MEDIUM" } });
    const opp9 = await prisma.opportunity.create({ data: { title: "Detox Stabilization - Valleywise Step-Down", hospitalId: h3.id, assignedRepId: rep1?.id, stage: "DISCHARGED", serviceLine: "DETOX_STABILIZATION", value: 0, closeDate: new Date("2026-01-20"), priority: "MEDIUM" } });

    await prisma.contract.createMany({ skipDuplicates: true, data: [
      { title: "Referral Partnership Agreement - HonorHealth Shea", hospitalId: h1!.id, opportunityId: opp1.id, assignedRepId: rep2?.id, status: "ACTIVE", startDate: new Date("2025-10-01"), endDate: new Date("2026-09-30"), value: 0 },
      { title: "Step-Down MOU - Valleywise CSU", hospitalId: h3.id, opportunityId: opp3.id, assignedRepId: rep1?.id, status: "SIGNED", startDate: new Date("2025-11-01"), endDate: new Date("2026-10-31"), value: 0 },
      { title: "Referral MOU Draft - Banner Phoenix", hospitalId: h2.id, opportunityId: opp2.id, assignedRepId: rep1?.id, status: "DRAFT", value: 0 },
      { title: "Referral Agreement - CPSA Scottsdale", hospitalId: h5.id, opportunityId: opp9.id, assignedRepId: rep2?.id, status: "SIGNED", startDate: new Date("2026-01-01"), endDate: new Date("2026-12-31"), value: 0 },
      { title: "Referral Agreement - Tucson MC ED", hospitalId: h6.id, opportunityId: opp6.id, assignedRepId: rep3?.id, status: "SENT", value: 0 },
      { title: "Step-Down MOU - Valleywise (Expired)", hospitalId: h3.id, opportunityId: opp8.id, assignedRepId: rep1?.id, status: "EXPIRED", startDate: new Date("2025-01-01"), endDate: new Date("2025-12-31"), value: 0 },
    ]});

    await prisma.activity.createMany({ skipDuplicates: true, data: [
      { type: "MEETING", title: "Monthly Liaison Meeting - HonorHealth Shea ED", hospitalId: h1!.id, repId: rep2?.id, opportunityId: opp1.id, notes: "ED care coordinator confirmed new bed request protocol.", completedAt: new Date("2026-02-28") },
      { type: "CALL", title: "MOU Signature Follow-Up - Valleywise CSU", hospitalId: h3.id, repId: rep1?.id, opportunityId: opp3.id, notes: "Final terms agreed. DocuSign sent.", completedAt: new Date("2026-02-20") },
      { type: "SITE_VISIT", title: "In-Service Presentation - CPSA Scottsdale", hospitalId: h5.id, repId: rep2?.id, opportunityId: opp6.id, notes: "Presented admission criteria to clinical team. Well received.", completedAt: new Date("2026-03-01") },
      { type: "PROPOSAL_SENT", title: "Referral Packet Sent - Banner Phoenix Psych", hospitalId: h2.id, repId: rep1?.id, opportunityId: opp2.id, notes: "Sent admission criteria sheet, insurance grid, and facility tour invite.", completedAt: new Date("2026-02-15") },
      { type: "EMAIL", title: "Follow-Up: Court Referral Process - Maricopa BH Court", hospitalId: h4.id, repId: rep1?.id, opportunityId: opp5.id, notes: "Sent facility brochure and AHCCCS authorization checklist.", completedAt: new Date("2026-03-03") },
      { type: "SITE_VISIT", title: "On-Site Visit - Tucson MC ED", hospitalId: h6.id, repId: rep3?.id, notes: "Met BH Navigator and charge nurse. Strong interest in adult psych referrals.", completedAt: new Date("2026-02-25") },
      { type: "CALL", title: "Qualification Call - Maricopa BH Court", hospitalId: h4.id, repId: rep1?.id, opportunityId: opp5.id, notes: "Confirmed court can refer Title 36 patients directly to Destiny Springs.", completedAt: new Date("2026-03-02") },
      { type: "CONTRACT_SENT", title: "Referral Agreement Sent - Tucson MC Legal", hospitalId: h6.id, repId: rep3?.id, opportunityId: opp6.id, notes: "Under counsel review. Expected response within 14 days.", completedAt: new Date("2026-03-04") },
      { type: "NOTE", title: "Champion Identified - Banner Phoenix Psychiatry", hospitalId: h2.id, repId: rep1?.id, notes: "Dr. Vega advocates for Destiny Springs as preferred step-down. Scheduling grand rounds presentation.", completedAt: new Date("2026-03-04") },
    ]});

    if (rep1) await prisma.repPayment.createMany({ skipDuplicates: true, data: [
      { repId: rep1.id, amount: 3500, description: "Q4 2025 Liaison Commission - Valleywise + Banner", status: "PAID", paidAt: new Date("2026-01-15"), periodStart: new Date("2025-10-01"), periodEnd: new Date("2025-12-31") },
      { repId: rep1.id, amount: 2000, description: "January 2026 Monthly Draw", status: "PAID", paidAt: new Date("2026-02-01"), periodStart: new Date("2026-01-01"), periodEnd: new Date("2026-01-31") },
      { repId: rep1.id, amount: 2000, description: "February 2026 Monthly Draw", status: "PENDING", periodStart: new Date("2026-02-01"), periodEnd: new Date("2026-02-28") },
    ]});
    if (rep2) await prisma.repPayment.createMany({ skipDuplicates: true, data: [
      { repId: rep2.id, amount: 3000, description: "Q4 2025 Liaison Commission - CPSA + HonorHealth", status: "PAID", paidAt: new Date("2026-01-20"), periodStart: new Date("2025-10-01"), periodEnd: new Date("2025-12-31") },
      { repId: rep2.id, amount: 2000, description: "March 2026 Monthly Draw", status: "PENDING", periodStart: new Date("2026-03-01"), periodEnd: new Date("2026-03-31") },
    ]});
    if (rep3) await prisma.repPayment.createMany({ skipDuplicates: true, data: [
      { repId: rep3.id, amount: 2500, description: "Q4 2025 Liaison Commission - Tucson MC", status: "PAID", paidAt: new Date("2026-02-10"), periodStart: new Date("2026-01-01"), periodEnd: new Date("2026-01-31") },
      { repId: rep3.id, amount: 2000, description: "February 2026 Monthly Draw", status: "PENDING", periodStart: new Date("2026-02-01"), periodEnd: new Date("2026-02-28") },
    ]});

    if (rep1) await prisma.complianceDoc.createMany({ skipDuplicates: true, data: [
      { repId: rep1.id, type: "HIPAA_TRAINING", title: "HIPAA Certification 2024", verified: true, expiresAt: new Date("2026-02-10") },
      { repId: rep1.id, type: "W9", title: "W-9 Form 2025", verified: true },
      { repId: rep1.id, type: "STATE_LICENSE", title: "AZ Business License", verified: true, expiresAt: new Date("2026-12-31") },
    ]});
    if (rep2) await prisma.complianceDoc.createMany({ skipDuplicates: true, data: [
      { repId: rep2.id, type: "HIPAA_TRAINING", title: "HIPAA Certification 2024", verified: true, expiresAt: new Date("2026-04-01") },
      { repId: rep2.id, type: "W9", title: "W-9 Form 2025", verified: true },
      { repId: rep2.id, type: "NDA", title: "CPSA Liaison NDA", verified: true },
    ]});
    if (rep3) await prisma.complianceDoc.createMany({ skipDuplicates: true, data: [
      { repId: rep3.id, type: "HIPAA_TRAINING", title: "HIPAA Certification 2023", verified: true, expiresAt: new Date("2025-12-15") },
      { repId: rep3.id, type: "W9", title: "W-9 Form 2024", verified: true },
      { repId: rep3.id, type: "BAA", title: "BAA - Tucson Medical Center", verified: true },
    ]});

    await prisma.notification.createMany({ skipDuplicates: true, data: [
      { userId: adminUser.id, title: "MOU Signed", body: "Valleywise CSU signed the step-down referral agreement.", type: "SUCCESS", link: "/admin/contracts" },
      { userId: adminUser.id, title: "New Lead Qualified", body: "Pima County Drug Court qualified by Jasmine Thornton.", type: "INFO", link: "/admin/leads" },
      { userId: repUser.id, title: "In-Service Confirmed", body: "Banner Phoenix Psychiatry confirmed grand rounds date.", type: "SUCCESS", link: "/rep/opportunities" },
      { userId: repUser.id, title: "Commission Processed", body: "Your Q4 2025 liaison commission of $3,500 has been paid.", type: "SUCCESS", link: "/rep/payments" },
    ]});

    return NextResponse.json({
      ok: true,
      message: "Destiny Springs CRM demo data seeded successfully!",
      stats: { facilities: 6, leads: 8, admissions: 9, contracts: 6, liaisons: 3, activities: 9 },
    });
  } catch (err) {
    console.error("[seed]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
