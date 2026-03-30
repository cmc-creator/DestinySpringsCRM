"use client";

import { useState, useEffect, useCallback } from "react";

// ─── Design tokens ────────────────────────────────────────────────────────────
const GOLD         = "#c9a84c";
const GOLD_DIM     = "rgba(201,168,76,0.12)";
const BORDER       = "rgba(201,168,76,0.22)";
const TEXT         = "var(--nyx-text, #d8e8f4)";
const MUTED        = "rgba(216,232,244,0.55)";
const DIM          = "rgba(216,232,244,0.28)";
const SUB          = "rgba(216,232,244,0.13)";
const GREEN        = "#22c55e";
const GREEN_BG     = "rgba(34,197,94,0.09)";
const GREEN_BORDER = "rgba(34,197,94,0.28)";

// ─── Badge presets ────────────────────────────────────────────────────────────
type Bs = { bg: string; border: string; color: string };
const B: Record<string, Bs> = {
  memo:        { bg: "rgba(251,146,60,0.12)",  border: "rgba(251,146,60,0.3)",  color: "#fb923c" },
  ip:          { bg: "rgba(167,139,250,0.12)", border: "rgba(167,139,250,0.3)", color: "#a78bfa" },
  nda:         { bg: "rgba(96,165,250,0.12)",  border: "rgba(96,165,250,0.3)",  color: "#60a5fa" },
  license:     { bg: GOLD_DIM,                 border: BORDER,                  color: GOLD      },
  hipaa:       { bg: "rgba(45,212,191,0.12)",  border: "rgba(45,212,191,0.3)",  color: "#2dd4bf" },
  sla:         { bg: "rgba(129,140,248,0.12)", border: "rgba(129,140,248,0.3)", color: "#818cf8" },
  policy:      { bg: "rgba(148,163,184,0.1)",  border: "rgba(148,163,184,0.2)", color: "#94a3b8" },
  procurement: { bg: "rgba(251,191,36,0.10)",  border: "rgba(251,191,36,0.25)", color: "#fbbf24" },
};

// ─── Types ────────────────────────────────────────────────────────────────────
interface PublicSignature {
  id: string;
  docType: string;
  signerName: string;
  signerTitle?: string;
  signerRole: string;
  signedAt: string;
}

interface DocParty {
  role: string;
  label: string;
  nameHint: string;
  titleHint: string;
  emailHint: string;
}

interface DocDef {
  type: string;
  title: string;
  subtitle: string;
  badgeLabel: string;
  bs: Bs;
  parties: DocParty[];
  content: string;
}

interface DocCategory {
  label: string;
  description: string;
  types: string[];
}

// ─── Category definitions ─────────────────────────────────────────────────────
const CATEGORIES: DocCategory[] = [
  {
    label: "Pre-Agreement Protections",
    description: "Foundational documents that establish ownership rights, conflict disclosures, and mutual confidentiality obligations before any licensing terms take effect.",
    types: ["CONFLICT_OF_INTEREST", "IP_OWNERSHIP", "NDA"],
  },
  {
    label: "Core Agreements",
    description: "The primary legal framework governing the software license, permitted use, fees, and HIPAA compliance obligations.",
    types: ["MSLA", "BAA"],
  },
  {
    label: "Operational Policies",
    description: "Documents governing platform service commitments, acceptable use standards, and internal procurement authorization.",
    types: ["SLA", "AUP", "SOLE_SOURCE"],
  },
];

// ─── Document definitions ─────────────────────────────────────────────────────
const DOCS: DocDef[] = [
  // ── 1. Conflict of Interest ─────────────────────────────────────────────────
  {
    type: "CONFLICT_OF_INTEREST",
    title: "Conflict of Interest Disclosure & Recusal Memo",
    subtitle: "Internal memorandum · COI declaration by Director of Business Development",
    badgeLabel: "Memo",
    bs: B.memo,
    parties: [
      {
        role: "acknowledger",
        label: "Acknowledgment — Dave Carnahan, CEO, Destiny Springs Healthcare",
        nameHint: "Dave Carnahan", titleHint: "Chief Executive Officer", emailHint: "dave@destinysprings.com",
      },
    ],
    content: `MEMORANDUM

TO:    Dave Carnahan, Chief Executive Officer — Destiny Springs Healthcare LLC
FROM:  Connie Cooper, Director of Business Development
DATE:  March 26, 2025
RE:    Conflict of Interest Disclosure & Voluntary Recusal

──────────────────────────────────────────────────────────────────

1.  DISCLOSURE OF OWNERSHIP INTEREST

I, Connie Cooper, hereby disclose that I am the sole owner and managing member of NyxCollective LLC,
an Arizona limited liability company (Arizona Entity ID: 25024921), which developed the NyxAegis CRM
platform currently under consideration for adoption by Destiny Springs Healthcare LLC ("DSH").

2.  NATURE OF THE CONFLICT

NyxCollective LLC stands to receive financial compensation through a software licensing arrangement with
DSH. As an employee of DSH, my participation in the evaluation, selection, or approval of this software
creates an actual or apparent conflict of interest.

3.  RECUSAL

I voluntarily recuse myself from all internal deliberations, evaluations, procurement decisions, and
approval processes related to the acquisition of NyxAegis or any product or service provided by
NyxCollective LLC. I will not vote on, approve, or otherwise influence any decision-making in this
regard.

4.  INDEPENDENT DEVELOPMENT

I affirm that NyxAegis was developed entirely outside of my employment with DSH, using no DSH resources,
proprietary patient data, confidential business information, or work hours. The intellectual property
belongs solely to NyxCollective LLC.

5.  COMPLIANCE

This disclosure is made in accordance with DSH's conflict of interest policies and all applicable state
and federal regulations. A copy of this memo will be retained in employee records.

──────────────────────────────────────────────────────────────────

Submitted by:   Connie Cooper, Director of Business Development
                NyxCollective LLC | Managing Member
                Date of Submission: March 26, 2025`,
  },

  // ── 2. IP Ownership Affidavit ───────────────────────────────────────────────
  {
    type: "IP_OWNERSHIP",
    title: "Independent Development & IP Ownership Affidavit",
    subtitle: "Establishes NyxCollective LLC's sole ownership of NyxAegis · DSH confirms no IP claim",
    badgeLabel: "Affidavit",
    bs: B.ip,
    parties: [
      {
        role: "ip_declarant",
        label: "Declarant — Connie Cooper, NyxCollective LLC",
        nameHint: "Connie Cooper", titleHint: "Managing Member", emailHint: "info@nyxcollectivellc.com",
      },
      {
        role: "ip_acknowledger",
        label: "Acknowledging Party — Dave Carnahan, CEO, Destiny Springs Healthcare LLC",
        nameHint: "Dave Carnahan", titleHint: "Chief Executive Officer", emailHint: "dave@destinysprings.com",
      },
    ],
    content: `INDEPENDENT DEVELOPMENT AND INTELLECTUAL PROPERTY OWNERSHIP AFFIDAVIT

This Affidavit is executed as of March 26, 2025, by Connie Cooper ("Declarant"), in connection with
the licensing of NyxAegis CRM by NyxCollective LLC to Destiny Springs Healthcare LLC.

──────────────────────────────────────────────────────────────────

BACKGROUND

Declarant is employed by Destiny Springs Healthcare LLC ("DSH") as Director of Business Development.
Separately, Declarant is the sole owner and managing member of NyxCollective LLC, an Arizona limited
liability company (Entity ID: 25024921), which designed, developed, and owns the NyxAegis CRM
platform ("Software").

DECLARATIONS

I, Connie Cooper, hereby affirm and declare under penalty of perjury as follows:

1.  INDEPENDENT DEVELOPMENT

The NyxAegis CRM platform was conceived, designed, and developed entirely independently of my
employment with DSH, outside the scope of my employment duties, and using no resources, equipment,
data, facilities, or compensated time belonging to DSH or any affiliated entity.

2.  NO USE OF EMPLOYER RESOURCES

(a)  No DSH-owned equipment, servers, software, licenses, or infrastructure was used at any stage.
(b)  No DSH work hours or compensated time were used to develop, test, or deploy NyxAegis.
(c)  No confidential, proprietary, or trade secret information belonging to DSH was incorporated
     into NyxAegis, including business strategy, financial data, or patient records.
(d)  No Protected Health Information (PHI) or patient data belonging to DSH was used at any point
     in the development, testing, or initial deployment of NyxAegis.

3.  SOLE OWNERSHIP

All intellectual property rights in and to the NyxAegis platform — including but not limited to source
code, architecture, design, visual interfaces, documentation, and any derivative works — belong
exclusively and in their entirety to NyxCollective LLC. DSH has no claim to ownership, co-ownership,
work-made-for-hire rights, or any other IP rights in the Software by virtue of the Declarant's
employment.

4.  COMPLIANCE WITH ARIZONA LAW

This independent development activity was conducted in compliance with applicable Arizona law governing
employee inventions (A.R.S. § 23-1501 et seq.) and did not violate any enforceable employment
agreement provision.

5.  ACKNOWLEDGMENT BY DESTINY SPRINGS HEALTHCARE

By executing below, the authorized representative of DSH confirms on behalf of DSH that:

(a)  DSH makes no claim of ownership, co-ownership, or any IP interest in NyxAegis or its components;
(b)  DSH's sole rights with respect to NyxAegis are those granted under the Master Software License
     Agreement; and
(c)  This acknowledgment does not constitute a waiver of any other unrelated rights DSH may hold.

──────────────────────────────────────────────────────────────────

I declare under penalty of perjury that the foregoing declarations are true and correct.`,
  },

  // ── 3. NDA ─────────────────────────────────────────────────────────────────
  {
    type: "NDA",
    title: "Mutual Non-Disclosure Agreement",
    subtitle: "Protects confidential information of both parties · 2-year term per disclosure · Trade secrets indefinite",
    badgeLabel: "NDA",
    bs: B.nda,
    parties: [
      {
        role: "nda_party_a",
        label: "Party A — NyxCollective LLC",
        nameHint: "Connie Cooper", titleHint: "Managing Member", emailHint: "info@nyxcollectivellc.com",
      },
      {
        role: "nda_party_b",
        label: "Party B — Destiny Springs Healthcare LLC",
        nameHint: "Dave Carnahan", titleHint: "Chief Executive Officer", emailHint: "dave@destinysprings.com",
      },
    ],
    content: `MUTUAL NON-DISCLOSURE AGREEMENT

This Mutual Non-Disclosure Agreement ("Agreement") is entered into as of March 26, 2025, by and between:

PARTY A:   NyxCollective LLC — An Arizona limited liability company
           info@nyxcollectivellc.com

PARTY B:   Destiny Springs Healthcare LLC
           17300 N Dysart Rd, Surprise, AZ 85378

(Each a "Party" and collectively the "Parties")

──────────────────────────────────────────────────────────────────

1.  PURPOSE

The Parties wish to explore and maintain a business relationship in connection with the licensing of the
NyxAegis CRM platform and related professional services ("Purpose"). In the course of this relationship,
each Party may disclose to the other certain Confidential Information. This Agreement governs the
treatment of such information.

2.  DEFINITION OF CONFIDENTIAL INFORMATION

"Confidential Information" means any non-public information disclosed by one Party (the "Disclosing
Party") to the other (the "Receiving Party"), in any form, that is designated confidential or would
reasonably be understood to be confidential given its nature.

Confidential Information includes, without limitation:
(a)  Software source code, architecture, algorithms, and technical specifications;
(b)  Pricing, fees, financial terms, and business models;
(c)  Business strategies, plans, pipeline data, and market intelligence;
(d)  Patient data, clinical workflows, and operational processes;
(e)  Employee, contractor, and vendor relationships and terms; and
(f)  All other non-public proprietary business and technical information.

3.  EXCEPTIONS

Obligations under this Agreement do not apply to information that:
(a)  Is or becomes publicly available through no breach of this Agreement;
(b)  Was rightfully known to the Receiving Party prior to disclosure without restriction;
(c)  Is independently developed by the Receiving Party without reference to Confidential Information;
(d)  Is received from a third party not under any confidentiality obligation to the Disclosing Party; or
(e)  Is required by law or court order to be disclosed, with prompt written notice first given.

4.  OBLIGATIONS OF THE RECEIVING PARTY

Each Receiving Party agrees to:
(a)  Hold all Confidential Information in strict confidence using at least reasonable care;
(b)  Not disclose Confidential Information to any third party without prior written consent;
(c)  Use Confidential Information solely in furtherance of the Purpose;
(d)  Limit access to employees or contractors with a genuine need to know who are bound by
     equivalent confidentiality obligations; and
(e)  Notify the Disclosing Party within 48 hours of any unauthorized disclosure or suspected breach.

5.  RETURN OR DESTRUCTION

Upon written request, or upon termination of the relationship, the Receiving Party shall promptly
return or securely destroy all Confidential Information and provide written certification.

6.  TERM

This Agreement remains in effect from the date of execution. Confidentiality obligations for each
disclosure survive for two (2) years from the date of that disclosure. Trade secret obligations
survive in perpetuity.

7.  INJUNCTIVE RELIEF

Unauthorized disclosure would cause irreparable harm for which monetary damages are an inadequate
remedy. Each Party may seek injunctive relief without posting bond.

8.  NO LICENSE

Nothing in this Agreement grants any right, title, interest, or license in or to any intellectual
property of the other Party.

9.  GOVERNING LAW

This Agreement is governed by the laws of Arizona. Disputes shall be resolved in Maricopa County, AZ.

──────────────────────────────────────────────────────────────────`,
  },

  // ── 4. MSLA ────────────────────────────────────────────────────────────────
  {
    type: "MSLA",
    title: "Master Software License Agreement",
    subtitle: "Non-exclusive license grant · $50/seat/month · Net 30 · 60-day termination notice",
    badgeLabel: "MSLA",
    bs: B.license,
    parties: [
      {
        role: "licensor",
        label: "Licensor — NyxCollective LLC",
        nameHint: "Connie Cooper", titleHint: "Managing Member", emailHint: "info@nyxcollectivellc.com",
      },
      {
        role: "licensee",
        label: "Licensee — Destiny Springs Healthcare LLC",
        nameHint: "Dave Carnahan", titleHint: "Chief Executive Officer", emailHint: "dave@destinysprings.com",
      },
    ],
    content: `MASTER SOFTWARE LICENSE AGREEMENT

This Master Software License Agreement ("Agreement") is entered into as of March 26, 2025, by and between:

LICENSOR:  NyxCollective LLC — Arizona Entity ID: 25024921
           info@nyxcollectivellc.com

LICENSEE:  Destiny Springs Healthcare LLC
           17300 N Dysart Rd, Surprise, AZ 85378

──────────────────────────────────────────────────────────────────

1.  GRANT OF LICENSE

Licensor grants to Licensee a limited, non-exclusive, non-transferable, non-sublicensable license to
access and use the NyxAegis CRM platform ("Software") solely for Licensee's internal business
operations.

2.  LICENSE FEES

2.1  Base Rate: $50.00 USD per authorized user seat per month, billed monthly.
2.2  Payment Terms: Net 30 days from date of invoice.
2.3  Implementation Fees: Waived in full for the initial onboarding period.
2.4  Late Payment: Invoices outstanding beyond 30 days accrue interest at 1.5% per month.
2.5  Additional Seats: Available at the same per-seat rate upon written request.
2.6  Annual Review: Licensor may adjust pricing with 60 days' written notice.

3.  INTELLECTUAL PROPERTY

All right, title, and interest in and to the Software remain the exclusive property of NyxCollective LLC.
This Agreement conveys no ownership interest. See the executed IP Ownership Affidavit.

4.  RESTRICTIONS

Licensee shall not:
(a)  Copy, modify, or create derivative works of the Software;
(b)  Reverse engineer, decompile, or disassemble any portion of the Software;
(c)  Sublicense, sell, assign, or otherwise transfer any rights to any third party;
(d)  Use the Software for any purpose other than Licensee's internal healthcare operations; or
(e)  Violate any term of the executed Acceptable Use Policy.

5.  WARRANTIES

Licensor warrants that: (a) it has full authority to grant this license; and (b) the Software does not
knowingly infringe third-party IP rights. THE SOFTWARE IS OTHERWISE PROVIDED WITHOUT WARRANTIES BEYOND
THOSE EXPRESSLY STATED, INCLUDING NO IMPLIED WARRANTIES OF FITNESS FOR A PARTICULAR PURPOSE.

6.  LIMITATION OF LIABILITY

NEITHER PARTY SHALL BE LIABLE FOR INDIRECT, INCIDENTAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES.
LICENSOR'S AGGREGATE LIABILITY SHALL NOT EXCEED FEES PAID IN THE PRECEDING TWELVE (12) MONTHS.

7.  TERM AND TERMINATION

7.1  Term: Commences on execution date and continues until terminated.
7.2  For Convenience: Either Party may terminate upon 60 days' written notice.
7.3  For Cause: Either Party may terminate immediately upon 30 days' cure notice for material breach.
7.4  Effect: Licensee's access ceases and all outstanding fees become immediately due.

8.  GOVERNING LAW

This Agreement is governed by Arizona law. Disputes shall be resolved in Maricopa County, AZ.

9.  ENTIRE AGREEMENT

This Agreement, together with the BAA, NDA, IP Affidavit, SLA, and AUP executed concurrently, constitutes
the complete agreement of the Parties regarding its subject matter.

10. AMENDMENTS

This Agreement may be modified only by a written amendment signed by authorized representatives of
both Parties. No email, verbal agreement, or unilateral notice shall constitute an amendment.

11. FORCE MAJEURE

Neither Party shall be in default or liable if performance is prevented, hindered, or delayed by causes
beyond its reasonable control, including acts of God, pandemic, natural disaster, governmental action,
war, or failure of third-party infrastructure providers. The affected Party must promptly notify the
other and use reasonable efforts to resume performance.

──────────────────────────────────────────────────────────────────`,
  },

  // ── 5. BAA ─────────────────────────────────────────────────────────────────
  {
    type: "BAA",
    title: "HIPAA Business Associate Agreement",
    subtitle: "NyxCollective LLC (BA) ↔ Destiny Springs Healthcare LLC (CE) · AES-256 · MFA · 48hr breach notice",
    badgeLabel: "BAA",
    bs: B.hipaa,
    parties: [
      {
        role: "business_associate",
        label: "Business Associate — NyxCollective LLC",
        nameHint: "Connie Cooper", titleHint: "Managing Member", emailHint: "info@nyxcollectivellc.com",
      },
      {
        role: "covered_entity",
        label: "Covered Entity — Destiny Springs Healthcare LLC",
        nameHint: "Dave Carnahan", titleHint: "Chief Executive Officer", emailHint: "dave@destinysprings.com",
      },
    ],
    content: `HIPAA BUSINESS ASSOCIATE AGREEMENT

This Business Associate Agreement ("BAA") is entered into as of March 26, 2025, by and between:

BUSINESS ASSOCIATE:  NyxCollective LLC ("BA") — An Arizona limited liability company
COVERED ENTITY:      Destiny Springs Healthcare LLC ("CE"), 17300 N Dysart Rd, Surprise, AZ 85378

This BAA is incorporated into and forms part of the Master Software License Agreement.

──────────────────────────────────────────────────────────────────

1.  DEFINITIONS

Terms used but not defined herein have the meaning under 45 C.F.R. Parts 160 and 164.
"PHI" — Protected Health Information (45 C.F.R. § 160.103)
"ePHI" — PHI created, received, maintained, or transmitted electronically
"Breach" — 45 C.F.R. § 164.402

2.  OBLIGATIONS OF BUSINESS ASSOCIATE

BA agrees to:

2.1  Use and disclose PHI only as permitted by this BAA or required by applicable law;

2.2  Implement and maintain safeguards to protect ePHI, including:
     (a)  AES-256 encryption for all data at rest;
     (b)  TLS 1.3 (minimum TLS 1.2) encryption for all data in transit;
     (c)  Mandatory multi-factor authentication (MFA) for all platform access;
     (d)  Role-based access controls; and
     (e)  Comprehensive audit logging of all ePHI access and modifications;

2.3  Report to CE any unauthorized PHI use or disclosure within forty-eight (48) hours of discovery,
     including Breaches of Unsecured PHI per 45 C.F.R. § 164.410;

2.4  Ensure subcontractors creating/receiving/maintaining PHI execute equivalent protections;

2.5  Make PHI available for individual rights requests per 45 C.F.R. § 164.524;

2.6  Make practices and records available to HHS as required for compliance determinations;

2.7  Upon termination, return or destroy all PHI (at CE's election), retaining no copies where feasible.

3.  PERMITTED USES AND DISCLOSURES

BA may use/disclose PHI only: (a) as necessary to perform Services per the MSLA; (b) as required by
law; (c) for BA's proper management and legal compliance.

4.  COVERED ENTITY OBLIGATIONS

CE agrees to: (a) notify BA of any limitations in CE's Notice of Privacy Practices affecting BA's PHI
use; (b) notify BA of changes or revocations of individual authorizations; (c) not request BA to act
in violation of HIPAA.

5.  BREACH NOTIFICATION

Upon discovering a suspected or actual PHI Breach, BA will notify CE within 48 hours including: nature
of the Breach, PHI involved, affected individuals, steps taken to mitigate harm and prevent recurrence.

6.  TERM AND TERMINATION

6.1  Term: In effect while BA performs Services involving PHI.
6.2  For Cause: CE may terminate immediately if BA materially breaches and fails to cure within 15 days.
6.3  Effect: BA shall return or destroy all PHI. Where not feasible, protections continue indefinitely.

7.  LIMITATION OF LIABILITY

BA's aggregate liability under this BAA shall not exceed BA's then-current cyber liability insurance
coverage limits. BA shall maintain cyber liability insurance of no less than $1,000,000 per occurrence
throughout the term of this BAA.

──────────────────────────────────────────────────────────────────`,
  },

  // ── 6. SLA ─────────────────────────────────────────────────────────────────
  {
    type: "SLA",
    title: "Service Level Agreement",
    subtitle: "99.9% uptime commitment · Priority incident tiers · Service credits · 30-day backup retention",
    badgeLabel: "SLA",
    bs: B.sla,
    parties: [
      {
        role: "sla_provider",
        label: "Service Provider — NyxCollective LLC",
        nameHint: "Connie Cooper", titleHint: "Managing Member", emailHint: "info@nyxcollectivellc.com",
      },
      {
        role: "sla_client",
        label: "Client — Destiny Springs Healthcare LLC",
        nameHint: "Dave Carnahan", titleHint: "Chief Executive Officer", emailHint: "dave@destinysprings.com",
      },
    ],
    content: `SERVICE LEVEL AGREEMENT

This SLA is entered into as of March 26, 2025, and forms part of the Master Software License Agreement.

PROVIDER:  NyxCollective LLC
CLIENT:    Destiny Springs Healthcare LLC

──────────────────────────────────────────────────────────────────

1.  SERVICE AVAILABILITY

1.1  Uptime Commitment: 99.9% platform availability per calendar month, excluding scheduled maintenance.

1.2  Calculation: Uptime % = (Total Minutes − Downtime Minutes) ÷ Total Minutes × 100

1.3  Scheduled Maintenance: Off-peak hours (10 PM – 4 AM MST) with 48 hours' advance notice.
     Scheduled windows are excluded from uptime calculations.

1.4  Emergency Maintenance: Unscheduled; excluded from uptime calculations if ≤ 4 hours/month.

2.  INCIDENT CLASSIFICATION AND RESPONSE TIMES

Priority 1 — Critical (Platform Down / Data Loss Risk)
  Initial Response:   2 hours  ·  7 days/week, 24 hours/day
  Resolution Target:  8 hours
  Examples:           Complete outage, data corruption, security breach, PHI inaccessible

Priority 2 — High (Major Feature Unavailable)
  Initial Response:   4 business hours
  Resolution Target:  24 business hours
  Examples:           Login failures, census sync down, reporting unavailable

Priority 3 — Medium (Feature Degraded)
  Initial Response:   1 business day
  Resolution Target:  5 business days
  Examples:           Slow performance, minor UI issues, non-critical sync delays

Priority 4 — Low (Enhancement / Question)
  Initial Response:   2 business days
  Resolution Target:  Agreed roadmap timeline

Business Hours: Monday–Friday, 8:00 AM – 6:00 PM MST (excluding federal holidays)
Priority 1 issues are supported 24/7.

3.  SUPPORT CHANNELS

3.1  All Priorities:    info@nyxcollectivellc.com — ticket issued within 1 business hour of receipt
3.2  Priority 1 & 2:   Direct mobile contact with dedicated account manager
3.3  All tickets receive a unique ID and status updates at each milestone.

4.  DATA PROTECTION AND BACKUP

4.1  Daily automated backups, retained 30 days. Weekly backups retained 90 days.
4.2  All backup data encrypted at rest with AES-256.
4.3  Recovery Time Objective (RTO): 4 hours for declared data disasters (standard scenarios).
4.4  Recovery Point Objective (RPO): Within 24 hours of declared failure event.
4.5  Backup restoration testing performed no less than quarterly.

5.  SERVICE CREDITS

If Provider fails the monthly uptime commitment:
  99.0% – 99.9% achieved:    5% credit of monthly fee
  95.0% – 99.0% achieved:   10% credit of monthly fee
  Below 95.0% achieved:     25% credit of monthly fee

Credits are Client's sole remedy for uptime failures, applied to the next invoice.
Credits are not available while Client's account is in arrears.

6.  CLIENT RESPONSIBILITIES

Client agrees to: (a) maintain current contact information; (b) report incidents with sufficient detail;
(c) cooperate with issue resolution; (d) ensure users comply with the AUP; (e) maintain compatible,
current-release browsers and operating systems; (f) not conduct penetration testing without written consent.

7.  EXCLUSIONS

SLA obligations do not apply during outages caused by: scheduled maintenance with notice; Client error
or AUP violation; third-party infrastructure failures (including cloud hosting, database, email delivery,
or mapping service providers); internet failures outside Provider's network; force majeure; or account
suspension for non-payment.

──────────────────────────────────────────────────────────────────`,
  },

  // ── 7. AUP ─────────────────────────────────────────────────────────────────
  {
    type: "AUP",
    title: "Acceptable Use Policy",
    subtitle: "Platform use standards, prohibited activities, PHI handling requirements, and security obligations",
    badgeLabel: "Policy",
    bs: B.policy,
    parties: [
      {
        role: "aup_representative",
        label: "Authorized Representative — Destiny Springs Healthcare LLC",
        nameHint: "Dave Carnahan", titleHint: "Chief Executive Officer", emailHint: "dave@destinysprings.com",
      },
    ],
    content: `ACCEPTABLE USE POLICY

This AUP governs the use of the NyxAegis CRM platform by Destiny Springs Healthcare LLC ("Organization")
and all of its authorized users. It is incorporated into the Master Software License Agreement.

Provider:        NyxCollective LLC
Effective Date:  March 26, 2025

──────────────────────────────────────────────────────────────────

1.  AUTHORIZED USERS

1.1  Access is limited to employees and contractors issued valid credentials by an authorized Administrator.
1.2  User accounts are personal and may not be shared.
1.3  Organization must immediately deactivate access for any user who has separated from employment or
     no longer requires Platform access.
1.4  Organization shall designate at least one Administrator responsible for access management and AUP
     compliance.

2.  PERMITTED USES

The Platform may be used solely for:
(a)  Admissions pipeline and referral development operations;
(b)  Patient referral tracking, lead management, and clinical intake in compliance with HIPAA;
(c)  Internal team communication, activity logging, and business reporting;
(d)  Analytics, business intelligence, and compliance reporting for Organization's operations; and
(e)  Any other use expressly authorized in writing by NyxCollective LLC.

3.  PROHIBITED USES

Users and Organization shall NOT:
(a)  Attempt to access, probe, scan, or test Platform security beyond authorized permissions;
(b)  Reverse engineer, decompile, disassemble, or attempt to derive Platform source code;
(c)  Upload, transmit, or store malicious code, viruses, malware, or any harmful software;
(d)  Use the Platform in violation of applicable law, including HIPAA, HITECH, or Arizona statutes;
(e)  Export, re-license, resell, sublicense, or transfer access to any third party;
(f)  Use the Platform for competitive intelligence gathering against NyxCollective LLC;
(g)  Circumvent, bypass, disable, or interfere with any security control, authentication mechanism,
     role-based permission, or audit logging system;
(h)  Input or upload content that infringes third-party intellectual property rights;
(i)  Access or modify another user's account without explicit written authorization;
(j)  Intentionally overload, flood, or disrupt Platform performance or infrastructure; or
(k)  Use automated scripts or scrapers to extract data in bulk without prior written authorization.

4.  PROTECTED HEALTH INFORMATION (PHI)

4.1  All PHI must be handled in strict compliance with HIPAA, the executed BAA, and Organization's
     internal privacy policies.
4.2  Users must access PHI only to the extent minimally necessary for their assigned role.
4.3  PHI shall not be exported in bulk except for documented, authorized operational purposes.
4.4  Users who discover or suspect a PHI breach must notify their Administrator within four (4) hours.
4.5  Organization shall notify NyxCollective LLC of any suspected Platform-data breach per the BAA.

5.  ACCOUNT SECURITY

5.1  Users are personally responsible for the confidentiality of their login credentials.
5.2  Multi-factor authentication (MFA), where enabled, is mandatory and may not be disabled by users.
5.3  Users must notify their Administrator within two (2) hours if credentials may be compromised.
5.4  Users must log out from unattended devices and not leave active sessions accessible to others.

6.  CONSEQUENCES OF VIOLATION

6.1  Violations may result in immediate suspension or permanent revocation of Platform access.
6.2  Willful violations — especially unauthorized PHI access, security circumvention, or source code
     misappropriation — may result in contractual liability, civil claims, or criminal referral.
6.3  Provider reserves the right to monitor usage logs for AUP compliance per applicable law and the BAA.

7.  REPORTING

Suspected violations: info@nyxcollectivellc.com
Emergency security incidents: direct contact to dedicated account manager

8.  POLICY UPDATES

Provider may update this AUP with 30 days' written notice. Continued Platform use constitutes acceptance.

──────────────────────────────────────────────────────────────────`,
  },

  // ── 8. Sole Source ─────────────────────────────────────────────────────────
  {
    type: "SOLE_SOURCE",
    title: "Sole Source Justification & Procurement Authorization",
    subtitle: "CEO authorization for no-bid procurement · Unique integrations · Documented cost avoidance",
    badgeLabel: "Procurement",
    bs: B.procurement,
    parties: [
      {
        role: "approver",
        label: "Approving Authority — Dave Carnahan, CEO, Destiny Springs Healthcare LLC",
        nameHint: "Dave Carnahan", titleHint: "Chief Executive Officer", emailHint: "dave@destinysprings.com",
      },
    ],
    content: `SOLE SOURCE JUSTIFICATION AND PROCUREMENT AUTHORIZATION

FROM:    Dave Carnahan, Chief Executive Officer
TO:      Accounts Payable / Finance Department
DATE:    March 26, 2025
RE:      Sole-Source Procurement Authorization — NyxAegis CRM Platform

──────────────────────────────────────────────────────────────────

PURPOSE

This memorandum serves as formal written authorization for the sole-source procurement of the NyxAegis
CRM from NyxCollective LLC without a competitive bidding process, and documents the business justification.

JUSTIFICATION

1.  PROPRIETARY AND UNIQUE TECHNOLOGY

NyxAegis was purpose-designed for behavioral healthcare referral development and admissions pipeline
management in the Arizona market. Its architecture, clinical workflows, AI features, and compliance
tooling are proprietary to NyxCollective LLC and unavailable from any competing vendor in equivalent form.

2.  SPECIALIZED INTEGRATION REQUIREMENTS

NyxAegis includes native, production-ready integration with systems critical to DSH operations:
(a)  iCANotes EHR — direct census synchronization;
(b)  MedWorxs — clinical data workflow integration;
(c)  Paycom — HR and payroll data linkage; and
(d)  Monday.com — project management and activity sync.

Replicating this capability through a third party would require significant development cost, timeline,
and transition risk — none of which is justified given the existing solution.

3.  DOCUMENTED COST AVOIDANCE

Comparable enterprise healthcare CRM platforms are priced at $150–$300+ per seat per month plus
custom development. The negotiated Preferred Partner rate of $50/seat/month represents a documented
cost avoidance of $100+ per seat per month — approximately $4,800–$12,000 annually.

4.  UNIQUE DOMAIN EXPERTISE

NyxCollective LLC's principal has direct, current knowledge of DSH's referral sources, admissions
workflows, payor mix, clinical intake processes, and competitive landscape. This knowledge cannot be
transferred to a competing vendor without material transition risk and extended ramp-up.

5.  NO EQUIVALENT ALTERNATIVES IDENTIFIED

A marketplace review identified no alternative vendor offering equivalent functionality, integrations,
and domain expertise within acceptable cost, timeline, and risk parameters.

AUTHORIZATION

I hereby authorize sole-source procurement of NyxAegis from NyxCollective LLC at $50.00/seat/month under
the terms of the executed Master Software License Agreement. Finance and Accounts Payable are authorized
to process invoices from NyxCollective LLC accordingly.

──────────────────────────────────────────────────────────────────`,
  },
];

const DOCS_BY_TYPE = Object.fromEntries(DOCS.map(d => [d.type, d]));

// ─── Helpers ─────────────────────────────────────────────────────────────────
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function isSigned(sigs: PublicSignature[], docType: string, role: string) {
  return sigs.some(s => s.docType === docType && s.signerRole === role);
}

function docFullySigned(doc: DocDef, sigs: PublicSignature[]) {
  return doc.parties.every(p => isSigned(sigs, doc.type, p.role));
}

// ─── SignedBadge ──────────────────────────────────────────────────────────────
function SignedBadge({ sig, label }: { sig: PublicSignature; label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 10, background: GREEN_BG, border: `1px solid ${GREEN_BORDER}`, borderRadius: 9, padding: "9px 14px" }}>
      <span style={{ color: GREEN, fontWeight: 900, fontSize: "1rem", lineHeight: "1.4rem", flexShrink: 0 }}>✓</span>
      <div>
        <div style={{ fontSize: "0.72rem", color: DIM, fontWeight: 600, marginBottom: 2 }}>{label}</div>
        <div style={{ fontSize: "0.86rem" }}>
          <span style={{ color: GREEN, fontWeight: 800 }}>{sig.signerName}</span>
          {sig.signerTitle && <span style={{ color: DIM }}> · {sig.signerTitle}</span>}
        </div>
        <div style={{ fontSize: "0.75rem", color: DIM, marginTop: 1 }}>Signed {fmtDate(sig.signedAt)}</div>
      </div>
    </div>
  );
}

// ─── PendingBadge ─────────────────────────────────────────────────────────────
function PendingBadge({ label }: { label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, background: SUB, border: `1px solid ${BORDER}`, borderRadius: 9, padding: "9px 14px" }}>
      <span style={{ color: GOLD, fontSize: "0.75rem", flexShrink: 0 }}>○</span>
      <div>
        <div style={{ fontSize: "0.72rem", color: DIM, fontWeight: 600, marginBottom: 1 }}>{label}</div>
        <div style={{ fontSize: "0.82rem", color: "rgba(201,168,76,0.5)", fontStyle: "italic" }}>Awaiting signature</div>
      </div>
    </div>
  );
}

// ─── SignatureForm ────────────────────────────────────────────────────────────
function SignatureForm({ party, docType, onSuccess }: {
  party: DocParty;
  docType: string;
  onSuccess: (sig: PublicSignature) => void;
}) {
  const [name,    setName]    = useState(party.nameHint);
  const [email,   setEmail]   = useState(party.emailHint);
  const [title,   setTitle]   = useState(party.titleHint);
  const [agreed,  setAgreed]  = useState(false);
  const [loading, setLoading] = useState(false);
  const [err,     setErr]     = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!agreed) { setErr("Please confirm you have read and agree to this document before signing."); return; }
    setLoading(true); setErr(null);
    try {
      const res = await fetch("/api/legal/signatures", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ docType, signerName: name, signerEmail: email, signerTitle: title, signerRole: party.role }),
      });
      const data = await res.json() as { ok?: boolean; error?: string; signature?: PublicSignature; existing?: PublicSignature };
      if (!res.ok) {
        if (res.status === 409 && data.existing) {
          setErr(`Already signed by ${data.existing.signerName} on ${fmtDate(data.existing.signedAt)}.`);
        } else {
          setErr(data.error ?? "An error occurred. Please try again.");
        }
        return;
      }
      if (data.signature) onSuccess(data.signature);
    } catch {
      setErr("Network error. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit}>
      <div style={{ fontSize: "0.72rem", fontWeight: 800, color: GOLD, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 14 }}>
        Execute as: {party.label}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
        <div>
          <label style={labelSt}>Full Legal Name *</label>
          <input value={name} onChange={e => setName(e.target.value)} required placeholder="Full name" style={inputSt} />
        </div>
        <div>
          <label style={labelSt}>Title / Position</label>
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. CEO" style={inputSt} />
        </div>
      </div>
      <div style={{ marginBottom: 14 }}>
        <label style={labelSt}>Email Address *</label>
        <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="your@email.com" style={inputSt} />
      </div>
      <label style={{ display: "flex", gap: 10, alignItems: "flex-start", cursor: "pointer", userSelect: "none", marginBottom: 14 }}>
        <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} style={{ marginTop: 3, accentColor: GOLD, width: 15, height: 15, flexShrink: 0 }} />
        <span style={{ fontSize: "0.82rem", color: MUTED, lineHeight: 1.55 }}>
          I confirm I have read and understood this document in its entirety and agree to its terms. I understand that typing my name and clicking the button below creates a legally binding electronic signature under the E-SIGN Act and Arizona UETA.
        </span>
      </label>
      {err && (
        <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.28)", borderRadius: 8, padding: "9px 14px", fontSize: "0.83rem", color: "#fca5a5", marginBottom: 14 }}>
          {err}
        </div>
      )}
      <button type="submit" disabled={loading} style={{
        background: loading ? "rgba(201,168,76,0.35)" : GOLD,
        color: "#0a0e14", border: "none", borderRadius: 8,
        padding: "10px 24px", fontWeight: 800, fontSize: "0.88rem",
        cursor: loading ? "not-allowed" : "pointer",
      }}>
        {loading ? "Submitting…" : "✎  Execute Signature"}
      </button>
    </form>
  );
}

const labelSt: React.CSSProperties = { display: "block", fontSize: "0.72rem", color: DIM, fontWeight: 600, marginBottom: 5, letterSpacing: "0.03em" };
const inputSt: React.CSSProperties = { width: "100%", boxSizing: "border-box", background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`, borderRadius: 7, padding: "9px 12px", color: TEXT, fontSize: "0.875rem", outline: "none" };

// ─── DocCard ──────────────────────────────────────────────────────────────────
function DocCard({ doc, index, total, sigs, onNewSignature }: {
  doc: DocDef;
  index: number;
  total: number;
  sigs: PublicSignature[];
  onNewSignature: (sig: PublicSignature) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const allSigned  = docFullySigned(doc, sigs);
  const anySigned  = doc.parties.some(p => isSigned(sigs, doc.type, p.role));
  const unsigned   = doc.parties.filter(p => !isSigned(sigs, doc.type, p.role));

  const statusColor = allSigned ? GREEN : anySigned ? GOLD : DIM;
  const statusLabel = allSigned
    ? "Fully Executed"
    : anySigned
    ? `${doc.parties.length - unsigned.length} of ${doc.parties.length} signed`
    : "Pending Signatures";

  return (
    <div style={{
      background: "rgba(255,255,255,0.022)",
      border: `1px solid ${allSigned ? GREEN_BORDER : anySigned ? "rgba(201,168,76,0.28)" : "rgba(255,255,255,0.07)"}`,
      borderRadius: 14, overflow: "hidden",
    }}>
      {/* Clickable header */}
      <button
        onClick={() => setExpanded(v => !v)}
        style={{ display: "block", width: "100%", background: "none", border: "none", cursor: "pointer", padding: "18px 22px", textAlign: "left" }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
          {/* Number badge */}
          <div style={{
            width: 36, height: 36, borderRadius: 9, border: `1px solid ${BORDER}`,
            background: GOLD_DIM, display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0, fontWeight: 900, fontSize: "0.78rem", color: GOLD,
          }}>
            {String(index + 1).padStart(2, "0")}
          </div>

          {/* Title block */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", gap: 7, alignItems: "center", flexWrap: "wrap", marginBottom: 5 }}>
              <span style={{ background: doc.bs.bg, border: `1px solid ${doc.bs.border}`, borderRadius: 5, padding: "2px 9px", fontSize: "0.67rem", fontWeight: 800, color: doc.bs.color, letterSpacing: "0.12em", textTransform: "uppercase" }}>
                {doc.badgeLabel}
              </span>
              <span style={{ fontSize: "0.67rem", fontWeight: 700, color: statusColor, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                {allSigned && "✓ "}{statusLabel}
              </span>
              <span style={{ fontSize: "0.67rem", color: SUB, marginLeft: "auto" }}>
                {index + 1} of {total}
              </span>
            </div>
            <div style={{ fontWeight: 800, fontSize: "0.96rem", color: TEXT, marginBottom: 3, lineHeight: 1.3 }}>{doc.title}</div>
            <div style={{ fontSize: "0.78rem", color: DIM, lineHeight: 1.4 }}>{doc.subtitle}</div>
          </div>

          {/* Chevron */}
          <div style={{ color: GOLD, fontSize: "0.82rem", flexShrink: 0, paddingTop: 4, fontWeight: 700 }}>
            {expanded ? "▲" : "▼"}
          </div>
        </div>
      </button>

      {/* Expanded body */}
      {expanded && (
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", padding: "22px 22px 26px" }}>

          {/* Document text viewer */}
          <div style={{ marginBottom: 22, background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, overflow: "hidden" }}>
            <div style={{ padding: "7px 16px", borderBottom: "1px solid rgba(255,255,255,0.05)", display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(255,255,255,0.02)", flexWrap: "wrap", gap: 6 }}>
              <span style={{ fontSize: "0.68rem", fontWeight: 700, color: DIM, letterSpacing: "0.1em", textTransform: "uppercase" }}>Document Text — Scroll to read in full</span>
              <span style={{ fontSize: "0.67rem", color: DIM, fontStyle: "italic" }}>Signature timestamps below govern execution date</span>
            </div>
            <div style={{ maxHeight: 360, overflowY: "auto", padding: "18px 22px" }}>
              <pre style={{ margin: 0, fontFamily: "'Courier New', Courier, monospace", fontSize: "0.775rem", color: MUTED, lineHeight: 1.85, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                {doc.content}
              </pre>
            </div>
          </div>

          {/* Signature status */}
          <div style={{ marginBottom: 22 }}>
            <div style={{ fontSize: "0.7rem", fontWeight: 800, color: GOLD, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 10 }}>Signature Status</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {doc.parties.map(p => {
                const sig = sigs.find(s => s.docType === doc.type && s.signerRole === p.role);
                return sig
                  ? <SignedBadge key={p.role} sig={sig} label={p.label} />
                  : <PendingBadge key={p.role} label={p.label} />;
              })}
            </div>
          </div>

          {/* Unsigned party forms */}
          {unsigned.map((p, i) => (
            <div key={p.role} style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 20, marginTop: i > 0 ? 20 : 0 }}>
              <SignatureForm party={p} docType={doc.type} onSuccess={onNewSignature} />
            </div>
          ))}

          {/* All signed state */}
          {allSigned && (
            <div style={{ borderTop: `1px solid ${GREEN_BORDER}`, display: "flex", alignItems: "center", gap: 14, background: GREEN_BG, margin: "0 -22px -26px", padding: "16px 22px" }}>
              <div style={{ fontSize: "1.4rem" }}>✅</div>
              <div>
                <div style={{ fontWeight: 800, color: GREEN, marginBottom: 2 }}>Document Fully Executed</div>
                <div style={{ color: DIM, fontSize: "0.82rem" }}>All parties have signed electronically. Records stored with full timestamps and audit trail.</div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Invoice Card ─────────────────────────────────────────────────────────────
function InvoiceCard({ index, total }: { index: number; total: number }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div style={{ background: "rgba(255,255,255,0.018)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14, overflow: "hidden" }}>
      <button onClick={() => setExpanded(v => !v)} style={{ display: "block", width: "100%", background: "none", border: "none", cursor: "pointer", padding: "18px 22px", textAlign: "left" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
          <div style={{ width: 36, height: 36, borderRadius: 9, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontWeight: 900, fontSize: "0.78rem", color: DIM }}>
            {String(index + 1).padStart(2, "0")}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginBottom: 5 }}>
              <span style={{ background: "rgba(148,163,184,0.09)", border: "1px solid rgba(148,163,184,0.18)", borderRadius: 5, padding: "2px 9px", fontSize: "0.67rem", fontWeight: 800, color: "#94a3b8", letterSpacing: "0.12em", textTransform: "uppercase" }}>Invoice</span>
              <span style={{ fontSize: "0.67rem", fontWeight: 700, color: DIM, letterSpacing: "0.08em", textTransform: "uppercase" }}>Reference Only · No Signature Required</span>
              <span style={{ fontSize: "0.67rem", color: SUB, marginLeft: "auto" }}>{index + 1} of {total}</span>
            </div>
            <div style={{ fontWeight: 800, fontSize: "0.96rem", color: "rgba(216,232,244,0.45)", marginBottom: 3 }}>NyxCollective LLC — Initial Invoice (April 2025)</div>
            <div style={{ fontSize: "0.78rem", color: DIM }}>NYC-2025-001 · 2 seats × $50/month = $100.00 · Implementation waived · Net 30</div>
          </div>
          <div style={{ color: DIM, fontSize: "0.82rem", flexShrink: 0, paddingTop: 4, fontWeight: 700 }}>{expanded ? "▲" : "▼"}</div>
        </div>
      </button>
      {expanded && (
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.05)", padding: "22px 22px 24px" }}>
          <div style={{ background: "rgba(0,0,0,0.28)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 10, padding: "20px 22px" }}>
            <pre style={{ margin: 0, fontFamily: "'Courier New', Courier, monospace", fontSize: "0.775rem", color: MUTED, lineHeight: 1.85, whiteSpace: "pre-wrap" }}>{`INVOICE

FROM:  NyxCollective LLC
       Arizona Entity ID: 25024921
       info@nyxcollectivellc.com

TO:    Destiny Springs Healthcare LLC
       17300 N Dysart Rd, Surprise, AZ 85378
       Attn: Accounts Payable

DATE:  March 26, 2025
INVOICE NO:  NYC-2025-001

──────────────────────────────────────────────────
DESCRIPTION                              AMOUNT
──────────────────────────────────────────────────
NyxAegis CRM Platform License
  2 authorized user seats
  × $50.00 / seat / month               $100.00
  (Monthly Recurring — April 2025)

Implementation & Onboarding              $0.00
  (Waived per Preferred Partner Agreement)
──────────────────────────────────────────────────
SUBTOTAL                                $100.00
TAX (AZ SaaS exemption — 0%)             $0.00
──────────────────────────────────────────────────
TOTAL DUE                               $100.00
──────────────────────────────────────────────────

PAYMENT TERMS:  Net 30 (due April 25, 2025)
REMIT TO:       NyxCollective LLC
                info@nyxcollectivellc.com

This is a reference invoice. Recurring invoices
will be issued monthly per the executed MSLA.`}
            </pre>
          </div>
          <p style={{ color: DIM, fontSize: "0.75rem", marginTop: 12, marginBottom: 0, lineHeight: 1.65 }}>
            Reference only. Payment terms and billing are governed by the MSLA. No signature required.
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Progress bar ─────────────────────────────────────────────────────────────
function ProgressBar({ signed, total }: { signed: number; total: number }) {
  const pct = total === 0 ? 0 : Math.round((signed / total) * 100);
  const done = signed === total;
  return (
    <div style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${done ? GREEN_BORDER : BORDER}`, borderRadius: 12, padding: "16px 20px", display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
      <div style={{ flex: 1, minWidth: 200 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
          <span style={{ fontSize: "0.78rem", fontWeight: 700, color: done ? GREEN : GOLD }}>
            {done ? "✓  All agreements fully executed" : `${signed} of ${total} agreements fully executed`}
          </span>
          <span style={{ fontSize: "0.75rem", color: DIM }}>{pct}%</span>
        </div>
        <div style={{ height: 5, background: SUB, borderRadius: 100, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${pct}%`, background: done ? GREEN : GOLD, borderRadius: 100, transition: "width 0.5s ease" }} />
        </div>
      </div>
      <div style={{ display: "flex", gap: 24, flexShrink: 0 }}>
        {([["Documents", total + 1], ["Agreements", total], ["Executed", signed]] as [string, number][]).map(([label, value]) => (
          <div key={label} style={{ textAlign: "center" }}>
            <div style={{ fontWeight: 900, fontSize: "1.2rem", color: TEXT, lineHeight: 1 }}>{value}</div>
            <div style={{ fontSize: "0.67rem", color: DIM, textTransform: "uppercase", letterSpacing: "0.08em", marginTop: 2 }}>{label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────
export default function LegalDocumentsSection() {
  const [sigs,    setSigs]    = useState<PublicSignature[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSigs = useCallback(async () => {
    try {
      const res = await fetch("/api/legal/signatures");
      if (res.ok) setSigs(await res.json() as PublicSignature[]);
    } catch { /* non-critical */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchSigs(); }, [fetchSigs]);

  function onNew(sig: PublicSignature) { setSigs(prev => [...prev, sig]); }

  const signedCount = DOCS.filter(d => docFullySigned(d, sigs)).length;

  return (
    <section style={{ borderTop: `1px solid ${BORDER}`, padding: "80px 2rem" }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>

        {/* Section heading */}
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <p style={{ color: GOLD, fontSize: "0.72rem", fontWeight: 800, letterSpacing: "0.18em", textTransform: "uppercase", marginBottom: 12 }}>
            Legal Agreements & E-Signatures
          </p>
          <h2 style={{ fontSize: "clamp(1.5rem, 3.5vw, 2.1rem)", fontWeight: 900, color: TEXT, letterSpacing: "-0.025em", lineHeight: 1.2, marginBottom: 14 }}>
            Complete legal framework between<br />NyxCollective LLC and Destiny Springs Healthcare
          </h2>
          <p style={{ color: MUTED, maxWidth: 620, margin: "0 auto 28px", lineHeight: 1.75, fontSize: "0.9rem" }}>
            All governing agreements are available for review and electronic execution. Documents are organized by function and should be reviewed and executed as a complete set. All signatures are time-stamped and stored with a full audit trail.
          </p>
        </div>

        {/* Progress */}
        {!loading && (
          <div style={{ marginBottom: 36 }}>
            <ProgressBar signed={signedCount} total={DOCS.length} />
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: "center", color: DIM, padding: "48px 0" }}>Loading documents…</div>
        ) : (
          <>
            {CATEGORIES.map(cat => {
              const catDocs = cat.types.map(t => DOCS_BY_TYPE[t]).filter(Boolean);
              return (
                <div key={cat.label} style={{ marginBottom: 44 }}>
                  {/* Category header */}
                  <div style={{ marginBottom: 14, paddingBottom: 12, borderBottom: `1px solid ${BORDER}` }}>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 3 }}>
                      <h3 style={{ margin: 0, fontSize: "0.8rem", fontWeight: 800, color: GOLD, letterSpacing: "0.12em", textTransform: "uppercase" }}>
                        {cat.label}
                      </h3>
                      <span style={{ fontSize: "0.72rem", color: DIM }}>
                        ({catDocs.length} {catDocs.length === 1 ? "document" : "documents"})
                      </span>
                    </div>
                    <p style={{ margin: 0, fontSize: "0.8rem", color: DIM, lineHeight: 1.55, maxWidth: 700 }}>{cat.description}</p>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {catDocs.map(doc => (
                      <DocCard
                        key={doc.type}
                        doc={doc}
                        index={DOCS.findIndex(d => d.type === doc.type)}
                        total={DOCS.length}
                        sigs={sigs}
                        onNewSignature={onNew}
                      />
                    ))}
                  </div>
                </div>
              );
            })}

            {/* Reference documents */}
            <div>
              <div style={{ marginBottom: 14, paddingBottom: 12, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                <h3 style={{ margin: 0, fontSize: "0.8rem", fontWeight: 800, color: DIM, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 3 }}>
                  Reference Documents
                </h3>
                <p style={{ margin: 0, fontSize: "0.8rem", color: DIM, lineHeight: 1.55 }}>
                  Informational documents for record-keeping. No signatures required.
                </p>
              </div>
              <InvoiceCard index={DOCS.length} total={DOCS.length + 1} />
            </div>
          </>
        )}

        {/* E-Sign Legal Disclaimer */}
        <div style={{ marginTop: 44, padding: "18px 22px", background: SUB, border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10 }}>
          <div style={{ fontSize: "0.7rem", fontWeight: 800, color: DIM, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 8 }}>
            Legal Notice — Electronic Signatures
          </div>
          <p style={{ margin: 0, fontSize: "0.76rem", color: DIM, lineHeight: 1.7 }}>
            Electronic signatures executed on this platform carry the same legal validity as handwritten signatures under the{" "}
            <strong style={{ color: MUTED }}>Electronic Signatures in Global and National Commerce Act (E-SIGN), 15 U.S.C. § 7001</strong>, and the{" "}
            <strong style={{ color: MUTED }}>Arizona Uniform Electronic Transactions Act (A.R.S. § 44-7001 et seq.)</strong>. Each signature record retains the signer&apos;s typed name, email address, IP address, user-agent string, and an immutable UTC timestamp for audit and legal purposes. The documents presented here are intended to represent the Parties&apos; agreement — independent legal counsel review is recommended prior to execution.
          </p>
        </div>
      </div>
    </section>
  );
}
