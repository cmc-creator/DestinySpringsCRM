import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is not set");
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Seeding Destiny Springs Healthcare CRM — BH/AZ demo data...");

  const adminPw = await bcrypt.hash("admin123!", 10);
  const repPw   = await bcrypt.hash("rep123!", 10);
  const accPw   = await bcrypt.hash("account123!", 10);

  // ── USERS ──────────────────────────────────────────────────────────────────

  const adminUser = await prisma.user.upsert({
    where: { email: "admin@destinysprings.com" },
    update: {},
    create: { email: "admin@destinysprings.com", name: "Destiny Springs Admin", password: adminPw, role: "ADMIN" },
  });

  const repUser = await prisma.user.upsert({
    where: { email: "sarah@destinysprings.com" },
    update: {},
    create: {
      email: "sarah@destinysprings.com", name: "Sarah Morales", password: repPw, role: "REP",
      rep: {
        create: {
          phone: "602-555-1122", city: "Phoenix", state: "AZ", title: "Senior Behavioral Health Liaison",
          territory: "East Valley / Phoenix Metro", status: "ACTIVE", rating: 4.9,
          hipaaTrainedAt: new Date("2024-02-01"), licensedStates: ["AZ"],
          businessName: "Morales Health Consulting", w9OnFile: true,
          territories: { create: [
            { state: "AZ", city: "Phoenix", region: "East Valley" },
            { state: "AZ", city: "Mesa", region: "Mesa / Chandler" },
            { state: "AZ", city: "Tempe", region: "Tempe / Ahwatukee" },
          ]},
        },
      },
    },
    include: { rep: true },
  });

  const rep2User = await prisma.user.upsert({
    where: { email: "alex@destinysprings.com" },
    update: {},
    create: {
      email: "alex@destinysprings.com", name: "Alex Fontaine", password: repPw, role: "REP",
      rep: {
        create: {
          phone: "480-555-3344", city: "Scottsdale", state: "AZ", title: "Behavioral Health Liaison",
          territory: "North Phoenix / Scottsdale", status: "ACTIVE", rating: 4.6,
          hipaaTrainedAt: new Date("2024-04-10"), licensedStates: ["AZ"],
          businessName: "Fontaine BD Solutions", w9OnFile: true,
          territories: { create: [
            { state: "AZ", city: "Scottsdale", region: "Scottsdale" },
            { state: "AZ", city: "Paradise Valley", region: "North Phoenix" },
            { state: "AZ", city: "Cave Creek", region: "North Scottsdale" },
          ]},
        },
      },
    },
    include: { rep: true },
  });

  const rep3User = await prisma.user.upsert({
    where: { email: "ben@destinysprings.com" },
    update: {},
    create: {
      email: "ben@destinysprings.com", name: "Benjamin Torres", password: repPw, role: "REP",
      rep: {
        create: {
          phone: "520-555-5566", city: "Tucson", state: "AZ", title: "Regional Liaison — Southern AZ",
          territory: "Southern Arizona", status: "ACTIVE", rating: 4.7,
          hipaaTrainedAt: new Date("2023-09-15"), licensedStates: ["AZ"],
          businessName: "Torres Community Outreach", w9OnFile: true,
          territories: { create: [
            { state: "AZ", city: "Tucson", region: "Tucson Metro" },
            { state: "AZ", city: "Casa Grande", region: "Central AZ" },
            { state: "AZ", city: "Sierra Vista", region: "Southeast AZ" },
          ]},
        },
      },
    },
    include: { rep: true },
  });

  // Portal account — Valleywise Health
  await prisma.user.upsert({
    where: { email: "socialwork@valleywise.org" },
    update: {},
    create: {
      email: "socialwork@valleywise.org", name: "Michael Ramirez", password: accPw, role: "ACCOUNT",
      hospital: {
        create: {
          hospitalName: "Valleywise Health Medical Center", systemName: "Valleywise Health",
          hospitalType: "EMERGENCY_DEPARTMENT", npi: "1122334455", bedCount: 392,
          serviceLines: ["Emergency Medicine", "Behavioral Health", "Trauma"],
          primaryContactName: "Michael Ramirez", primaryContactTitle: "Director of Social Work",
          primaryContactEmail: "socialwork@valleywise.org", primaryContactPhone: "602-555-2200",
          address: "2601 E Roosevelt St", city: "Phoenix", state: "AZ", zip: "85008",
          status: "ACTIVE", source: "EXISTING_RELATIONSHIP", contractValue: 0,
        },
      },
    },
  });

  // Get rep records
  const rep1 = await prisma.rep.findUnique({ where: { userId: repUser.id } });
  const rep2 = await prisma.rep.findUnique({ where: { userId: rep2User.id } });
  const rep3 = await prisma.rep.findUnique({ where: { userId: rep3User.id } });

  // ── SENDING FACILITIES ──────────────────────────────────────────────────────

  const h1 = await prisma.hospital.findFirst({ where: { hospitalName: "Valleywise Health Medical Center" } });

  const h2User = await prisma.user.upsert({
    where: { email: "bd@honorhealthshea.com" },
    update: {},
    create: { email: "bd@honorhealthshea.com", name: "Jennifer Lau", password: accPw, role: "ACCOUNT" },
  });
  const h2 = await prisma.hospital.upsert({
    where: { userId: h2User.id },
    update: {},
    create: {
      userId: h2User.id,
      hospitalName: "HonorHealth Scottsdale Shea Medical Center", systemName: "HonorHealth",
      hospitalType: "EMERGENCY_DEPARTMENT", npi: "2233445566", bedCount: 262,
      serviceLines: ["Emergency Medicine", "Internal Medicine", "Behavioral Health"],
      primaryContactName: "Jennifer Lau", primaryContactTitle: "Care Coordination Director",
      primaryContactEmail: "bd@honorhealthshea.com", primaryContactPhone: "480-555-3300",
      address: "9003 E Shea Blvd", city: "Scottsdale", state: "AZ", zip: "85260",
      status: "ACTIVE", source: "REFERRAL", contractValue: 0, assignedRepId: rep2?.id,
    },
  });

  const h3User = await prisma.user.upsert({
    where: { email: "sw@abrazocentral.com" },
    update: {},
    create: { email: "sw@abrazocentral.com", name: "David Torres", password: accPw, role: "ACCOUNT" },
  });
  const h3 = await prisma.hospital.upsert({
    where: { userId: h3User.id },
    update: {},
    create: {
      userId: h3User.id,
      hospitalName: "Abrazo Central Campus", systemName: "Abrazo Health",
      hospitalType: "EMERGENCY_DEPARTMENT", npi: "3344556677", bedCount: 213,
      serviceLines: ["Emergency Medicine", "Behavioral Health", "Internal Medicine"],
      primaryContactName: "David Torres", primaryContactTitle: "Social Work Supervisor",
      primaryContactEmail: "sw@abrazocentral.com", primaryContactPhone: "602-555-4400",
      address: "2000 W Bethany Home Rd", city: "Phoenix", state: "AZ", zip: "85015",
      status: "ACTIVE", source: "COLD_OUTREACH", contractValue: 0, assignedRepId: rep1?.id,
    },
  });

  const h4User = await prisma.user.upsert({
    where: { email: "courtreferrals@maricopacourt.gov" },
    update: {},
    create: { email: "courtreferrals@maricopacourt.gov", name: "Judge Patricia Wren", password: accPw, role: "ACCOUNT" },
  });
  const h4 = await prisma.hospital.upsert({
    where: { userId: h4User.id },
    update: {},
    create: {
      userId: h4User.id,
      hospitalName: "Maricopa County Superior Court — Mental Health Court", systemName: "Maricopa County",
      hospitalType: "COURT_LEGAL",
      serviceLines: ["Court-Ordered Treatment", "Assisted Outpatient Treatment"],
      primaryContactName: "Judge Patricia Wren", primaryContactTitle: "Mental Health Court Judge",
      primaryContactEmail: "courtreferrals@maricopacourt.gov", primaryContactPhone: "602-555-5500",
      address: "201 W Jefferson St", city: "Phoenix", state: "AZ", zip: "85003",
      status: "ACTIVE", source: "REFERRAL", contractValue: 0, assignedRepId: rep1?.id,
    },
  });

  const h5User = await prisma.user.upsert({
    where: { email: "crisis@empactspc.org" },
    update: {},
    create: { email: "crisis@empactspc.org", name: "Rosa Martinez", password: accPw, role: "ACCOUNT" },
  });
  const h5 = await prisma.hospital.upsert({
    where: { userId: h5User.id },
    update: {},
    create: {
      userId: h5User.id,
      hospitalName: "EMPACT-SPC Crisis Services", systemName: "EMPACT-SPC",
      hospitalType: "CRISIS_STABILIZATION_UNIT",
      serviceLines: ["Crisis Stabilization", "Mobile Crisis", "Crisis Hotline"],
      primaryContactName: "Rosa Martinez", primaryContactTitle: "Crisis Services Director",
      primaryContactEmail: "crisis@empactspc.org", primaryContactPhone: "480-555-6600",
      address: "1232 E Broadway Rd", city: "Tempe", state: "AZ", zip: "85282",
      status: "ACTIVE", source: "CONFERENCE", contractValue: 0, assignedRepId: rep1?.id,
    },
  });

  const h6User = await prisma.user.upsert({
    where: { email: "provider@ironwoodfamily.com" },
    update: {},
    create: { email: "provider@ironwoodfamily.com", name: "Dr. James Park", password: accPw, role: "ACCOUNT" },
  });
  const h6 = await prisma.hospital.upsert({
    where: { userId: h6User.id },
    update: {},
    create: {
      userId: h6User.id,
      hospitalName: "Ironwood Family Medicine — North Phoenix", systemName: null,
      hospitalType: "PRIMARY_CARE",
      serviceLines: ["Primary Care", "Annual Wellness", "Behavioral Health Integration"],
      primaryContactName: "Dr. James Park", primaryContactTitle: "Medical Director",
      primaryContactEmail: "provider@ironwoodfamily.com", primaryContactPhone: "480-555-7700",
      address: "4545 E Bell Rd", city: "Phoenix", state: "AZ", zip: "85032",
      status: "ACTIVE", source: "COLD_OUTREACH", contractValue: 0, assignedRepId: rep2?.id,
    },
  });

  const hospitals = [h1, h2, h3, h4, h5, h6].filter(Boolean);

  // ── CONTACTS ───────────────────────────────────────────────────────────────

  if (h1) {
    await prisma.contact.createMany({ skipDuplicates: true, data: [
      { hospitalId: h1.id, name: "Michael Ramirez", title: "Director of Social Work", type: "SOCIAL_WORKER", email: "m.ramirez@valleywise.org", phone: "602-555-2201", isPrimary: true },
      { hospitalId: h1.id, name: "Dr. Ana Gutierrez", title: "Emergency Medicine Physician", type: "ED_PHYSICIAN", email: "a.gutierrez@valleywise.org", phone: "602-555-2202" },
      { hospitalId: h1.id, name: "Carmen Reyes", title: "Discharge Planner", type: "DISCHARGE_PLANNER", email: "c.reyes@valleywise.org", phone: "602-555-2203" },
    ]});
  }
  if (h2) {
    await prisma.contact.createMany({ skipDuplicates: true, data: [
      { hospitalId: h2.id, name: "Jennifer Lau", title: "Care Coordination Director", type: "DIRECTOR", email: "j.lau@honorhealth.com", phone: "480-555-3301", isPrimary: true },
      { hospitalId: h2.id, name: "Dr. Kevin Marsh", title: "Attending Physician — ED", type: "ED_PHYSICIAN", email: "k.marsh@honorhealth.com", phone: "480-555-3302" },
      { hospitalId: h2.id, name: "Tanya Brooks", title: "Social Worker", type: "SOCIAL_WORKER", email: "t.brooks@honorhealth.com", phone: "480-555-3303" },
    ]});
  }
  if (h3) {
    await prisma.contact.createMany({ skipDuplicates: true, data: [
      { hospitalId: h3.id, name: "David Torres", title: "Social Work Supervisor", type: "SOCIAL_WORKER", email: "dtorres@abrazohealth.com", phone: "602-555-4401", isPrimary: true },
    ]});
  }
  if (h4) {
    await prisma.contact.createMany({ skipDuplicates: true, data: [
      { hospitalId: h4.id, name: "Judge Patricia Wren", title: "Mental Health Court Judge", type: "COURT_LIAISON", email: "pwren@maricopacourt.gov", phone: "602-555-5501", isPrimary: true },
      { hospitalId: h4.id, name: "Marcus Delgado", title: "Court Case Manager", type: "CASE_MANAGER", email: "mdelgado@maricopacourt.gov", phone: "602-555-5502" },
    ]});
  }
  if (h5) {
    await prisma.contact.createMany({ skipDuplicates: true, data: [
      { hospitalId: h5.id, name: "Rosa Martinez", title: "Crisis Services Director", type: "CRISIS_COUNSELOR", email: "rmartinez@empactspc.org", phone: "480-555-6601", isPrimary: true },
    ]});
  }
  if (h6) {
    await prisma.contact.createMany({ skipDuplicates: true, data: [
      { hospitalId: h6.id, name: "Dr. James Park", title: "Medical Director", type: "PRIMARY_CARE_PHYSICIAN", email: "jpark@ironwoodfamily.com", phone: "480-555-7701", isPrimary: true },
      { hospitalId: h6.id, name: "Lisa Chen", title: "Care Coordinator", type: "COORDINATOR", email: "lchen@ironwoodfamily.com", phone: "480-555-7702" },
    ]});
  }

  // ── INQUIRIES (LEADS) ─────────────────────────────────────────────────────

  const leadsData = [
    { hospitalName: "Chandler Regional Medical Center — ED", city: "Chandler", state: "AZ", hospitalType: "EMERGENCY_DEPARTMENT" as const, bedCount: 338, contactName: "Maria Soto", contactTitle: "Social Work Director", contactEmail: "msoto@dignityhealth.org", status: "QUALIFIED" as const, source: "REFERRAL" as const, priority: "HIGH", assignedRepId: rep1?.id },
    { hospitalName: "Banner Gateway Medical Center — ED", city: "Gilbert", state: "AZ", hospitalType: "EMERGENCY_DEPARTMENT" as const, bedCount: 286, contactName: "Dr. Paul Kim", contactTitle: "ED Medical Director", contactEmail: "pkim@bannerhealth.com", status: "CONTACTED" as const, source: "CONFERENCE" as const, priority: "HIGH", assignedRepId: rep2?.id },
    { hospitalName: "Tucson Medical Center — Emergency Services", city: "Tucson", state: "AZ", hospitalType: "EMERGENCY_DEPARTMENT" as const, bedCount: 601, contactName: "Sandra Flores", contactTitle: "Social Work Supervisor", status: "NEW" as const, source: "COLD_OUTREACH" as const, priority: "MEDIUM", assignedRepId: rep3?.id },
    { hospitalName: "Sonora Behavioral Health Hospital", city: "Tucson", state: "AZ", hospitalType: "IOP_PHP" as const, bedCount: 72, contactName: "Dr. Elena Ruiz", contactTitle: "Clinical Director", contactEmail: "eruiz@sonorabhh.com", status: "QUALIFIED" as const, source: "EXISTING_RELATIONSHIP" as const, priority: "HIGH", assignedRepId: rep3?.id },
    { hospitalName: "Casa Grande Regional Medical Center", city: "Casa Grande", state: "AZ", hospitalType: "EMERGENCY_DEPARTMENT" as const, bedCount: 147, contactName: "Tomas Herrera", contactTitle: "Director of Care Management", status: "CONTACTED" as const, source: "REFERRAL" as const, priority: "MEDIUM", assignedRepId: rep3?.id },
    { hospitalName: "Dignity Health — Mercy Gilbert Medical Center ED", city: "Gilbert", state: "AZ", hospitalType: "EMERGENCY_DEPARTMENT" as const, bedCount: 212, contactName: "Angela Watkins", contactTitle: "Behavioral Health Navigator", contactEmail: "awatkins@dignityhealth.org", status: "NEGOTIATING" as const, source: "INBOUND" as const, priority: "HIGH", assignedRepId: rep2?.id },
    { hospitalName: "Arizona DCS — Maricopa Regional Office", city: "Phoenix", state: "AZ", hospitalType: "COURT_LEGAL" as const, contactName: "Sandra Nguyen", contactTitle: "Program Manager", status: "CONTACTED" as const, source: "REFERRAL" as const, priority: "HIGH", assignedRepId: rep1?.id },
    { hospitalName: "West Valley Hospital — ED", city: "Goodyear", state: "AZ", hospitalType: "EMERGENCY_DEPARTMENT" as const, bedCount: 106, contactName: "Frank Davis", contactTitle: "Social Worker", status: "NEW" as const, source: "COLD_OUTREACH" as const, priority: "LOW", assignedRepId: rep1?.id },
  ];

  for (const lead of leadsData) {
    await prisma.lead.create({ data: lead as never });
  }

  // ── PAYORS ─────────────────────────────────────────────────────────────────

  const payor1 = await prisma.payor.upsert({
    where: { id: "payor-bcbsaz" },
    update: {},
    create: { id: "payor-bcbsaz", name: "Blue Cross Blue Shield of Arizona", type: "COMMERCIAL", planName: "BlueCard PPO / HMO", phone: "602-864-4400", authPhone: "602-864-4200", requiresPreAuth: true, avgAuthDays: 2, inNetwork: true },
  });
  const payor2 = await prisma.payor.upsert({
    where: { id: "payor-ahcccs" },
    update: {},
    create: { id: "payor-ahcccs", name: "AHCCCS — Fee for Service", type: "AHCCCS", planName: "Arizona Long Term Care / Fee for Service", phone: "602-417-4000", authPhone: "602-417-4000", requiresPreAuth: false, inNetwork: true, notes: "AZ Medicaid — verify eligibility via EVS" },
  });
  const payor3 = await prisma.payor.upsert({
    where: { id: "payor-aetnaaz" },
    update: {},
    create: { id: "payor-aetnaaz", name: "Aetna Better Health of Arizona", type: "AHCCCS", planName: "Aetna Complete Care — Behavioral Health", phone: "800-782-8821", authPhone: "800-782-8821", requiresPreAuth: true, avgAuthDays: 1, inNetwork: true },
  });
  const payor4 = await prisma.payor.upsert({
    where: { id: "payor-uhccp" },
    update: {},
    create: { id: "payor-uhccp", name: "UnitedHealthcare Community Plan AZ", type: "AHCCCS", planName: "UHC Community Plan Behavioral Health", phone: "800-514-4911", authPhone: "800-616-2710", requiresPreAuth: true, avgAuthDays: 1, inNetwork: true },
  });
  const payor5 = await prisma.payor.upsert({
    where: { id: "payor-medicare" },
    update: {},
    create: { id: "payor-medicare", name: "Medicare Part A", type: "MEDICARE", phone: "800-633-4227", authPhone: "877-908-8310", requiresPreAuth: false, inNetwork: true, notes: "Medicare inpatient psychiatric benefit — 190-day lifetime limit" },
  });
  const payor6 = await prisma.payor.upsert({
    where: { id: "payor-cigna" },
    update: {},
    create: { id: "payor-cigna", name: "Cigna Behavioral Health", type: "COMMERCIAL", planName: "Cigna PPO", phone: "800-274-7603", authPhone: "800-274-7603", requiresPreAuth: true, avgAuthDays: 3, inNetwork: false, notes: "Out-of-network — single case agreements possible" },
  });

  // ── OPPORTUNITIES (ADMISSION PIPELINE) ────────────────────────────────────

  const oppsData = [
    { title: "Adult Psych Admission — Valleywise ED", hospitalId: h1!.id, assignedRepId: rep1?.id, stage: "ADMITTED" as const, serviceLine: "ADULT_INPATIENT_PSYCH" as const, admissionType: "VOLUNTARY" as const, payorId: payor1.id, estimatedLOS: 12, closeDate: new Date("2026-04-15"), priority: "HIGH", description: "37yo male, MDD with SI. Referred by Valleywise ED social work team." },
    { title: "Adolescent Psych Admission — HonorHealth Shea", hospitalId: h2.id, assignedRepId: rep2?.id, stage: "ACTIVE" as const, serviceLine: "ADOLESCENT_PSYCH" as const, admissionType: "MINOR_PARENTAL_CONSENT" as const, payorId: payor1.id, estimatedLOS: 8, closeDate: new Date("2026-04-12"), priority: "HIGH", description: "15yo female, acute suicidal ideation. Admitted via HonorHealth Shea ED." },
    { title: "Dual Diagnosis — AHCCCS Auth Pending", hospitalId: h3.id, assignedRepId: rep1?.id, stage: "INSURANCE_AUTH" as const, serviceLine: "DUAL_DIAGNOSIS" as const, admissionType: "VOLUNTARY" as const, payorId: payor2.id, estimatedLOS: 18, closeDate: new Date("2026-04-18"), priority: "HIGH", description: "28yo male, bipolar I + AUD. Awaiting AHCCCS concurrent review approval." },
    { title: "Court-Ordered Admission — Mental Health Court", hospitalId: h4.id, assignedRepId: rep1?.id, stage: "ADMITTED" as const, serviceLine: "COURT_ORDERED_TREATMENT" as const, admissionType: "COURT_ORDERED" as const, payorId: payor2.id, estimatedLOS: 30, closeDate: new Date("2026-05-10"), priority: "HIGH", description: "Court-ordered treatment referral per ARS §36-540. COT period: 30 days." },
    { title: "Title 36 Hold — EMPACT Crisis Evaluation", hospitalId: h5.id, assignedRepId: rep1?.id, stage: "CLINICAL_REVIEW" as const, serviceLine: "CRISIS_STABILIZATION" as const, admissionType: "TITLE_36_EMERGENCY" as const, payorId: payor3.id, estimatedLOS: 5, closeDate: new Date("2026-04-10"), priority: "HIGH", description: "ARS §36-520 emergency hold initiated by EMPACT mobile crisis team. Clinical review underway." },
    { title: "Geriatric Psych Inquiry — Ironwood Family Med", hospitalId: h6.id, assignedRepId: rep2?.id, stage: "INQUIRY" as const, serviceLine: "GERIATRIC_PSYCH" as const, admissionType: "VOLUNTARY" as const, payorId: payor5.id, estimatedLOS: 14, closeDate: new Date("2026-04-20"), priority: "MEDIUM", description: "72yo female with late-onset depression and psychotic features. PCP requesting evaluation." },
    { title: "Adolescent Discharge Planning — HonorHealth", hospitalId: h2.id, assignedRepId: rep2?.id, stage: "DISCHARGED" as const, serviceLine: "ADOLESCENT_PSYCH" as const, admissionType: "MINOR_PARENTAL_CONSENT" as const, payorId: payor1.id, estimatedLOS: 10, closeDate: new Date("2026-03-28"), priority: "MEDIUM", description: "16yo male, discharged after 10-day inpatient stay. Aftercare: outpatient IOP + family therapy." },
    { title: "Adult Inpatient — BCBSAZ Auth Pending", hospitalId: h1!.id, assignedRepId: rep1?.id, stage: "INSURANCE_AUTH" as const, serviceLine: "ADULT_INPATIENT_PSYCH" as const, admissionType: "VOLUNTARY" as const, payorId: payor1.id, estimatedLOS: 10, closeDate: new Date("2026-04-14"), priority: "MEDIUM", description: "45yo female, acute anxiety/PTSD. BCBSAZ prior auth pending — typical 48hr turnaround." },
    { title: "Dual Diagnosis — Declined (Out-of-Network)", hospitalId: h3.id, assignedRepId: rep1?.id, stage: "DECLINED" as const, serviceLine: "DUAL_DIAGNOSIS" as const, admissionType: "VOLUNTARY" as const, payorId: payor6.id, estimatedLOS: undefined, closeDate: new Date("2026-04-05"), priority: "LOW", description: "Declined — Cigna out-of-network, patient declined self-pay option. Referred to Community Bridges." },
    { title: "Crisis Stabilization — Active (Title 36)", hospitalId: h5.id, assignedRepId: rep1?.id, stage: "ACTIVE" as const, serviceLine: "CRISIS_STABILIZATION" as const, admissionType: "TITLE_36_EMERGENCY" as const, payorId: payor4.id, estimatedLOS: 3, closeDate: new Date("2026-04-11"), priority: "HIGH", description: "19yo male, acute psychosis. Title 36 hold initiated in Tempe. UHC auth approved." },
  ];

  const opportunities = [];
  for (const opp of oppsData) {
    const created = await prisma.opportunity.create({ data: opp as never });
    opportunities.push(created);
  }

  // ── CENSUS SNAPSHOT (TODAY) ────────────────────────────────────────────────

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  await prisma.censusSnapshot.upsert({
    where: { date: today },
    update: {},
    create: {
      date: today,
      adultTotal: 24,      adultAvailable: 4,
      adolescentTotal: 12, adolescentAvailable: 3,
      geriatricTotal: 8,   geriatricAvailable: 2,
      dualDxTotal: 16,     dualDxAvailable: 1,
      note: "High census on dual dx unit — AHCCCS auths pending.",
    },
  });

  // ── INVOICES ───────────────────────────────────────────────────────────────

  await prisma.invoice.createMany({ skipDuplicates: true, data: [
    { invoiceNumber: "INV-DS-2026-001", hospitalId: h1!.id, opportunityId: opportunities[0].id, status: "SENT", totalAmount: 0, dueDate: new Date("2026-04-30"), lineItems: [{ description: "Q1 2026 Liaison Services — Valleywise Health", amount: 0 }], notes: "Referral partnership agreement — no invoice; tracked for reporting." },
    { invoiceNumber: "INV-DS-2026-002", hospitalId: h2.id, status: "PAID", totalAmount: 3500, dueDate: new Date("2026-03-31"), paidAt: new Date("2026-03-28"), lineItems: [{ description: "In-Service Training — HonorHealth Shea Social Work Team", amount: 3500 }] },
    { invoiceNumber: "INV-DS-2026-003", hospitalId: h3.id, status: "PAID", totalAmount: 2500, dueDate: new Date("2026-02-28"), paidAt: new Date("2026-02-25"), lineItems: [{ description: "Lunch & Learn Series — Abrazo Central (4 sessions)", amount: 2500 }] },
    { invoiceNumber: "INV-DS-2026-004", hospitalId: h5.id, status: "SENT", totalAmount: 1800, dueDate: new Date("2026-04-15"), lineItems: [{ description: "CE Presentation — EMPACT Crisis Staff (3 CEUs)", amount: 1800 }] },
    { invoiceNumber: "INV-DS-2026-005", hospitalId: h5.id, status: "OVERDUE", totalAmount: 1800, dueDate: new Date("2026-03-01"), lineItems: [{ description: "CE Presentation — January Session (3 CEUs)", amount: 1800 }] },
  ]});

  // ── CONTRACTS ──────────────────────────────────────────────────────────────

  await prisma.contract.createMany({ skipDuplicates: true, data: [
    { title: "Referral Partnership Agreement — Valleywise Health", hospitalId: h1!.id, assignedRepId: rep1?.id, status: "ACTIVE", startDate: new Date("2026-01-01"), endDate: new Date("2026-12-31"), value: 0, terms: "Annual preferred referral partner agreement. Quarterly in-service trainings included." },
    { title: "In-Service & CE Agreement — HonorHealth Scottsdale Shea", hospitalId: h2.id, assignedRepId: rep2?.id, status: "SIGNED", startDate: new Date("2026-01-01"), endDate: new Date("2026-12-31"), value: 14000, terms: "4 in-service sessions/year + quarterly CE presentations." },
    { title: "Preferred Provider MOU — Abrazo Health", hospitalId: h3.id, assignedRepId: rep1?.id, status: "DRAFT", value: 0, terms: "Pending legal review — mutual referral MOU." },
    { title: "AOT / COT Referral MOU — Maricopa County Mental Health Court", hospitalId: h4.id, assignedRepId: rep1?.id, status: "SIGNED", startDate: new Date("2025-07-01"), endDate: new Date("2026-06-30"), value: 0, terms: "Memorandum of Understanding for court-ordered psychiatric treatment referrals under ARS §36-540." },
    { title: "Community Partnership Agreement — EMPACT-SPC", hospitalId: h5.id, assignedRepId: rep1?.id, status: "ACTIVE", startDate: new Date("2025-10-01"), endDate: new Date("2026-09-30"), value: 7200, terms: "Quarterly CE workshops for EMPACT crisis staff. Preferred transfer facility for Title 36 holds." },
    { title: "PCP Referral Agreement — Ironwood Family Medicine", hospitalId: h6.id, assignedRepId: rep2?.id, status: "EXPIRED", startDate: new Date("2025-01-01"), endDate: new Date("2025-12-31"), value: 0, terms: "Annual PCP liaison agreement — renewal due." },
  ]});

  // ── ACTIVITIES ─────────────────────────────────────────────────────────────

  const activitiesData = [
    { type: "IN_SERVICE" as const, title: "In-Service Training — Valleywise ED Social Work", hospitalId: h1!.id, repId: rep1?.id, notes: "Presented Destiny Springs admission criteria, Title 36 process, and AHCCCS authorization timeline. 12 staff attended.", completedAt: new Date("2026-03-15") },
    { type: "MEETING" as const, title: "Quarterly Relationship Review — HonorHealth", hospitalId: h2.id, repId: rep2?.id, opportunityId: opportunities[1].id, notes: "Reviewed Q1 referral volume (8 admits). Discussed adolescent unit expansion.", completedAt: new Date("2026-04-01") },
    { type: "CE_PRESENTATION" as const, title: "CE Presentation — Maricopa Mental Health Court", hospitalId: h4.id, repId: rep1?.id, notes: "Presented 3-CEU course: 'Inpatient Psychiatric Treatment & Recovery for Court-Involved Adults'. 18 attendees.", completedAt: new Date("2026-03-20") },
    { type: "CRISIS_CONSULT" as const, title: "Crisis Consult — Title 36 Evaluation (EMPACT)", hospitalId: h5.id, repId: rep1?.id, opportunityId: opportunities[4].id, notes: "Called by EMPACT mobile crisis for Title 36 assessment. Clinical team accepted. Admission pending.", completedAt: new Date("2026-04-09") },
    { type: "FACILITY_TOUR" as const, title: "Facility Tour — EMPACT-SPC Team", hospitalId: h5.id, repId: rep1?.id, notes: "8 EMPACT crisis staff toured Destiny Springs inpatient units. Very positive feedback.", completedAt: new Date("2026-03-05") },
    { type: "CALL" as const, title: "Follow-Up — Post-Admission, Valleywise Referral", hospitalId: h1!.id, repId: rep1?.id, opportunityId: opportunities[0].id, notes: "Called Michael Ramirez to confirm admission and review any transition needs.", completedAt: new Date("2026-04-08") },
    { type: "LUNCH_AND_LEARN" as const, title: "Lunch & Learn — Ironwood Family Medicine", hospitalId: h6.id, repId: rep2?.id, notes: "Educated 7 providers on BH referral pathways, AHCCCS vs commercial criteria differences, and when to call for consult.", completedAt: new Date("2026-03-25") },
    { type: "NOTE" as const, title: "Internal Note — AHCCCS Auth Delay (Abrazo Opp)", hospitalId: h3.id, repId: rep1?.id, opportunityId: opportunities[2].id, notes: "AHCCCS review taking longer than expected. Utilization review manager escalated. Follow up in 24 hrs.", completedAt: new Date("2026-04-09") },
    { type: "EMAIL" as const, title: "Follow-Up Email — Tucson Medical Center Lead", repId: rep3?.id, notes: "Sent intro email and service line overview to Sandra Flores, Social Work Supervisor at TMC ED.", completedAt: new Date("2026-04-07") },
    { type: "FOLLOW_UP" as const, title: "Scheduled: Quarterly Check-In — Banner Gateway", repId: rep2?.id, notes: "Quarterly relationship building call scheduled. Agenda: Q1 referral recap, summer census planning.", scheduledAt: new Date("2026-04-22") },
  ];

  for (const act of activitiesData) {
    await prisma.activity.create({ data: act });
  }

  // ── REP PAYMENTS ───────────────────────────────────────────────────────────

  if (rep1) {
    await prisma.repPayment.createMany({ skipDuplicates: true, data: [
      { repId: rep1.id, amount: 6200, description: "Q1 2026 Liaison Fee — East Valley Territory", status: "PAID", paidAt: new Date("2026-04-01"), periodStart: new Date("2026-01-01"), periodEnd: new Date("2026-03-31") },
      { repId: rep1.id, amount: 2100, description: "April 2026 Draw", status: "PENDING", periodStart: new Date("2026-04-01"), periodEnd: new Date("2026-04-30") },
    ]});
  }
  if (rep2) {
    await prisma.repPayment.createMany({ skipDuplicates: true, data: [
      { repId: rep2.id, amount: 4800, description: "Q1 2026 Liaison Fee — North Phoenix / Scottsdale", status: "PAID", paidAt: new Date("2026-04-01"), periodStart: new Date("2026-01-01"), periodEnd: new Date("2026-03-31") },
      { repId: rep2.id, amount: 1750, description: "April 2026 Draw", status: "PENDING", periodStart: new Date("2026-04-01"), periodEnd: new Date("2026-04-30") },
    ]});
  }
  if (rep3) {
    await prisma.repPayment.createMany({ skipDuplicates: true, data: [
      { repId: rep3.id, amount: 3900, description: "Q1 2026 Liaison Fee — Southern Arizona", status: "PAID", paidAt: new Date("2026-04-01"), periodStart: new Date("2026-01-01"), periodEnd: new Date("2026-03-31") },
      { repId: rep3.id, amount: 1400, description: "April 2026 Draw", status: "PENDING", periodStart: new Date("2026-04-01"), periodEnd: new Date("2026-04-30") },
    ]});
  }

  // ── COMPLIANCE DOCS ────────────────────────────────────────────────────────

  if (rep1) {
    await prisma.complianceDoc.createMany({ skipDuplicates: true, data: [
      { repId: rep1.id, type: "HIPAA_TRAINING", title: "HIPAA Certification 2025 — Sarah Morales", verified: true, expiresAt: new Date("2027-02-01") },
      { repId: rep1.id, type: "W9", title: "W-9 Form 2026 — Morales Health Consulting", verified: true },
      { repId: rep1.id, type: "STATE_LICENSE", title: "AZ Business License 2026", verified: true, expiresAt: new Date("2026-12-31") },
      { repId: rep1.id, type: "BAA", title: "BAA — Valleywise Health", verified: true },
    ]});
  }
  if (rep2) {
    await prisma.complianceDoc.createMany({ skipDuplicates: true, data: [
      { repId: rep2.id, type: "HIPAA_TRAINING", title: "HIPAA Certification 2025 — Alex Fontaine", verified: true, expiresAt: new Date("2027-04-10") },
      { repId: rep2.id, type: "W9", title: "W-9 Form 2026 — Fontaine BD Solutions", verified: true },
      { repId: rep2.id, type: "BAA", title: "BAA — HonorHealth Shea", verified: true },
    ]});
  }
  if (rep3) {
    await prisma.complianceDoc.createMany({ skipDuplicates: true, data: [
      { repId: rep3.id, type: "HIPAA_TRAINING", title: "HIPAA Certification 2024 — Benjamin Torres", verified: true, expiresAt: new Date("2026-09-15") },
      { repId: rep3.id, type: "W9", title: "W-9 Form 2025 — Torres Community Outreach", verified: true },
      { repId: rep3.id, type: "NDA", title: "NDA — Tucson Medical Center Pilot", verified: false },
    ]});
  }

  // ── NOTIFICATIONS ──────────────────────────────────────────────────────────

  await prisma.notification.createMany({ skipDuplicates: true, data: [
    { userId: adminUser.id, title: "New Admission", body: "Adult inpatient admission confirmed from Valleywise Health. Liaison: Sarah Morales.", type: "SUCCESS", link: "/admin/opportunities" },
    { userId: adminUser.id, title: "AHCCCS Auth Approved", body: "AHCCCS authorization approved for dual diagnosis admission (Abrazo referral).", type: "SUCCESS", link: "/admin/opportunities" },
    { userId: adminUser.id, title: "Invoice Overdue", body: "INV-DS-2026-005 from EMPACT-SPC is 40 days overdue ($1,800).", type: "WARNING", link: "/admin/invoices" },
    { userId: adminUser.id, title: "Title 36 Hold — Clinical Review", body: "EMPACT crisis referral in clinical review. Bed availability: 1 dual dx bed remaining.", type: "INFO", link: "/admin/opportunities" },
    { userId: adminUser.id, title: "Census Alert", body: "Dual diagnosis unit at 94% capacity (15/16 beds). Consider early discharge planning.", type: "WARNING", link: "/admin/census" },
    { userId: repUser.id, title: "New Referral Assigned", body: "Title 36 hold from EMPACT-SPC has been assigned to you. Clinical review in progress.", type: "INFO", link: "/rep/opportunities" },
    { userId: repUser.id, title: "Payment Processed", body: "Your Q1 2026 liaison fee of $6,200 has been deposited.", type: "SUCCESS", link: "/rep/payments" },
  ]});

  // ── REFERRAL SOURCES ───────────────────────────────────────────────────────

  const refSources = [
    { name: "Valleywise Health Medical Center — ED", type: "EMERGENCY_DEPARTMENT" as const, specialty: "Emergency Medicine / Behavioral Health", contactName: "Michael Ramirez", phone: "602-555-2200", city: "Phoenix", state: "AZ", assignedRepId: rep1?.id, monthlyGoal: 6, active: true },
    { name: "HonorHealth Scottsdale Shea — ED", type: "EMERGENCY_DEPARTMENT" as const, specialty: "Emergency Medicine", contactName: "Jennifer Lau", phone: "480-555-3300", city: "Scottsdale", state: "AZ", assignedRepId: rep2?.id, monthlyGoal: 4, active: true },
    { name: "Abrazo Central Campus — ED", type: "EMERGENCY_DEPARTMENT" as const, specialty: "Emergency Medicine", contactName: "David Torres", phone: "602-555-4400", city: "Phoenix", state: "AZ", assignedRepId: rep1?.id, monthlyGoal: 3, active: true },
    { name: "Maricopa County Mental Health Court", type: "COURT_LEGAL_SYSTEM" as const, specialty: "Court-Ordered Treatment / AOT", contactName: "Judge Patricia Wren", phone: "602-555-5500", city: "Phoenix", state: "AZ", assignedRepId: rep1?.id, monthlyGoal: 2, active: true },
    { name: "EMPACT-SPC Crisis Services", type: "CRISIS_STABILIZATION_UNIT" as const, specialty: "Mobile Crisis / Crisis Stabilization", contactName: "Rosa Martinez", phone: "480-555-6600", city: "Tempe", state: "AZ", assignedRepId: rep1?.id, monthlyGoal: 3, active: true },
    { name: "Ironwood Family Medicine — North Phoenix", type: "PRIMARY_CARE_PHYSICIAN" as const, specialty: "Family Medicine / Geriatric Care", contactName: "Dr. James Park", phone: "480-555-7700", city: "Phoenix", state: "AZ", assignedRepId: rep2?.id, monthlyGoal: 1, active: true },
    { name: "Arizona DCS — Maricopa Regional", type: "COURT_LEGAL_SYSTEM" as const, specialty: "Child & Family Services / DCS", contactName: "Sandra Nguyen", city: "Phoenix", state: "AZ", assignedRepId: rep1?.id, monthlyGoal: 1, active: true },
    { name: "Recovery Empowerment Network (REN)", type: "PEER_SUPPORT" as const, specialty: "Peer Support / Recovery Coaching", city: "Phoenix", state: "AZ", assignedRepId: rep1?.id, monthlyGoal: 1, active: true },
  ];

  for (const rs of refSources) {
    await prisma.referralSource.create({ data: rs });
  }

  // ── COMMUNICATION TEMPLATES ────────────────────────────────────────────────

  await prisma.communicationTemplate.createMany({ skipDuplicates: true, data: [
    {
      name: "In-Service Training Offer",
      subject: "Complimentary In-Service Training — Destiny Springs Healthcare",
      body: "Hi {{name}},\n\nI hope you're doing well! I'm reaching out on behalf of Destiny Springs Healthcare, an inpatient acute psychiatric hospital serving adults, adolescents, and older adults across Arizona.\n\nWe offer complimentary in-service training for ED social work teams, care coordinators, and clinical staff covering:\n\n• Arizona Title 36 emergency psychiatric hold process (ARS §36-520)\n• Admission criteria and appropriate level-of-care determination\n• AHCCCS authorization and commercial insurance timelines\n• Aftercare and discharge planning coordination\n\nOur training qualifies for up to 3 CEUs and can be scheduled at your convenience.\n\nWould your team be interested in scheduling a session? I'd love to connect.\n\nWarm regards,\n{{sender}}\nBehavioral Health Liaison — Destiny Springs Healthcare",
      category: "INVITATION",
      isGlobal: true,
    },
    {
      name: "Successful Admission Thank-You",
      subject: "Thank you for the referral — {{patient_initials}} admitted",
      body: "Hi {{name}},\n\nThank you for referring {{patient_initials}} to Destiny Springs Healthcare. I'm pleased to confirm that the admission was completed successfully.\n\nOur clinical team will provide comprehensive inpatient psychiatric care, and we'll keep you updated on progress toward discharge and aftercare planning.\n\nAs always, I'm available if you have any questions or need a status update. We genuinely appreciate your partnership.\n\nGratefully,\n{{sender}}\nBehavioral Health Liaison — Destiny Springs Healthcare",
      category: "THANK_YOU",
      isGlobal: true,
    },
    {
      name: "Referral Source Quarterly Check-In",
      subject: "Checking in — Q{{quarter}} {{year}} | Destiny Springs",
      body: "Hi {{name}},\n\nI wanted to reach out as we head into Q{{quarter}} and say thank you for your continued partnership with Destiny Springs Healthcare.\n\nA few updates you may find helpful:\n\n• Current census: {{census_note}}\n• AHCCCS and commercial authorization turnaround: typically 24–48 hours\n• We now offer telehealth pre-admission assessments for clinical triage\n\nI'd love to schedule a brief 15-minute check-in to hear how things are going on your end and share any updates from our team.\n\nAre you available for a call this week or next?\n\nBest,\n{{sender}}\nBehavioral Health Liaison — Destiny Springs Healthcare",
      category: "CHECK_IN",
      isGlobal: true,
    },
    {
      name: "New Liaison Introduction",
      subject: "Introduction — Behavioral Health Liaison, Destiny Springs Healthcare",
      body: "Hi {{name}},\n\nMy name is {{sender}}, and I'm the Behavioral Health Liaison for Destiny Springs Healthcare in Arizona. I'm reaching out to introduce myself and open the door to a collaborative referral partnership.\n\nDestiny Springs is an inpatient acute psychiatric hospital offering:\n\n• Adult, adolescent, and geriatric psychiatric units\n• Dual diagnosis (co-occurring mental health & substance use)\n• Title 36 emergency admissions (ARS §36-520) — 24/7\n• AHCCCS, Medicare, and most major commercial insurance\n\nI'd love to schedule a brief 15-minute introduction call or, if you're open to it, arrange a facility tour for your team.\n\nLooking forward to connecting!\n\n{{sender}}\nBehavioral Health Liaison — Destiny Springs Healthcare",
      category: "INTRODUCTION",
      isGlobal: true,
    },
    {
      name: "Facility Tour Invitation",
      subject: "You're Invited: Destiny Springs Healthcare Facility Tour",
      body: "Hi {{name}},\n\nI'd like to personally invite you and your team to a complimentary tour of Destiny Springs Healthcare.\n\nThe tour includes:\n• Overview of all inpatient psychiatric units (Adult, Adolescent, Geriatric, Dual Diagnosis)\n• Introduction to our admissions process and Title 36 workflow\n• Meet our clinical leadership and admissions team\n• Light lunch provided\n\nUpcoming tour dates:\n• {{date_1}}\n• {{date_2}}\n\nSpace is limited. To RSVP or request a private tour, simply reply to this email or call me at {{phone}}.\n\nWe look forward to welcoming you!\n\n{{sender}}\nBehavioral Health Liaison — Destiny Springs Healthcare",
      category: "INVITATION",
      isGlobal: true,
    },
    {
      name: "Aftercare & Discharge Follow-Up",
      subject: "Discharge planning underway — {{patient_initials}}",
      body: "Hi {{name}},\n\nI wanted to reach out to let you know that {{patient_initials}} is progressing well and our team has begun discharge planning.\n\nAnticipated discharge date: {{discharge_date}}\nAftercare plan: {{aftercare_plan}}\n\nWe'd like to coordinate with your team on continuity of care. Please let me know if you'd like to be included on the discharge summary or if there are any specific aftercare considerations we should be aware of.\n\nThank you again for your referral and ongoing partnership.\n\nWarm regards,\n{{sender}}\nBehavioral Health Liaison — Destiny Springs Healthcare",
      category: "FOLLOW_UP",
      isGlobal: true,
    },
  ]});

  // ── TASKS ─────────────────────────────────────────────────────────────────

  const now2 = new Date();
  function daysFromNow(n: number) {
    const d = new Date(now2);
    d.setDate(d.getDate() + n);
    return d;
  }

  if (rep1) {
    await prisma.task.createMany({ skipDuplicates: true, data: [
      { title: "Follow up with Valleywise social work team", status: "OPEN", priority: "HIGH", dueAt: daysFromNow(2), repId: rep1.id, createdByUserId: repUser.id, hospitalId: h1?.id, notes: "Call Michael Ramirez re: Q2 admission pipeline and CE scheduling." },
      { title: "Submit Q2 activity report", status: "IN_PROGRESS", priority: "MEDIUM", dueAt: daysFromNow(5), repId: rep1.id, createdByUserId: repUser.id, notes: "Include in-service attendee counts, referral totals, and mileage log." },
      { title: "Schedule AHCCCS-auth training for Abrazo staff", status: "OPEN", priority: "MEDIUM", dueAt: daysFromNow(10), repId: rep1.id, createdByUserId: repUser.id, hospitalId: h3?.id, notes: "Coordinate with David Torres on a convenient morning slot." },
      { title: "Renew BAA — Valleywise Health", status: "OPEN", priority: "HIGH", dueAt: daysFromNow(14), repId: rep1.id, createdByUserId: repUser.id, hospitalId: h1?.id, notes: "Current BAA expires end of Q2. Send renewal to compliance for countersignature." },
      { title: "Prepare Title 36 CE slide deck (Q3)", status: "OPEN", priority: "LOW", dueAt: daysFromNow(30), repId: rep1.id, createdByUserId: repUser.id, notes: "Update with 2026 ARS §36-520 amendments. Add real-case walkthrough slide." },
    ]});
  }
  if (rep2) {
    await prisma.task.createMany({ skipDuplicates: true, data: [
      { title: "Quarterly check-in — Banner Gateway", status: "OPEN", priority: "HIGH", dueAt: daysFromNow(3), repId: rep2.id, createdByUserId: rep2User.id, notes: "Review Q1 referral volume with Dr. Paul Kim and discuss summer census planning." },
      { title: "Renew Ironwood Family Medicine contract", status: "OPEN", priority: "HIGH", dueAt: daysFromNow(7), repId: rep2.id, createdByUserId: rep2User.id, hospitalId: h6?.id, notes: "Contract expired 12/31/2025. Draft 2026 renewal terms and route for signature." },
      { title: "Log HonorHealth in-service attendance records", status: "IN_PROGRESS", priority: "MEDIUM", dueAt: daysFromNow(1), repId: rep2.id, createdByUserId: rep2User.id, hospitalId: h2?.id, notes: "Capture CEU attendance sheet from April session — upload to CRM." },
    ]});
  }
  if (rep3) {
    await prisma.task.createMany({ skipDuplicates: true, data: [
      { title: "Intro call — Tucson Medical Center follow-up", status: "OPEN", priority: "HIGH", dueAt: daysFromNow(2), repId: rep3.id, createdByUserId: rep3User.id, notes: "Sandra Flores replied positively. Schedule 15-min intro call." },
      { title: "Update Southern AZ territory contact list", status: "OPEN", priority: "LOW", dueAt: daysFromNow(21), repId: rep3.id, createdByUserId: rep3User.id, notes: "Confirm contacts at Sonora BH, Casa Grande Regional, and TMC ED." },
    ]});
  }

  console.log("✅ Destiny Springs Healthcare CRM seed complete!");
  console.log("  ADMIN:   admin@destinysprings.com / admin123!");
  console.log("  REP:     sarah@destinysprings.com / rep123!");
  console.log("  ACCOUNT: socialwork@valleywise.org / account123!");
  console.log(`  Facilities: 6 | Inquiries: 8 | Admissions: 10 | Payors: 6 | Census: 1 snapshot`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());

