import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is not set");
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Seeding NyxAegis Hospital CRM with full demo data...");

  const adminPw = await bcrypt.hash("admin123!", 10);
  const repPw   = await bcrypt.hash("rep123!", 10);
  const accPw   = await bcrypt.hash("account123!", 10);

  // ── USERS ──────────────────────────────────────────────────────────────────

  const adminUser = await prisma.user.upsert({
    where: { email: "admin@nyxaegis.com" },
    update: {},
    create: { email: "admin@nyxaegis.com", name: "NyxAegis Admin", password: adminPw, role: "ADMIN" },
  });

  const repUser = await prisma.user.upsert({
    where: { email: "rep@nyxaegis.com" },
    update: {},
    create: {
      email: "rep@nyxaegis.com", name: "Jordan Rivera", password: repPw, role: "REP",
      rep: {
        create: {
          phone: "615-555-2345", city: "Nashville", state: "TN", title: "Senior Account Executive",
          territory: "Southeast US", status: "ACTIVE", rating: 4.8,
          hipaaTrainedAt: new Date("2024-01-15"), licensedStates: ["TN","KY","AL","GA","FL"],
          businessName: "Rivera BD Consulting", w9OnFile: true,
          territories: { create: [
            { state: "TN", city: "Nashville", region: "Middle Tennessee" },
            { state: "TN", city: "Memphis", region: "West Tennessee" },
            { state: "KY", region: "Kentucky" },
          ]},
        },
      },
    },
    include: { rep: true },
  });

  const rep2User = await prisma.user.upsert({
    where: { email: "marcus@nyxaegis.com" },
    update: {},
    create: {
      email: "marcus@nyxaegis.com", name: "Marcus Williams", password: repPw, role: "REP",
      rep: {
        create: {
          phone: "404-555-8821", city: "Atlanta", state: "GA", title: "Account Executive",
          territory: "Southeast - Georgia", status: "ACTIVE", rating: 4.5,
          hipaaTrainedAt: new Date("2024-03-20"), licensedStates: ["GA","FL","SC","NC"],
          businessName: "Williams Healthcare BD", w9OnFile: true,
          territories: { create: [
            { state: "GA", city: "Atlanta", region: "Metro Atlanta" },
            { state: "FL", city: "Jacksonville", region: "North Florida" },
          ]},
        },
      },
    },
    include: { rep: true },
  });

  const rep3User = await prisma.user.upsert({
    where: { email: "priya@nyxaegis.com" },
    update: {},
    create: {
      email: "priya@nyxaegis.com", name: "Priya Patel", password: repPw, role: "REP",
      rep: {
        create: {
          phone: "214-555-3344", city: "Dallas", state: "TX", title: "Regional Director",
          territory: "Texas", status: "ACTIVE", rating: 4.9,
          hipaaTrainedAt: new Date("2023-11-01"), licensedStates: ["TX","OK","LA","AR"],
          businessName: "Patel Health Solutions", w9OnFile: true,
          territories: { create: [
            { state: "TX", city: "Dallas", region: "DFW" },
            { state: "TX", city: "Houston", region: "Houston Metro" },
          ]},
        },
      },
    },
    include: { rep: true },
  });

  // Account portal user
  await prisma.user.upsert({
    where: { email: "contact@nashvillegeneral.com" },
    update: {},
    create: {
      email: "contact@nashvillegeneral.com", name: "Dr. Sarah Chen", password: accPw, role: "ACCOUNT",
      hospital: {
        create: {
          hospitalName: "Nashville General Medical Center", systemName: "Tennessee Health Alliance",
          hospitalType: "ACUTE_CARE", npi: "1234567890", bedCount: 450,
          annualRevenue: 280000000, serviceLines: ["Cardiology","Oncology","Orthopedics","Emergency Medicine"],
          primaryContactName: "Dr. Sarah Chen", primaryContactTitle: "Chief Medical Officer",
          primaryContactEmail: "contact@nashvillegeneral.com", primaryContactPhone: "615-555-1000",
          address: "1234 Medical Center Dr", city: "Nashville", state: "TN", zip: "37203",
          status: "ACTIVE", source: "REFERRAL", contractValue: 450000,
        },
      },
    },
  });

  // Get rep records
  const rep1 = await prisma.rep.findUnique({ where: { userId: repUser.id } });
  const rep2 = await prisma.rep.findUnique({ where: { userId: rep2User.id } });
  const rep3 = await prisma.rep.findUnique({ where: { userId: rep3User.id } });

  // ── HOSPITALS ──────────────────────────────────────────────────────────────

  const h1 = await prisma.hospital.findFirst({ where: { hospitalName: "Nashville General Medical Center" } });

  const h2 = await prisma.hospital.upsert({
    where: { userId: rep2User.id },
    update: {},
    create: {
      userId: rep2User.id,
      hospitalName: "Emory University Hospital", systemName: "Emory Healthcare",
      hospitalType: "ACUTE_CARE", npi: "1987654321", bedCount: 587,
      annualRevenue: 520000000, serviceLines: ["Cardiology","Neurology","Oncology","Transplant","Emergency Medicine"],
      primaryContactName: "Dr. James Kirk", primaryContactTitle: "VP Business Development",
      primaryContactEmail: "jkirk@emory.edu", primaryContactPhone: "404-555-2200",
      address: "1364 Clifton Rd NE", city: "Atlanta", state: "GA", zip: "30322",
      status: "ACTIVE", source: "CONFERENCE", contractValue: 680000, assignedRepId: rep2?.id,
    },
  });

  const h3User = await prisma.user.upsert({
    where: { email: "contact@presbyterian.com" },
    update: {},
    create: { email: "contact@presbyterian.com", name: "Lisa Monroe", password: accPw, role: "ACCOUNT" },
  });
  const h3 = await prisma.hospital.upsert({
    where: { userId: h3User.id },
    update: {},
    create: {
      userId: h3User.id,
      hospitalName: "Presbyterian Hospital of Dallas", systemName: "Texas Health Resources",
      hospitalType: "ACUTE_CARE", npi: "2345678901", bedCount: 631,
      annualRevenue: 490000000, serviceLines: ["Cardiology","Orthopedics","Womens Health","Surgical Services","Rehabilitation"],
      primaryContactName: "Lisa Monroe", primaryContactTitle: "Director of Strategic Partnerships",
      primaryContactEmail: "contact@presbyterian.com", primaryContactPhone: "214-555-3300",
      address: "8200 Walnut Hill Ln", city: "Dallas", state: "TX", zip: "75231",
      status: "ACTIVE", source: "INBOUND", contractValue: 380000, assignedRepId: rep3?.id,
    },
  });

  const h4User = await prisma.user.upsert({
    where: { email: "bd@stjoseph.com" },
    update: {},
    create: { email: "bd@stjoseph.com", name: "Robert Nguyen", password: accPw, role: "ACCOUNT" },
  });
  const h4 = await prisma.hospital.upsert({
    where: { userId: h4User.id },
    update: {},
    create: {
      userId: h4User.id,
      hospitalName: "St. Joseph's Regional Medical Center", systemName: "Ascension Health",
      hospitalType: "ACUTE_CARE", npi: "3456789012", bedCount: 311,
      annualRevenue: 210000000, serviceLines: ["Emergency Medicine","Cardiology","Behavioral Health","Primary Care"],
      primaryContactName: "Robert Nguyen", primaryContactTitle: "CMO",
      primaryContactEmail: "bd@stjoseph.com", primaryContactPhone: "615-555-4400",
      address: "2011 Murphy Ave", city: "Nashville", state: "TN", zip: "37203",
      status: "PROSPECT", source: "COLD_OUTREACH", contractValue: 220000, assignedRepId: rep1?.id,
    },
  });

  const h5User = await prisma.user.upsert({
    where: { email: "admin@childrensatlanta.org" },
    update: {},
    create: { email: "admin@childrensatlanta.org", name: "Dr. Maria Santos", password: accPw, role: "ACCOUNT" },
  });
  const h5 = await prisma.hospital.upsert({
    where: { userId: h5User.id },
    update: {},
    create: {
      userId: h5User.id,
      hospitalName: "Children's Healthcare of Atlanta", systemName: "CHOA",
      hospitalType: "CHILDRENS", npi: "4567890123", bedCount: 497,
      annualRevenue: 610000000, serviceLines: ["Pediatrics","Oncology","Cardiology","Neurology","Rehabilitation"],
      primaryContactName: "Dr. Maria Santos", primaryContactTitle: "Chief of Pediatric Services",
      primaryContactEmail: "admin@childrensatlanta.org", primaryContactPhone: "404-555-5500",
      address: "1600 Tullie Cir NE", city: "Atlanta", state: "GA", zip: "30329",
      status: "ACTIVE", source: "REFERRAL", contractValue: 750000, assignedRepId: rep2?.id,
    },
  });

  const h6User = await prisma.user.upsert({
    where: { email: "contact@methodist.com" },
    update: {},
    create: { email: "contact@methodist.com", name: "Tom Bradley", password: accPw, role: "ACCOUNT" },
  });
  const h6 = await prisma.hospital.upsert({
    where: { userId: h6User.id },
    update: {},
    create: {
      userId: h6User.id,
      hospitalName: "Houston Methodist Hospital", systemName: "Houston Methodist",
      hospitalType: "HEALTH_SYSTEM", npi: "5678901234", bedCount: 895,
      annualRevenue: 1100000000, serviceLines: ["Cardiology","Oncology","Orthopedics","Neurology","Transplant","Revenue Cycle"],
      primaryContactName: "Tom Bradley", primaryContactTitle: "SVP Partnerships",
      primaryContactEmail: "contact@methodist.com", primaryContactPhone: "713-555-6600",
      address: "6565 Fannin St", city: "Houston", state: "TX", zip: "77030",
      status: "ACTIVE", source: "EXISTING_RELATIONSHIP", contractValue: 995000, assignedRepId: rep3?.id,
    },
  });

  const hospitals = [h1, h2, h3, h4, h5, h6].filter(Boolean);

  // ── CONTACTS ───────────────────────────────────────────────────────────────

  if (h1) {
    await prisma.contact.createMany({ skipDuplicates: true, data: [
      { hospitalId: h1.id, name: "Dr. Sarah Chen", title: "Chief Medical Officer", type: "CMO", email: "s.chen@nashvillegeneral.com", phone: "615-555-1001", isPrimary: true },
      { hospitalId: h1.id, name: "Kevin Park", title: "CFO", type: "CFO", email: "k.park@nashvillegeneral.com", phone: "615-555-1002" },
      { hospitalId: h1.id, name: "Dr. Angela Ross", title: "Head of Cardiology", type: "DEPARTMENT_HEAD", email: "a.ross@nashvillegeneral.com", phone: "615-555-1003" },
    ]});
  }
  if (h2) {
    await prisma.contact.createMany({ skipDuplicates: true, data: [
      { hospitalId: h2.id, name: "Dr. James Kirk", title: "VP Business Development", type: "VP_BUSINESS_DEVELOPMENT", email: "jkirk@emory.edu", phone: "404-555-2201", isPrimary: true },
      { hospitalId: h2.id, name: "Patricia Wade", title: "COO", type: "COO", email: "pwade@emory.edu", phone: "404-555-2202" },
    ]});
  }
  if (h3) {
    await prisma.contact.createMany({ skipDuplicates: true, data: [
      { hospitalId: h3.id, name: "Lisa Monroe", title: "Director of Strategic Partnerships", type: "DIRECTOR", email: "lmonroe@texashealth.org", phone: "214-555-3301", isPrimary: true },
      { hospitalId: h3.id, name: "Dr. William Reed", title: "Physician Champion - Cardiology", type: "PHYSICIAN_CHAMPION", email: "wreed@texashealth.org", phone: "214-555-3302" },
    ]});
  }

  // ── LEADS ──────────────────────────────────────────────────────────────────

  const leadsData = [
    { hospitalName: "Memorial Hermann Health System", city: "Houston", state: "TX", hospitalType: "HEALTH_SYSTEM" as const, bedCount: 1200, contactName: "Dr. Amy Foster", contactTitle: "CEO", contactEmail: "afoster@memorialhermann.org", status: "QUALIFIED" as const, source: "CONFERENCE" as const, estimatedValue: 850000, priority: "HIGH", assignedRepId: rep3?.id },
    { hospitalName: "Vanderbilt University Medical Center", city: "Nashville", state: "TN", hospitalType: "ACUTE_CARE" as const, bedCount: 1035, contactName: "Dr. Richard Moore", contactTitle: "CMIO", contactEmail: "rmoore@vumc.org", status: "PROPOSAL_SENT" as const, source: "REFERRAL" as const, estimatedValue: 1200000, priority: "HIGH", assignedRepId: rep1?.id },
    { hospitalName: "Northside Hospital", city: "Atlanta", state: "GA", hospitalType: "ACUTE_CARE" as const, bedCount: 650, contactName: "Sandra Kim", contactTitle: "VP Operations", contactEmail: "skim@northside.com", status: "CONTACTED" as const, source: "LINKEDIN" as const, estimatedValue: 420000, priority: "MEDIUM", assignedRepId: rep2?.id },
    { hospitalName: "Baylor Scott & White Health", city: "Dallas", state: "TX", hospitalType: "HEALTH_SYSTEM" as const, bedCount: 5000, contactName: "Dr. Charles Brown", contactTitle: "CMO", contactEmail: "cbrown@baylorscottwhite.com", status: "NEGOTIATING" as const, source: "EXISTING_RELATIONSHIP" as const, estimatedValue: 2500000, priority: "HIGH", assignedRepId: rep3?.id },
    { hospitalName: "TriStar Skyline Medical Center", city: "Nashville", state: "TN", hospitalType: "ACUTE_CARE" as const, bedCount: 283, contactName: "Michael Torres", contactTitle: "Director of BD", status: "NEW" as const, source: "COLD_OUTREACH" as const, estimatedValue: 180000, priority: "LOW", assignedRepId: rep1?.id },
    { hospitalName: "WellStar Kennestone Hospital", city: "Marietta", state: "GA", hospitalType: "ACUTE_CARE" as const, bedCount: 633, contactName: "Janet Lee", contactTitle: "VP Strategic Initiatives", contanctEmail: "jlee@wellstar.org", status: "QUALIFIED" as const, source: "CONFERENCE" as const, estimatedValue: 560000, priority: "MEDIUM", assignedRepId: rep2?.id },
    { hospitalName: "Medical City Dallas Hospital", city: "Dallas", state: "TX", hospitalType: "ACUTE_CARE" as const, bedCount: 669, contactName: "Dr. Steven Park", contactTitle: "Chief of Surgery", status: "WON" as const, source: "INBOUND" as const, estimatedValue: 390000, priority: "MEDIUM", assignedRepId: rep3?.id },
    { hospitalName: "Erlanger Health System", city: "Chattanooga", state: "TN", hospitalType: "ACUTE_CARE" as const, bedCount: 560, contactName: "Dr. Linda Hayes", contactTitle: "CMO", status: "NEW" as const, source: "REFERRAL" as const, estimatedValue: 310000, priority: "MEDIUM", assignedRepId: rep1?.id },
  ];

  for (const lead of leadsData) {
    await prisma.lead.create({ data: lead as Parameters<typeof prisma.lead.create>[0]["data"] });
  }

  // ── OPPORTUNITIES ──────────────────────────────────────────────────────────

  const oppsData = [
    { title: "Cardiology Revenue Cycle Optimization", hospitalId: h1!.id, assignedRepId: rep1?.id, stage: "PROPOSAL" as const, serviceLine: "CARDIOLOGY" as const, value: 280000, closeDate: new Date("2026-04-30"), priority: "HIGH", description: "Full cardiology RCM overhaul targeting 12% revenue lift." },
    { title: "Oncology Care Navigation Platform", hospitalId: h1!.id, assignedRepId: rep1?.id, stage: "NEGOTIATION" as const, serviceLine: "ONCOLOGY" as const, value: 175000, closeDate: new Date("2026-03-31"), priority: "HIGH", description: "Patient navigation and care coordination for oncology service line." },
    { title: "Enterprise EHR Integration Services", hospitalId: h2.id, assignedRepId: rep2?.id, stage: "CLOSED_WON" as const, serviceLine: "IT_SOLUTIONS" as const, value: 450000, closeDate: new Date("2026-02-15"), priority: "HIGH", description: "Epic integration project - complete." },
    { title: "Orthopedic Surgical Services Expansion", hospitalId: h3.id, assignedRepId: rep3?.id, stage: "DEMO" as const, serviceLine: "ORTHOPEDICS" as const, value: 220000, closeDate: new Date("2026-05-15"), priority: "MEDIUM" },
    { title: "Emergency Department Staffing Solution", hospitalId: h4.id, assignedRepId: rep1?.id, stage: "QUALIFICATION" as const, serviceLine: "EMERGENCY_MEDICINE" as const, value: 390000, closeDate: new Date("2026-06-01"), priority: "MEDIUM" },
    { title: "Pediatric Telehealth Program", hospitalId: h5.id, assignedRepId: rep2?.id, stage: "PROPOSAL" as const, serviceLine: "TELEHEALTH" as const, value: 310000, closeDate: new Date("2026-04-15"), priority: "HIGH" },
    { title: "Supply Chain Optimization Initiative", hospitalId: h6.id, assignedRepId: rep3?.id, stage: "DISCOVERY" as const, serviceLine: "SUPPLY_CHAIN" as const, value: 680000, closeDate: new Date("2026-07-01"), priority: "HIGH" },
    { title: "Neurology Telemedicine Expansion", hospitalId: h2.id, assignedRepId: rep2?.id, stage: "CLOSED_WON" as const, serviceLine: "NEUROLOGY" as const, value: 235000, closeDate: new Date("2025-12-01"), priority: "MEDIUM" },
    { title: "Behavioral Health Navigation Services", hospitalId: h4.id, assignedRepId: rep1?.id, stage: "DISCOVERY" as const, serviceLine: "BEHAVIORAL_HEALTH" as const, value: 145000, closeDate: new Date("2026-08-01"), priority: "LOW" },
    { title: "Women's Health Program Launch", hospitalId: h3.id, assignedRepId: rep3?.id, stage: "CLOSED_WON" as const, serviceLine: "WOMENS_HEALTH" as const, value: 165000, closeDate: new Date("2026-01-20"), priority: "MEDIUM" },
  ];

  const opportunities = [];
  for (const opp of oppsData) {
    const created = await prisma.opportunity.create({ data: opp });
    opportunities.push(created);
  }

  // ── INVOICES ───────────────────────────────────────────────────────────────

  await prisma.invoice.createMany({ skipDuplicates: true, data: [
    { invoiceNumber: "INV-2026-001", hospitalId: h1!.id, opportunityId: opportunities[0].id, status: "SENT", totalAmount: 70000, dueDate: new Date("2026-03-31"), lineItems: [{ description: "Phase 1 - Cardiology RCM Assessment", amount: 70000 }] },
    { invoiceNumber: "INV-2026-002", hospitalId: h2.id, opportunityId: opportunities[2].id, status: "PAID", totalAmount: 225000, dueDate: new Date("2026-02-28"), paidAt: new Date("2026-02-22"), lineItems: [{ description: "Epic EHR Integration - Final Payment", amount: 225000 }] },
    { invoiceNumber: "INV-2026-003", hospitalId: h2.id, opportunityId: opportunities[7].id, status: "PAID", totalAmount: 117500, dueDate: new Date("2025-12-15"), paidAt: new Date("2025-12-10"), lineItems: [{ description: "Neurology Telemedicine Setup", amount: 117500 }] },
    { invoiceNumber: "INV-2026-004", hospitalId: h3.id, opportunityId: opportunities[9].id, status: "PAID", totalAmount: 165000, dueDate: new Date("2026-01-31"), paidAt: new Date("2026-01-28"), lineItems: [{ description: "Women's Health Program - Full Contract", amount: 165000 }] },
    { invoiceNumber: "INV-2026-005", hospitalId: h5.id, opportunityId: opportunities[5].id, status: "SENT", totalAmount: 77500, dueDate: new Date("2026-04-15"), lineItems: [{ description: "Pediatric Telehealth - Discovery Phase", amount: 77500 }] },
    { invoiceNumber: "INV-2026-006", hospitalId: h6.id, status: "OVERDUE", totalAmount: 45000, dueDate: new Date("2026-02-15"), lineItems: [{ description: "Supply Chain Assessment - Initial Retainer", amount: 45000 }] },
    { invoiceNumber: "INV-2025-018", hospitalId: h1!.id, status: "PAID", totalAmount: 95000, dueDate: new Date("2025-11-30"), paidAt: new Date("2025-11-25") },
    { invoiceNumber: "INV-2025-019", hospitalId: h2.id, status: "PAID", totalAmount: 225000, dueDate: new Date("2025-10-31"), paidAt: new Date("2025-10-28") },
  ]});

  // ── CONTRACTS ──────────────────────────────────────────────────────────────

  await prisma.contract.createMany({ skipDuplicates: true, data: [
    { title: "Master Services Agreement - Nashville General", hospitalId: h1!.id, opportunityId: opportunities[0].id, assignedRepId: rep1?.id, status: "ACTIVE", startDate: new Date("2025-10-01"), endDate: new Date("2026-09-30"), value: 280000, terms: "12-month engagement with 90-day termination clause." },
    { title: "Enterprise Integration Contract - Emory", hospitalId: h2.id, opportunityId: opportunities[2].id, assignedRepId: rep2?.id, status: "SIGNED", startDate: new Date("2025-11-01"), endDate: new Date("2026-10-31"), value: 450000, terms: "Full Epic integration with 24/7 support SLA." },
    { title: "Oncology Navigation Agreement", hospitalId: h1!.id, opportunityId: opportunities[1].id, assignedRepId: rep1?.id, status: "DRAFT", value: 175000, terms: "Pending final approval from CMO." },
    { title: "Women's Health Program - Texas Presbyterian", hospitalId: h3.id, opportunityId: opportunities[9].id, assignedRepId: rep3?.id, status: "SIGNED", startDate: new Date("2026-01-01"), endDate: new Date("2026-12-31"), value: 165000 },
    { title: "Telehealth Services Agreement - CHOA", hospitalId: h5.id, opportunityId: opportunities[5].id, assignedRepId: rep2?.id, status: "SENT", value: 310000, terms: "Multi-year telehealth platform licensing and support." },
    { title: "Neurology Telemedicine - Emory (Renewal)", hospitalId: h2.id, opportunityId: opportunities[7].id, assignedRepId: rep2?.id, status: "EXPIRED", startDate: new Date("2025-01-01"), endDate: new Date("2025-12-31"), value: 235000 },
  ]});

  // ── ACTIVITIES ─────────────────────────────────────────────────────────────

  const activitiesData = [
    { type: "MEETING" as const, title: "Quarterly Business Review - Nashville General", hospitalId: h1!.id, repId: rep1?.id, opportunityId: opportunities[0].id, notes: "Presented Q1 roadmap. CMO approved Phase 2 scope.", completedAt: new Date("2026-02-28") },
    { type: "CALL" as const, title: "Contract Negotiation Call - Emory", hospitalId: h2.id, repId: rep2?.id, opportunityId: opportunities[2].id, notes: "Finalized payment terms. DocuSign sent.", completedAt: new Date("2026-02-20") },
    { type: "DEMO_COMPLETED" as const, title: "Telehealth Platform Demo - CHOA", hospitalId: h5.id, repId: rep2?.id, opportunityId: opportunities[5].id, notes: "Demo well-received by clinical staff. Follow-up scheduled.", completedAt: new Date("2026-03-01") },
    { type: "PROPOSAL_SENT" as const, title: "Cardiology RCM Proposal Sent", hospitalId: h1!.id, repId: rep1?.id, opportunityId: opportunities[0].id, notes: "47-page proposal with ROI analysis submitted.", completedAt: new Date("2026-02-15") },
    { type: "EMAIL" as const, title: "Follow-up: Supply Chain Discovery - Methodist", hospitalId: h6.id, repId: rep3?.id, opportunityId: opportunities[6].id, notes: "Sent executive summary and requested stakeholder meeting.", completedAt: new Date("2026-03-03") },
    { type: "SITE_VISIT" as const, title: "On-site Visit - Presbyterian Dallas", hospitalId: h3.id, repId: rep3?.id, notes: "Toured surgical suites. Identified 3 additional service line opportunities.", completedAt: new Date("2026-02-25") },
    { type: "CALL" as const, title: "Discovery Call - St. Joseph's", hospitalId: h4.id, repId: rep1?.id, opportunityId: opportunities[4].id, notes: "Identified ED staffing pain points. Qualified as HIGH priority.", completedAt: new Date("2026-03-02") },
    { type: "CONTRACT_SENT" as const, title: "Telehealth Contract Sent to CHOA Legal", hospitalId: h5.id, repId: rep2?.id, opportunityId: opportunities[5].id, notes: "Contract under review by CHOA legal team. Expected response in 10 days.", completedAt: new Date("2026-03-04") },
    { type: "NOTE" as const, title: "CRM Note: Methodist Supply Chain Champion identified", hospitalId: h6.id, repId: rep3?.id, notes: "VP Supply Chain is advocate. Getting internal approval for pilot.", completedAt: new Date("2026-03-04") },
    { type: "FOLLOW_UP" as const, title: "Follow-up scheduled: Vanderbilt VUMC", notes: "Call with CMIO to present final proposal for EHR integration.", scheduledAt: new Date("2026-03-10"), repId: rep1?.id },
  ];

  for (const act of activitiesData) {
    await prisma.activity.create({ data: act });
  }

  // ── REP PAYMENTS ───────────────────────────────────────────────────────────

  if (rep1) {
    await prisma.repPayment.createMany({ skipDuplicates: true, data: [
      { repId: rep1.id, amount: 28000, description: "Q4 2025 Commission - Nashville General", status: "PAID", paidAt: new Date("2026-01-15"), periodStart: new Date("2025-10-01"), periodEnd: new Date("2025-12-31") },
      { repId: rep1.id, amount: 14000, description: "January 2026 Draw", status: "PAID", paidAt: new Date("2026-02-01"), periodStart: new Date("2026-01-01"), periodEnd: new Date("2026-01-31") },
      { repId: rep1.id, amount: 14000, description: "February 2026 Draw", status: "PENDING", periodStart: new Date("2026-02-01"), periodEnd: new Date("2026-02-28") },
    ]});
  }
  if (rep2) {
    await prisma.repPayment.createMany({ skipDuplicates: true, data: [
      { repId: rep2.id, amount: 45000, description: "Emory EHR Integration Commission", status: "PAID", paidAt: new Date("2026-02-28"), periodStart: new Date("2025-11-01"), periodEnd: new Date("2026-02-28") },
      { repId: rep2.id, amount: 11750, description: "Q4 2025 Commission - Neurology", status: "PAID", paidAt: new Date("2026-01-20"), periodStart: new Date("2025-10-01"), periodEnd: new Date("2025-12-31") },
      { repId: rep2.id, amount: 16000, description: "March 2026 Draw", status: "PENDING", periodStart: new Date("2026-03-01"), periodEnd: new Date("2026-03-31") },
    ]});
  }
  if (rep3) {
    await prisma.repPayment.createMany({ skipDuplicates: true, data: [
      { repId: rep3.id, amount: 16500, description: "Women's Health Program Commission", status: "PAID", paidAt: new Date("2026-02-10"), periodStart: new Date("2026-01-01"), periodEnd: new Date("2026-01-31") },
      { repId: rep3.id, amount: 18000, description: "February 2026 Draw", status: "PENDING", periodStart: new Date("2026-02-01"), periodEnd: new Date("2026-02-28") },
    ]});
  }

  // ── COMPLIANCE DOCS ────────────────────────────────────────────────────────

  if (rep1) {
    await prisma.complianceDoc.createMany({ skipDuplicates: true, data: [
      { repId: rep1.id, type: "HIPAA_TRAINING", title: "HIPAA Certification 2024", verified: true, expiresAt: new Date("2026-01-15") },
      { repId: rep1.id, type: "W9", title: "W-9 Form 2024", verified: true },
      { repId: rep1.id, type: "STATE_LICENSE", title: "TN Business License", verified: true, expiresAt: new Date("2026-12-31") },
    ]});
  }
  if (rep2) {
    await prisma.complianceDoc.createMany({ skipDuplicates: true, data: [
      { repId: rep2.id, type: "HIPAA_TRAINING", title: "HIPAA Certification 2024", verified: true, expiresAt: new Date("2026-03-20") },
      { repId: rep2.id, type: "W9", title: "W-9 Form 2025", verified: true },
      { repId: rep2.id, type: "NDA", title: "Emory NDA", verified: true },
    ]});
  }
  if (rep3) {
    await prisma.complianceDoc.createMany({ skipDuplicates: true, data: [
      { repId: rep3.id, type: "HIPAA_TRAINING", title: "HIPAA Certification 2023", verified: true, expiresAt: new Date("2025-11-01") },
      { repId: rep3.id, type: "W9", title: "W-9 Form 2024", verified: true },
      { repId: rep3.id, type: "BAA", title: "Business Associate Agreement - Methodist", verified: true },
    ]});
  }

  // ── NOTIFICATIONS ──────────────────────────────────────────────────────────

  await prisma.notification.createMany({ skipDuplicates: true, data: [
    { userId: adminUser.id, title: "Contract Signed", body: "Emory University Hospital signed the enterprise integration contract.", type: "SUCCESS", link: "/admin/contracts" },
    { userId: adminUser.id, title: "Invoice Overdue", body: "INV-2026-006 from Houston Methodist is 17 days overdue.", type: "WARNING", link: "/admin/invoices" },
    { userId: adminUser.id, title: "New Lead Qualified", body: "Baylor Scott & White qualified by Priya Patel — est. $2.5M.", type: "INFO", link: "/admin/leads" },
    { userId: repUser.id, title: "Proposal Accepted", body: "Nashville General approved your Cardiology RCM proposal.", type: "SUCCESS", link: "/rep/opportunities" },
    { userId: repUser.id, title: "Payment Processed", body: "Your Q4 2025 commission of $28,000 has been paid.", type: "SUCCESS", link: "/rep/payments" },
  ]});

  // ── COMMUNICATION TEMPLATES ─────────────────────────────────────────────────
  await prisma.communicationTemplate.createMany({ skipDuplicates: true, data: [
    {
      name: "Warm Introduction",
      subject: "Introduction — NyxAegis Partnership",
      body: "Hi {{name}},\n\nI hope this message finds you well. My name is {{sender}} and I work with NyxAegis helping healthcare organizations maximize their referral relationships.\n\nI'd love to connect for a brief 15-minute call to learn more about your organization's goals and share how we've helped similar teams grow their referral volume by 30–50%.\n\nWould any time next week work for a quick intro call?\n\nBest regards,\n{{sender}}",
      category: "INTRODUCTION",
      isGlobal: true,
    },
    {
      name: "Follow-Up After Meeting",
      subject: "Great connecting with you — next steps",
      body: "Hi {{name}},\n\nIt was a pleasure speaking with you today. I wanted to follow up on a few key points we discussed:\n\n• {{point_1}}\n• {{point_2}}\n• {{point_3}}\n\nAs discussed, I'll send over the proposal by end of week. In the meantime, please don't hesitate to reach out if you have any questions.\n\nLooking forward to moving forward together.\n\nBest,\n{{sender}}",
      category: "FOLLOW_UP",
      isGlobal: true,
    },
    {
      name: "Check-In (Quarterly)",
      subject: "Checking in — Q{{quarter}} {{year}}",
      body: "Hi {{name}},\n\nI wanted to reach out and check in as we head into Q{{quarter}}. It's been a while since we've connected, and I'd love to hear how things are going on your end.\n\nWe've rolled out several new features I think would be valuable for your team — including AI-powered pipeline insights and automated referral tracking.\n\nWould you be open to a quick 20-minute catch-up call this week or next?\n\nWarm regards,\n{{sender}}",
      category: "CHECK_IN",
      isGlobal: true,
    },
    {
      name: "Proposal Cover Note",
      subject: "Proposal for {{organization}} — NyxAegis",
      body: "Hi {{name}},\n\nThank you for the opportunity to put together this proposal for {{organization}}. Attached, you'll find a detailed overview of our recommended approach, projected outcomes, and investment information.\n\nHighlights:\n• Referral tracking and source attribution\n• AI-powered opportunity insights\n• Dedicated BD rep portal and account management\n• Full compliance and contract management\n\nI'm available for a review call at your convenience. Please let me know your thoughts!\n\nBest,\n{{sender}}",
      category: "PROPOSAL",
      isGlobal: true,
    },
    {
      name: "Thank You — Referral",
      subject: "Thank you for the referral!",
      body: "Hi {{name}},\n\nI just wanted to take a moment to sincerely thank you for the referral to {{contact}}. Referrals are the highest compliment we receive, and we take great care to ensure every referred contact has an exceptional experience.\n\nPlease know that I'm always here if you or anyone in your network could use our support.\n\nGratefully,\n{{sender}}",
      category: "THANK_YOU",
      isGlobal: true,
    },
    {
      name: "Event / Webinar Invitation",
      subject: "You're invited: {{event_name}}",
      body: "Hi {{name}},\n\nI wanted to personally invite you to {{event_name}}, happening on {{date}} at {{time}}.\n\nThis {{format}} will cover:\n• {{topic_1}}\n• {{topic_2}}\n• {{topic_3}}\n\nSpots are limited — RSVP here: {{link}}\n\nI hope to see you there!\n\n{{sender}}",
      category: "INVITATION",
      isGlobal: true,
    },
  ]});

  console.log("✅ Full demo seed complete!");
  console.log("  ADMIN:   admin@nyxaegis.com / admin123!");
  console.log("  REP:     rep@nyxaegis.com / rep123!");
  console.log("  ACCOUNT: contact@nashvillegeneral.com / account123!");
  console.log(`  Hospitals: 6 | Leads: 8 | Opportunities: 10 | Invoices: 8 | Contracts: 6`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());

