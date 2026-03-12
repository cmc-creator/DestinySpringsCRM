import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (!secret || secret !== "nyxaegis-seed-2026") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const adminPw = await bcrypt.hash("admin123!", 10);
    const repPw   = await bcrypt.hash("rep123!", 10);
    const accPw   = await bcrypt.hash("account123!", 10);

    const adminUser = await prisma.user.upsert({ where: { email: "admin@nyxaegis.com" }, update: {}, create: { email: "admin@nyxaegis.com", name: "NyxAegis Admin", password: adminPw, role: "ADMIN" } });

    const repUser = await prisma.user.upsert({
      where: { email: "rep@nyxaegis.com" }, update: {},
      create: {
        email: "rep@nyxaegis.com", name: "Jordan Rivera", password: repPw, role: "REP",
        rep: { create: { phone: "615-555-2345", city: "Nashville", state: "TN", title: "Senior Account Executive", territory: "Southeast US", status: "ACTIVE", rating: 4.8, hipaaTrainedAt: new Date("2024-01-15"), licensedStates: ["TN","KY","AL","GA","FL"], businessName: "Rivera BD Consulting", w9OnFile: true, territories: { create: [{ state: "TN", city: "Nashville", region: "Middle Tennessee" }, { state: "KY", region: "Kentucky" }] } } },
      },
    });

    const rep2User = await prisma.user.upsert({
      where: { email: "marcus@nyxaegis.com" }, update: {},
      create: {
        email: "marcus@nyxaegis.com", name: "Marcus Williams", password: repPw, role: "REP",
        rep: { create: { phone: "404-555-8821", city: "Atlanta", state: "GA", title: "Account Executive", territory: "Southeast - Georgia", status: "ACTIVE", rating: 4.5, hipaaTrainedAt: new Date("2024-03-20"), licensedStates: ["GA","FL","SC","NC"], businessName: "Williams Healthcare BD", w9OnFile: true, territories: { create: [{ state: "GA", city: "Atlanta", region: "Metro Atlanta" }] } } },
      },
    });

    const rep3User = await prisma.user.upsert({
      where: { email: "priya@nyxaegis.com" }, update: {},
      create: {
        email: "priya@nyxaegis.com", name: "Priya Patel", password: repPw, role: "REP",
        rep: { create: { phone: "214-555-3344", city: "Dallas", state: "TX", title: "Regional Director", territory: "Texas", status: "ACTIVE", rating: 4.9, hipaaTrainedAt: new Date("2023-11-01"), licensedStates: ["TX","OK","LA","AR"], businessName: "Patel Health Solutions", w9OnFile: true, territories: { create: [{ state: "TX", city: "Dallas", region: "DFW" }, { state: "TX", city: "Houston", region: "Houston Metro" }] } } },
      },
    });

    await prisma.user.upsert({
      where: { email: "contact@nashvillegeneral.com" }, update: {},
      create: {
        email: "contact@nashvillegeneral.com", name: "Dr. Sarah Chen", password: accPw, role: "ACCOUNT",
        hospital: { create: { hospitalName: "Nashville General Medical Center", systemName: "Tennessee Health Alliance", hospitalType: "ACUTE_CARE", npi: "1234567890", bedCount: 450, annualRevenue: 280000000, serviceLines: ["Cardiology","Oncology","Orthopedics","Emergency Medicine"], primaryContactName: "Dr. Sarah Chen", primaryContactTitle: "Chief Medical Officer", primaryContactEmail: "contact@nashvillegeneral.com", primaryContactPhone: "615-555-1000", address: "1234 Medical Center Dr", city: "Nashville", state: "TN", zip: "37203", status: "ACTIVE", source: "REFERRAL", contractValue: 450000 } },
      },
    });

    const rep1 = await prisma.rep.findUnique({ where: { userId: repUser.id } });
    const rep2 = await prisma.rep.findUnique({ where: { userId: rep2User.id } });
    const rep3 = await prisma.rep.findUnique({ where: { userId: rep3User.id } });
    const h1 = await prisma.hospital.findFirst({ where: { hospitalName: "Nashville General Medical Center" } });

    // Additional hospitals
    const h2u = await prisma.user.upsert({ where: { email: "bd@emory.edu" }, update: {}, create: { email: "bd@emory.edu", name: "Dr. James Kirk", password: accPw, role: "ACCOUNT" } });
    const h2 = await prisma.hospital.upsert({ where: { userId: h2u.id }, update: {}, create: { userId: h2u.id, hospitalName: "Emory University Hospital", systemName: "Emory Healthcare", hospitalType: "ACUTE_CARE", npi: "1987654321", bedCount: 587, annualRevenue: 520000000, serviceLines: ["Cardiology","Neurology","Oncology","Transplant"], primaryContactName: "Dr. James Kirk", primaryContactTitle: "VP Business Development", primaryContactEmail: "bd@emory.edu", primaryContactPhone: "404-555-2200", address: "1364 Clifton Rd NE", city: "Atlanta", state: "GA", zip: "30322", status: "ACTIVE", source: "CONFERENCE", contractValue: 680000, assignedRepId: rep2?.id } });

    const h3u = await prisma.user.upsert({ where: { email: "contact@presbyterian.com" }, update: {}, create: { email: "contact@presbyterian.com", name: "Lisa Monroe", password: accPw, role: "ACCOUNT" } });
    const h3 = await prisma.hospital.upsert({ where: { userId: h3u.id }, update: {}, create: { userId: h3u.id, hospitalName: "Presbyterian Hospital of Dallas", systemName: "Texas Health Resources", hospitalType: "ACUTE_CARE", npi: "2345678901", bedCount: 631, annualRevenue: 490000000, serviceLines: ["Cardiology","Orthopedics","Womens Health","Surgical Services"], primaryContactName: "Lisa Monroe", primaryContactTitle: "Director of Strategic Partnerships", primaryContactEmail: "contact@presbyterian.com", primaryContactPhone: "214-555-3300", address: "8200 Walnut Hill Ln", city: "Dallas", state: "TX", zip: "75231", status: "ACTIVE", source: "INBOUND", contractValue: 380000, assignedRepId: rep3?.id } });

    const h4u = await prisma.user.upsert({ where: { email: "bd@stjoseph.com" }, update: {}, create: { email: "bd@stjoseph.com", name: "Robert Nguyen", password: accPw, role: "ACCOUNT" } });
    const h4 = await prisma.hospital.upsert({ where: { userId: h4u.id }, update: {}, create: { userId: h4u.id, hospitalName: "St. Joseph's Regional Medical Center", systemName: "Ascension Health", hospitalType: "ACUTE_CARE", npi: "3456789012", bedCount: 311, annualRevenue: 210000000, serviceLines: ["Emergency Medicine","Cardiology","Behavioral Health"], primaryContactName: "Robert Nguyen", primaryContactTitle: "CMO", primaryContactEmail: "bd@stjoseph.com", primaryContactPhone: "615-555-4400", address: "2011 Murphy Ave", city: "Nashville", state: "TN", zip: "37203", status: "PROSPECT", source: "COLD_OUTREACH", contractValue: 220000, assignedRepId: rep1?.id } });

    const h5u = await prisma.user.upsert({ where: { email: "admin@childrensatlanta.org" }, update: {}, create: { email: "admin@childrensatlanta.org", name: "Dr. Maria Santos", password: accPw, role: "ACCOUNT" } });
    const h5 = await prisma.hospital.upsert({ where: { userId: h5u.id }, update: {}, create: { userId: h5u.id, hospitalName: "Children's Healthcare of Atlanta", systemName: "CHOA", hospitalType: "CHILDRENS", npi: "4567890123", bedCount: 497, annualRevenue: 610000000, serviceLines: ["Pediatrics","Oncology","Cardiology","Neurology"], primaryContactName: "Dr. Maria Santos", primaryContactTitle: "Chief of Pediatric Services", primaryContactEmail: "admin@childrensatlanta.org", primaryContactPhone: "404-555-5500", address: "1600 Tullie Cir NE", city: "Atlanta", state: "GA", zip: "30329", status: "ACTIVE", source: "REFERRAL", contractValue: 750000, assignedRepId: rep2?.id } });

    const h6u = await prisma.user.upsert({ where: { email: "contact@methodist.com" }, update: {}, create: { email: "contact@methodist.com", name: "Tom Bradley", password: accPw, role: "ACCOUNT" } });
    const h6 = await prisma.hospital.upsert({ where: { userId: h6u.id }, update: {}, create: { userId: h6u.id, hospitalName: "Houston Methodist Hospital", systemName: "Houston Methodist", hospitalType: "HEALTH_SYSTEM", npi: "5678901234", bedCount: 895, annualRevenue: 1100000000, serviceLines: ["Cardiology","Oncology","Orthopedics","Neurology","Revenue Cycle"], primaryContactName: "Tom Bradley", primaryContactTitle: "SVP Partnerships", primaryContactEmail: "contact@methodist.com", primaryContactPhone: "713-555-6600", address: "6565 Fannin St", city: "Houston", state: "TX", zip: "77030", status: "ACTIVE", source: "EXISTING_RELATIONSHIP", contractValue: 995000, assignedRepId: rep3?.id } });

    // Contacts
    if (h1) await prisma.contact.createMany({ skipDuplicates: true, data: [
      { hospitalId: h1.id, name: "Dr. Sarah Chen", title: "CMO", type: "CMO", email: "s.chen@nashvillegeneral.com", phone: "615-555-1001", isPrimary: true },
      { hospitalId: h1.id, name: "Kevin Park", title: "CFO", type: "CFO", email: "k.park@nashvillegeneral.com", phone: "615-555-1002" },
      { hospitalId: h1.id, name: "Dr. Angela Ross", title: "Head of Cardiology", type: "DEPARTMENT_HEAD", email: "a.ross@nashvillegeneral.com" },
    ]});
    await prisma.contact.createMany({ skipDuplicates: true, data: [
      { hospitalId: h2.id, name: "Dr. James Kirk", title: "VP Business Development", type: "VP_BUSINESS_DEVELOPMENT", email: "jkirk@emory.edu", isPrimary: true },
      { hospitalId: h3.id, name: "Lisa Monroe", title: "Director of Strategic Partnerships", type: "DIRECTOR", email: "lmonroe@texashealth.org", isPrimary: true },
      { hospitalId: h4.id, name: "Robert Nguyen", title: "CMO", type: "CMO", email: "bd@stjoseph.com", isPrimary: true },
      { hospitalId: h5.id, name: "Dr. Maria Santos", title: "Chief of Pediatric Services", type: "CMO", email: "admin@childrensatlanta.org", isPrimary: true },
      { hospitalId: h6.id, name: "Tom Bradley", title: "SVP Partnerships", type: "VP_BUSINESS_DEVELOPMENT", email: "contact@methodist.com", isPrimary: true },
    ]});

    // Leads
    await prisma.lead.createMany({ skipDuplicates: true, data: [
      { hospitalName: "Memorial Hermann Health System", city: "Houston", state: "TX", hospitalType: "HEALTH_SYSTEM", bedCount: 1200, contactName: "Dr. Amy Foster", contactTitle: "CEO", status: "QUALIFIED", source: "CONFERENCE", estimatedValue: 850000, priority: "HIGH", assignedRepId: rep3?.id },
      { hospitalName: "Vanderbilt University Medical Center", city: "Nashville", state: "TN", hospitalType: "ACUTE_CARE", bedCount: 1035, contactName: "Dr. Richard Moore", contactTitle: "CMIO", contactEmail: "rmoore@vumc.org", status: "PROPOSAL_SENT", source: "REFERRAL", estimatedValue: 1200000, priority: "HIGH", assignedRepId: rep1?.id },
      { hospitalName: "Northside Hospital", city: "Atlanta", state: "GA", hospitalType: "ACUTE_CARE", bedCount: 650, contactName: "Sandra Kim", contactTitle: "VP Operations", status: "CONTACTED", source: "LINKEDIN", estimatedValue: 420000, priority: "MEDIUM", assignedRepId: rep2?.id },
      { hospitalName: "Baylor Scott & White Health", city: "Dallas", state: "TX", hospitalType: "HEALTH_SYSTEM", bedCount: 5000, contactName: "Dr. Charles Brown", contactTitle: "CMO", status: "NEGOTIATING", source: "EXISTING_RELATIONSHIP", estimatedValue: 2500000, priority: "HIGH", assignedRepId: rep3?.id },
      { hospitalName: "TriStar Skyline Medical Center", city: "Nashville", state: "TN", hospitalType: "ACUTE_CARE", bedCount: 283, contactName: "Michael Torres", contactTitle: "Director of BD", status: "NEW", source: "COLD_OUTREACH", estimatedValue: 180000, priority: "LOW", assignedRepId: rep1?.id },
      { hospitalName: "WellStar Kennestone Hospital", city: "Marietta", state: "GA", hospitalType: "ACUTE_CARE", bedCount: 633, contactName: "Janet Lee", contactTitle: "VP Strategic Initiatives", status: "QUALIFIED", source: "CONFERENCE", estimatedValue: 560000, priority: "MEDIUM", assignedRepId: rep2?.id },
      { hospitalName: "Medical City Dallas Hospital", city: "Dallas", state: "TX", hospitalType: "ACUTE_CARE", bedCount: 669, contactName: "Dr. Steven Park", contactTitle: "Chief of Surgery", status: "WON", source: "INBOUND", estimatedValue: 390000, priority: "MEDIUM", assignedRepId: rep3?.id },
      { hospitalName: "Erlanger Health System", city: "Chattanooga", state: "TN", hospitalType: "ACUTE_CARE", bedCount: 560, contactName: "Dr. Linda Hayes", contactTitle: "CMO", status: "NEW", source: "REFERRAL", estimatedValue: 310000, priority: "MEDIUM", assignedRepId: rep1?.id },
    ]});

    // Opportunities
    const opp1 = await prisma.opportunity.create({ data: { title: "Cardiology Revenue Cycle Optimization", hospitalId: h1!.id, assignedRepId: rep1?.id, stage: "PROPOSAL", serviceLine: "CARDIOLOGY", value: 280000, closeDate: new Date("2026-04-30"), priority: "HIGH", description: "Full cardiology RCM overhaul targeting 12% revenue lift." } });
    const opp2 = await prisma.opportunity.create({ data: { title: "Oncology Care Navigation Platform", hospitalId: h1!.id, assignedRepId: rep1?.id, stage: "NEGOTIATION", serviceLine: "ONCOLOGY", value: 175000, closeDate: new Date("2026-03-31"), priority: "HIGH" } });
    const opp3 = await prisma.opportunity.create({ data: { title: "Enterprise EHR Integration Services", hospitalId: h2.id, assignedRepId: rep2?.id, stage: "CLOSED_WON", serviceLine: "IT_SOLUTIONS", value: 450000, closeDate: new Date("2026-02-15"), priority: "HIGH" } });
    await prisma.opportunity.create({ data: { title: "Orthopedic Surgical Services Expansion", hospitalId: h3.id, assignedRepId: rep3?.id, stage: "DEMO", serviceLine: "ORTHOPEDICS", value: 220000, closeDate: new Date("2026-05-15"), priority: "MEDIUM" } });
    const opp5 = await prisma.opportunity.create({ data: { title: "Emergency Department Staffing Solution", hospitalId: h4.id, assignedRepId: rep1?.id, stage: "QUALIFICATION", serviceLine: "EMERGENCY_MEDICINE", value: 390000, closeDate: new Date("2026-06-01"), priority: "MEDIUM" } });
    const opp6 = await prisma.opportunity.create({ data: { title: "Pediatric Telehealth Program", hospitalId: h5.id, assignedRepId: rep2?.id, stage: "PROPOSAL", serviceLine: "TELEHEALTH", value: 310000, closeDate: new Date("2026-04-15"), priority: "HIGH" } });
    const opp7 = await prisma.opportunity.create({ data: { title: "Supply Chain Optimization Initiative", hospitalId: h6.id, assignedRepId: rep3?.id, stage: "DISCOVERY", serviceLine: "SUPPLY_CHAIN", value: 680000, closeDate: new Date("2026-07-01"), priority: "HIGH" } });
    const opp8 = await prisma.opportunity.create({ data: { title: "Neurology Telemedicine Expansion", hospitalId: h2.id, assignedRepId: rep2?.id, stage: "CLOSED_WON", serviceLine: "NEUROLOGY", value: 235000, closeDate: new Date("2025-12-01"), priority: "MEDIUM" } });
    const opp9 = await prisma.opportunity.create({ data: { title: "Women's Health Program Launch", hospitalId: h3.id, assignedRepId: rep3?.id, stage: "CLOSED_WON", serviceLine: "WOMENS_HEALTH", value: 165000, closeDate: new Date("2026-01-20"), priority: "MEDIUM" } });

    // Invoices
    await prisma.invoice.createMany({ skipDuplicates: true, data: [
      { invoiceNumber: "INV-2026-001", hospitalId: h1!.id, opportunityId: opp1.id, status: "SENT", totalAmount: 70000, dueDate: new Date("2026-03-31"), lineItems: [{ description: "Phase 1 - Cardiology RCM Assessment", amount: 70000 }] },
      { invoiceNumber: "INV-2026-002", hospitalId: h2.id, opportunityId: opp3.id, status: "PAID", totalAmount: 225000, dueDate: new Date("2026-02-28"), paidAt: new Date("2026-02-22"), lineItems: [{ description: "Epic EHR Integration - Final Payment", amount: 225000 }] },
      { invoiceNumber: "INV-2026-003", hospitalId: h2.id, opportunityId: opp8.id, status: "PAID", totalAmount: 117500, dueDate: new Date("2025-12-15"), paidAt: new Date("2025-12-10"), lineItems: [{ description: "Neurology Telemedicine Setup", amount: 117500 }] },
      { invoiceNumber: "INV-2026-004", hospitalId: h3.id, opportunityId: opp9.id, status: "PAID", totalAmount: 165000, dueDate: new Date("2026-01-31"), paidAt: new Date("2026-01-28"), lineItems: [{ description: "Women's Health Program - Full Contract", amount: 165000 }] },
      { invoiceNumber: "INV-2026-005", hospitalId: h5.id, opportunityId: opp6.id, status: "SENT", totalAmount: 77500, dueDate: new Date("2026-04-15"), lineItems: [{ description: "Pediatric Telehealth - Discovery Phase", amount: 77500 }] },
      { invoiceNumber: "INV-2026-006", hospitalId: h6.id, status: "OVERDUE", totalAmount: 45000, dueDate: new Date("2026-02-15"), lineItems: [{ description: "Supply Chain Assessment - Initial Retainer", amount: 45000 }] },
      { invoiceNumber: "INV-2025-018", hospitalId: h1!.id, status: "PAID", totalAmount: 95000, dueDate: new Date("2025-11-30"), paidAt: new Date("2025-11-25") },
      { invoiceNumber: "INV-2025-019", hospitalId: h2.id, status: "PAID", totalAmount: 225000, dueDate: new Date("2025-10-31"), paidAt: new Date("2025-10-28") },
    ]});

    // Contracts
    await prisma.contract.createMany({ skipDuplicates: true, data: [
      { title: "Master Services Agreement - Nashville General", hospitalId: h1!.id, opportunityId: opp1.id, assignedRepId: rep1?.id, status: "ACTIVE", startDate: new Date("2025-10-01"), endDate: new Date("2026-09-30"), value: 280000 },
      { title: "Enterprise Integration Contract - Emory", hospitalId: h2.id, opportunityId: opp3.id, assignedRepId: rep2?.id, status: "SIGNED", startDate: new Date("2025-11-01"), endDate: new Date("2026-10-31"), value: 450000 },
      { title: "Oncology Navigation Agreement", hospitalId: h1!.id, opportunityId: opp2.id, assignedRepId: rep1?.id, status: "DRAFT", value: 175000 },
      { title: "Women's Health Program - Texas Presbyterian", hospitalId: h3.id, opportunityId: opp9.id, assignedRepId: rep3?.id, status: "SIGNED", startDate: new Date("2026-01-01"), endDate: new Date("2026-12-31"), value: 165000 },
      { title: "Telehealth Services Agreement - CHOA", hospitalId: h5.id, opportunityId: opp6.id, assignedRepId: rep2?.id, status: "SENT", value: 310000 },
      { title: "Neurology Telemedicine - Emory (Expired)", hospitalId: h2.id, opportunityId: opp8.id, assignedRepId: rep2?.id, status: "EXPIRED", startDate: new Date("2025-01-01"), endDate: new Date("2025-12-31"), value: 235000 },
    ]});

    // Activities
    await prisma.activity.createMany({ skipDuplicates: true, data: [
      { type: "MEETING", title: "Quarterly Business Review - Nashville General", hospitalId: h1!.id, repId: rep1?.id, opportunityId: opp1.id, notes: "CMO approved Phase 2 scope.", completedAt: new Date("2026-02-28") },
      { type: "CALL", title: "Contract Negotiation Call - Emory", hospitalId: h2.id, repId: rep2?.id, opportunityId: opp3.id, notes: "Finalized payment terms. DocuSign sent.", completedAt: new Date("2026-02-20") },
      { type: "DEMO_COMPLETED", title: "Telehealth Platform Demo - CHOA", hospitalId: h5.id, repId: rep2?.id, opportunityId: opp6.id, notes: "Demo well-received. Follow-up scheduled.", completedAt: new Date("2026-03-01") },
      { type: "PROPOSAL_SENT", title: "Cardiology RCM Proposal Sent", hospitalId: h1!.id, repId: rep1?.id, opportunityId: opp1.id, notes: "47-page proposal with ROI analysis submitted.", completedAt: new Date("2026-02-15") },
      { type: "EMAIL", title: "Follow-up: Supply Chain Discovery - Methodist", hospitalId: h6.id, repId: rep3?.id, opportunityId: opp7.id, notes: "Sent executive summary and requested stakeholder meeting.", completedAt: new Date("2026-03-03") },
      { type: "SITE_VISIT", title: "On-site Visit - Presbyterian Dallas", hospitalId: h3.id, repId: rep3?.id, notes: "Toured surgical suites. Identified 3 additional opportunities.", completedAt: new Date("2026-02-25") },
      { type: "CALL", title: "Discovery Call - St. Joseph's", hospitalId: h4.id, repId: rep1?.id, opportunityId: opp5.id, notes: "Identified ED staffing pain points. Qualified as HIGH priority.", completedAt: new Date("2026-03-02") },
      { type: "CONTRACT_SENT", title: "Telehealth Contract Sent to CHOA Legal", hospitalId: h5.id, repId: rep2?.id, opportunityId: opp6.id, notes: "Under review. Expected response in 10 days.", completedAt: new Date("2026-03-04") },
      { type: "NOTE", title: "Supply Chain Champion identified at Methodist", hospitalId: h6.id, repId: rep3?.id, notes: "VP Supply Chain is advocate. Getting internal approval for pilot.", completedAt: new Date("2026-03-04") },
    ]});

    // Rep payments
    if (rep1) await prisma.repPayment.createMany({ skipDuplicates: true, data: [
      { repId: rep1.id, amount: 28000, description: "Q4 2025 Commission - Nashville General", status: "PAID", paidAt: new Date("2026-01-15"), periodStart: new Date("2025-10-01"), periodEnd: new Date("2025-12-31") },
      { repId: rep1.id, amount: 14000, description: "January 2026 Draw", status: "PAID", paidAt: new Date("2026-02-01"), periodStart: new Date("2026-01-01"), periodEnd: new Date("2026-01-31") },
      { repId: rep1.id, amount: 14000, description: "February 2026 Draw", status: "PENDING", periodStart: new Date("2026-02-01"), periodEnd: new Date("2026-02-28") },
    ]});
    if (rep2) await prisma.repPayment.createMany({ skipDuplicates: true, data: [
      { repId: rep2.id, amount: 45000, description: "Emory EHR Integration Commission", status: "PAID", paidAt: new Date("2026-02-28"), periodStart: new Date("2025-11-01"), periodEnd: new Date("2026-02-28") },
      { repId: rep2.id, amount: 11750, description: "Q4 2025 Commission - Neurology", status: "PAID", paidAt: new Date("2026-01-20"), periodStart: new Date("2025-10-01"), periodEnd: new Date("2025-12-31") },
      { repId: rep2.id, amount: 16000, description: "March 2026 Draw", status: "PENDING", periodStart: new Date("2026-03-01"), periodEnd: new Date("2026-03-31") },
    ]});
    if (rep3) await prisma.repPayment.createMany({ skipDuplicates: true, data: [
      { repId: rep3.id, amount: 16500, description: "Women's Health Program Commission", status: "PAID", paidAt: new Date("2026-02-10"), periodStart: new Date("2026-01-01"), periodEnd: new Date("2026-01-31") },
      { repId: rep3.id, amount: 18000, description: "February 2026 Draw", status: "PENDING", periodStart: new Date("2026-02-01"), periodEnd: new Date("2026-02-28") },
    ]});

    // Compliance docs
    if (rep1) await prisma.complianceDoc.createMany({ skipDuplicates: true, data: [
      { repId: rep1.id, type: "HIPAA_TRAINING", title: "HIPAA Certification 2024", verified: true, expiresAt: new Date("2026-01-15") },
      { repId: rep1.id, type: "W9", title: "W-9 Form 2024", verified: true },
      { repId: rep1.id, type: "STATE_LICENSE", title: "TN Business License", verified: true, expiresAt: new Date("2026-12-31") },
    ]});
    if (rep2) await prisma.complianceDoc.createMany({ skipDuplicates: true, data: [
      { repId: rep2.id, type: "HIPAA_TRAINING", title: "HIPAA Certification 2024", verified: true, expiresAt: new Date("2026-03-20") },
      { repId: rep2.id, type: "W9", title: "W-9 Form 2025", verified: true },
      { repId: rep2.id, type: "NDA", title: "Emory NDA", verified: true },
    ]});
    if (rep3) await prisma.complianceDoc.createMany({ skipDuplicates: true, data: [
      { repId: rep3.id, type: "HIPAA_TRAINING", title: "HIPAA Certification 2023", verified: true, expiresAt: new Date("2025-11-01") },
      { repId: rep3.id, type: "W9", title: "W-9 Form 2024", verified: true },
      { repId: rep3.id, type: "BAA", title: "Business Associate Agreement - Methodist", verified: true },
    ]});

    // Notifications
    await prisma.notification.createMany({ skipDuplicates: true, data: [
      { userId: adminUser.id, title: "Contract Signed", body: "Emory University Hospital signed the enterprise integration contract.", type: "SUCCESS", link: "/admin/contracts" },
      { userId: adminUser.id, title: "Invoice Overdue", body: "INV-2026-006 from Houston Methodist is overdue.", type: "WARNING", link: "/admin/invoices" },
      { userId: adminUser.id, title: "New Lead Qualified", body: "Baylor Scott & White qualified by Priya Patel — est. $2.5M.", type: "INFO", link: "/admin/leads" },
      { userId: repUser.id, title: "Proposal Accepted", body: "Nashville General approved your Cardiology RCM proposal.", type: "SUCCESS", link: "/rep/opportunities" },
      { userId: repUser.id, title: "Payment Processed", body: "Your Q4 2025 commission of $28,000 has been paid.", type: "SUCCESS", link: "/rep/payments" },
    ]});

    return NextResponse.json({
      ok: true,
      message: "Full demo data seeded successfully!",
      stats: { hospitals: 6, leads: 8, opportunities: 9, invoices: 8, contracts: 6, reps: 3, activities: 9 }
    });
  } catch (err) {
    console.error("[seed]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
