# Destiny Springs Healthcare CRM — User Guide

> **NyxAegis Platform** · Behavioral Health Admission & Referral Management
> Version: Current · Last updated: 2026

---

## Table of Contents

1. [Overview](#overview)
2. [User Roles](#user-roles)
3. [Getting Started](#getting-started)
4. [Complete Feature List by Role](#complete-feature-list-by-role)
5. [Admin Module Reference](#admin-module-reference)
   - [Dashboard](#admin-dashboard)
   - [Admissions Pipeline](#admissions-pipeline)
   - [Leads](#leads)
   - [Activities](#activities)
   - [Contracts](#contracts)
   - [Referrals](#referrals)
   - [Referral Sources](#referral-sources)
   - [Accounts (Facilities)](#accounts-facilities)
   - [Territory Map](#territory-map)
   - [Reps](#reps)
   - [Communications](#communications)
   - [Compliance](#compliance)
   - [Analytics](#analytics)
   - [Reports](#reports)
   - [Census](#census)
   - [Payor Mix](#payor-mix)
   - [Audit Log](#audit-log)
   - [Pre-Assessment Inbox](#pre-assessment-inbox)
   - [Resource Library (Admin)](#resource-library-admin)
   - [Calendar](#admin-calendar)
   - [Messages](#messages)
   - [Notifications](#notifications)
   - [User Accounts](#user-accounts)
   - [Import Data](#import-data)
   - [Integrations](#integrations)
   - [Settings](#settings)
6. [Rep Module Reference](#rep-module-reference)
   - [Rep Dashboard](#rep-dashboard)
   - [My Admissions](#my-admissions)
   - [My Territory](#my-territory)
   - [Communications (Rep)](#communications-rep)
   - [Pre-Assessment Form](#pre-assessment-form)
   - [Resource Library (Rep)](#resource-library-rep)
   - [Documents](#documents)
   - [Payments](#payments)
7. [Account (Facility) Module Reference](#account-facility-module-reference)
8. [How-To Workflows](#how-to-workflows)
   - [Log a Field Activity with GPS](#log-a-field-activity-with-gps)
   - [Use Voice Dictation for Notes](#use-voice-dictation-for-notes)
   - [Submit a Pre-Assessment Inquiry](#submit-a-pre-assessment-inquiry)
   - [Review and Action a Pre-Assessment (Admin)](#review-and-action-a-pre-assessment-admin)
   - [Manage the Resource Library (Admin)](#manage-the-resource-library-admin)
   - [Move a Lead Through the Pipeline](#move-a-lead-through-the-pipeline)
   - [Create and Track a Referral](#create-and-track-a-referral)
   - [Read Executive Dashboard Metrics](#read-executive-dashboard-metrics)
9. [Mobile & Field Features](#mobile--field-features)
10. [Theming & Accessibility](#theming--accessibility)
11. [Integrations Reference](#integrations-reference)
12. [Deployment & Database](#deployment--database)

---

## Overview

The Destiny Springs Healthcare CRM is a full-featured behavioral health admission and referral management platform built for:

- **Business Development Representatives (BDRs/Reps)** — field staff who cultivate relationships with hospitals, physicians, and referral sources to generate patient admissions.
- **Admissions/Operations Administrators** — back-office staff who manage the full pipeline from lead to admitted patient.
- **Referring Facilities (Accounts)** — hospital/facility contacts who can view their engagement history and invoices.

The platform is built on **Next.js 14 App Router**, **PostgreSQL via Prisma**, and **NextAuth** for authentication, deployed on **Vercel**. It supports white-labeling, multiple themes, and real-time in-app notifications.

---

## User Roles

| Role | Access Level | Primary Use |
|------|-------------|-------------|
| **ADMIN** | Full access to all modules | Operations managers, admissions coordinators, executives |
| **REP** | Field-focused subset | Business development reps in the field |
| **ACCOUNT** | Read-only engagement history | Referring facility contacts |

Each role has a tailored navigation sidebar and only sees data relevant to their scope. REPs only see their own activities, opportunities, and pipeline. ADMINs see everything across all reps.

---

## Getting Started

### Logging In
1. Navigate to the platform URL.
2. Enter your email and password on the **Login** page.
3. If 2FA is enabled on your account, enter the one-time code from your authenticator app.
4. You will be redirected to your role-specific dashboard.

### First-Time Setup (Admins)
1. Go to **Settings** → configure organization name, logo, and branding.
2. Go to **User Accounts** → invite reps and admin users by email.
3. Go to **Accounts** → add referring hospital/facility accounts.
4. Go to **Referral Sources** → add referring physicians, case managers, and contacts.
5. Go to **Territory Map** → assign geographic territories to each rep.
6. Go to **Resource Library** → upload brochures, clinical protocols, and training materials for your reps.

---

## Complete Feature List by Role

### ADMIN — All Features

**Command**
- Executive dashboard with KPI cards (census, admissions this month, MTD revenue, conversion rate)
- Real-time in-app notifications with severity levels
- Full-team calendar with activity and event tracking
- Internal messaging system

**Admission Pipeline**
- Full admissions pipeline (Kanban-style lead → opportunity tracking)
- Lead management with source attribution and denial tracking
- Activity log across all reps (GPS-stamped, voice-noted)
- Contract generation and e-signature tracking

**Referrals**
- Referral tracking with credited rep, referred hospital, outcome
- Referral source management with tier classification (A/B/C) and influence scoring
- Competitor intelligence notes per referral source

**Accounts & Territory**
- Facility/hospital account records with contact details, priority levels, and engagement history
- Interactive territory map showing rep coverage, lead density, and activity heatmaps

**Reps**
- Rep directory with performance stats, territory assignment, and compliance status
- Communication logs (calls, emails, visits) per rep
- Compliance document tracking (certifications, training completions)

**Intelligence**
- Analytics: full funnel metrics, rep performance leaderboards, source ROI
- Reports: printable/exportable reports (admissions, revenue, referral trends)
- Census: daily bed census view across tracked facilities
- Payor Mix: insurance/payor breakdown for admitted patients
- Audit Log: full event history of every data change in the system

**Intake**
- **Pre-Assessment Inbox**: receive, review, and action rep-submitted pre-assessment inquiries
- **Resource Library**: upload, organize, and manage documents and assets for reps

**Settings**
- User account management (invite, suspend, change roles)
- Data Import (CSV upload for leads, hospitals, referral sources)
- Integrations (Google Calendar, iCANotes, MedWorxs, Paycom, Monday.com, M365, discharge sync, email tracking, e-signature)
- Organization settings (branding, logo, colors, domain)
- Invoices / billing

---

### REP — Field & Outreach Features

**Overview**
- Personal dashboard (own KPIs: leads, conversions, revenue, overdue tasks)
- Notifications (assignment alerts, pre-assessment status updates, messages)
- Internal messages

**Pipeline**
- My Admissions: personal opportunity pipeline view
- My Territory: interactive map of assigned territory with account pins

**Outreach**
- Communications log: log calls, emails, in-person visits
- Activities feed with GPS stamps and voice-dictated notes

**Intake**
- **Pre-Assessment Submission Form**: submit patient pre-assessments to the admin team
- **Resource Library**: browse and download approved facility documents, brochures, and protocols

**Files & Finance**
- Documents: compliance documents, certifications, required paperwork
- Payments: commission and payment history

---

### ACCOUNT — Facility Portal

**Overview**
- Engagement summary dashboard (referrals sent, admissions, response times)
- Engagement history list with dates, rep contacts, and outcomes
- Invoice history

---

## Admin Module Reference

### Admin Dashboard

The executive dashboard provides a real-time operational snapshot.

**KPI Cards (top row)**
| Metric | Description |
|--------|-------------|
| Current Census | Total patients currently admitted |
| Admissions (MTD) | Month-to-date confirmed admissions |
| MTD Revenue | Month-to-date revenue from admissions |
| Conversion Rate | Leads → Admissions conversion % |
| Avg Length of Stay | Average days per admitted patient (when available) |
| Active Leads | Leads currently in the pipeline |

**Charts & Panels**
- **Admission Funnel**: bar chart showing Lead → Screened → Pending → Admitted → Discharged counts
- **Revenue Trend**: line chart of admission revenue over the last 12 months
- **Rep Leaderboard**: ranked list of reps by admissions this month
- **Recent Activities Feed**: latest field activity log entries
- **Overdue Leads/Opportunities**: red-flagged items past their follow-up date

---

### Admissions Pipeline

The admissions pipeline tracks every opportunity from lead generation to admission (or denial).

**Opportunity Status Flow**
```
LEAD → SCREENING → PENDING_ADMISSION → ADMITTED → DISCHARGED
                ↓
            DENIED / LOST
```

**Key Fields**
- Patient name, DOB, presenting concern
- Assigned rep, referring hospital, referral source
- Insurance/payor, authorization status
- Admission date, discharge date, length of stay
- Revenue amount, denial reason (if denied)

**Denial Enforcement**: Once an opportunity is marked DENIED, the record is locked and cannot be moved back to an active status without admin override. This preserves data integrity for denial tracking.

---

### Leads

Leads are early-stage referral inquiries that have not yet been fully screened for admission.

- Create leads manually or via CSV import.
- Assign leads to reps automatically by territory or manually.
- Track lead source (referral source, hospital, marketing campaign).
- Promote a lead to a full Opportunity once qualified.
- Aged leads (past follow-up date with no action) appear in the Overdue panel on the admin dashboard.

---

### Activities

Activities are logged touchpoints — calls, in-person visits, facility tours, educational lunches, etc.

**Activity Types**: Call, In-Person Visit, Email, Text, Facility Tour, Lunch/Dinner, Educational Event, Other

**Key Fields**
- Type, date/time, notes (supports voice dictation)
- Associated hospital, referral source, or opportunity
- **GPS coordinates** (auto-captured via "Use My Location")
- **Check-in / Check-out timestamps** (lat/lng + arrived/departed datetime)

See [Log a Field Activity with GPS](#log-a-field-activity-with-gps) for the full workflow.

---

### Contracts

Track facility partnership contracts and e-signature status.

- Create contracts tied to hospital accounts.
- Track signature status (Pending, Sent, Signed, Expired).
- Integration with e-signature providers (configured in Integrations).

---

### Referrals

Referrals are formal admissions referral records linking a sending facility/provider to an admission.

- Each referral is linked to: sending hospital, referral source (provider/CM), rep, and opportunity.
- Track referral date, response time, outcome (converted / not converted).
- Track discharge handoff destination (Referred Out To) for post-discharge network visibility.
- Filter by destination, export to CSV, and review top destination leaderboard from the Admissions Referrals ledger.
- Missing discharge destinations are flagged for operational follow-up.
- Weekly destination trend view (last 8 weeks) shows whether handoff quality is improving.
- Sync Health panel shows latest Bedboard and Discharge sync status (healthy/stale/failed).
- SLA Alerts panel highlights stale syncs and missing destination records.
- View referral trend reports in Analytics.

---

### Referral Sources

Referral sources are individual contacts (physicians, case managers, discharge planners, social workers) who send patients.

**Fields**
| Field | Description |
|-------|-------------|
| Name, Title, Specialty | Contact identification |
| Hospital | Parent facility |
| Tier | A (top producer), B (growing), C (inactive) — drives outreach priority |
| Influence Role | Their role in the referral decision (e.g., Primary Decision Maker, Gatekeeper, Champion, Observer) |
| Influence Level | 1–5 numeric score of their organizational influence |
| Competitor Intel | Notes on competitor facilities they currently refer to |
| Tags | Custom labels (e.g., "VIP", "New Contact") |

**Tiering Strategy**: Use Tier A for your top 20% of sources generating 80% of referrals. Schedule more frequent touchpoints for A-tier sources.

---

### Accounts (Facilities)

Accounts are the hospitals, treatment centers, ERs, and outpatient clinics from which you receive referrals.

- Track address, phone, primary contacts, and account type.
- View all referrals and activities linked to an account.
- Assign account to a rep's territory.
- Set priority level (High / Medium / Low) to guide rep outreach cadence.

---

### Territory Map

An interactive map showing:
- All facility accounts as pins, colored by priority level.
- Rep coverage areas as shaded regions.
- Activity heatmap (density of logged field visits).
- Click any pin to view the account record.

---

### Reps

Human resources–style directory of all business development reps.

- View rep profile: name, email, phone, territory, hire date.
- Performance summary: admissions this cycle, leads owned, conversion rate.
- Compliance status: document checklist (see Compliance section).
- Manage rep assignments (territory, lead re-assignments on departure).

---

### Communications

Bulk and individual communication management across the rep team.

- View all logged communications (calls, emails, visits) across all reps.
- Filter by rep, date range, type.
- Use for rep performance audits and coaching.

---

### Compliance

Track required certifications, training, and documentation for each rep.

- Upload and manage required compliance documents (licenses, certifications, training completions).
- Track expiration dates — expired docs show a red warning.
- Export compliance status reports for HR.

---

### Analytics

Deep-dive performance analytics for the leadership team.

**Available Reports**
- **Funnel Analytics**: conversion rates at each pipeline stage
- **Rep Performance**: side-by-side comparison of reps by admissions, revenue, activity count
- **Source ROI**: referral volume and revenue by referral source
- **Territory Performance**: geographic heat maps of admission density
- **Payor Mix Trend**: insurance breakdown over time
- **Response Time**: average time from referral receipt to first contact / admission

---

### Reports

Pre-built printable and exportable reports.

- Admissions Summary (daily, weekly, monthly, custom range)
- Revenue Report
- Referral Source Report
- Rep Activity Report
- Denial Analysis Report
- Export to PDF or CSV

---

### Census

Daily census tracking across monitored facilities.

- View current occupied/available beds per facility.
- Update census counts manually or via automated sync (iCANotes / MedWorxs integration).
- Census data feeds the executive dashboard KPI card.

---

### Payor Mix

Insurance/payor breakdown showing:
- Count and percentage of admissions by payor (Commercial, Medicare, Medicaid, Self-Pay, Out-of-Network, etc.)
- Revenue by payor category
- Month-over-month payor mix trend

---

### Audit Log

Immutable record of all data changes in the system.

- Every create, update, and delete action is logged with: timestamp, user, action, affected record, before/after values.
- Filter by user, date, record type, or action.
- Non-deletable — cannot be cleared by any user, including ADMIN.
- Export for compliance reviews.

---

### Pre-Assessment Inbox

The central admin inbox for patient pre-assessment inquiries submitted by field reps.

**Inbox Features**
- Status filter tabs: **All**, **Submitted** (new), **Under Review**, **Converted**, **Declined**, **On Hold**
- Each row shows: patient initials, age, urgency color (green/orange/red), clinical risk flags (SI, SU, Prior Tx), submitting rep, submission time
- Click any row to open the **Review Panel**

**Review Panel**
- Full patient details: initials, age, gender
- Clinical presentation: presenting concern, medications, SI/SU/priorTx flags, prior treatment details
- Insurance: carrier, member ID, group number
- Referral context: sending hospital, referral source, referring provider
- Urgency: ROUTINE / URGENT / EMERGENT

**Action Buttons**
| Action | Description |
|--------|-------------|
| Mark Under Review | Start the clinical review process |
| Place On Hold | Hold pending missing information |
| Decline | Decline the inquiry (with review notes) |
| Convert | Approve and automatically create an Opportunity |

When an assessment is actioned, the submitting rep receives an in-app notification with the result.

**Urgency Levels**
- 🟢 **ROUTINE** — Standard review turnaround
- 🟡 **URGENT** — Prioritize within same business day
- 🔴 **EMERGENT** — Requires immediate review; sends an ALERT-level admin notification

---

### Resource Library (Admin)

Manage the digital library of documents and assets available to field reps.

**Resource Categories**
| Category | Use |
|----------|-----|
| Brochure | Marketing/patient-facing materials |
| Clinical Protocol | Treatment protocols and clinical pathways |
| Insurance Guide | Payor-specific authorization guides |
| Visitation Policy | Facility visitation rules per facility |
| Bed Availability | Current bed availability sheets |
| Referral Form | Blank or pre-filled referral intake forms |
| Training Material | Internal rep training content |
| Marketing Asset | Campaign materials, brand assets |
| Other | Uncategorized documents |

**Admin Capabilities**
- Add a new resource (title, description, category, tags, external URL or file URL, thumbnail)
- Edit any resource
- Archive (soft-delete) a resource — it disappears from the rep library but is not permanently deleted
- Filter by category, search by title or tag

---

### Admin Calendar

Full-team calendar view.

- See all activities logged by all reps.
- Create admin-assigned events and tasks.
- Filter by rep, activity type, or date range.
- Switch between Month, Week, and Day view.
- Click any event to view or edit the full activity record.

---

### Messages

Internal messaging system.

- Direct message any rep or admin user.
- Message threads with read receipts.
- Notifications for unread messages.

---

### Notifications

In-app notification center.

- Receive alerts for: new pre-assessments (EMERGENT = ALERT badge), rep submissions, opportunity status changes, overdue follow-ups, system events.
- Severity levels: INFO, WARNING, ALERT
- Mark as read / clear all.
- Notifications linked to source records for one-click navigation.

---

### User Accounts

Manage all platform users.

- Invite new users by email (sends email with setup link).
- Assign roles: ADMIN, REP, ACCOUNT.
- Suspend or reactivate users.
- Reset 2FA for a user.
- View last login date and activity status.

---

### Import Data

Bulk data import via CSV upload.

- Import hospitals/facilities
- Import referral sources
- Import leads
- Download CSV template for each record type.
- Preview import results before committing.
- Duplicate detection (matches on email or facility name).

---

### Integrations

Pre-built integration connectors available for configuration.

| Integration | Purpose |
|-------------|---------|
| **Google Calendar** | Bi-directional sync of activities with rep Google Calendars |
| **iCANotes** | EHR sync — pull census data, push admission outcomes |
| **MedWorxs** | Clinical operations data sync |
| **Paycom** | HR/payroll data for rep commission calculations |
| **Monday.com** | Project management sync for admissions teams |
| **Microsoft 365 Admissions Referrals** | Daily bedboard sync from M365 Excel/SharePoint to admissions referral records |
| **Discharge Sync** | Automated discharge date and referred-out destination capture from M365 discharge sheet |
| **Email Tracking** | Track email open/click rates for rep outreach |
| **E-Signature** | DocuSign / SignNow for contract e-signatures |
| **Data Migration** | One-time migration tools for legacy CRM data |

Each integration has its own configuration page with API key inputs, sync settings, and connection testing.

---

### Settings

Organization-wide configuration.

- **Branding**: organization name, logo, favicon, primary color, accent color, custom domain
- **Support Email**: contact for platform support emails
- **Plan & Billing**: manage subscription tier and Stripe billing
- **Security**: enforce 2FA, session timeout settings
- **White-Label**: configure custom domain and branded experience for ACCOUNT users

---

## Rep Module Reference

### Rep Dashboard

Personal KPI dashboard scoped to the logged-in rep's data only.

**KPI Cards**
- My Leads (active)
- My Admissions (MTD)
- My Conversions (MTD)
- Overdue Leads (past follow-up date)
- Overdue Opportunities (past expected admission date)

**Activity Feed**: Recent field activities logged by this rep.

**Quick Log Widget (⚡ FAB button)**: Floating action button in the bottom-right corner for rapid activity logging from any page (see [Log a Field Activity with GPS](#log-a-field-activity-with-gps)).

---

### My Admissions

Rep's personal opportunity pipeline — same data as the admin Admissions module but filtered to this rep only.

- View opportunities in list or Kanban view.
- Update opportunity status (within allowed transitions).
- Add notes or activities to an opportunity.
- View denial reasons on declined opportunities (read-only after denial).

---

### My Territory

Interactive map showing:
- The rep's assigned geographic territory boundary.
- All facility accounts within the territory as pins.
- Color-coded by account priority.
- Click a pin to view the account and log an activity.

---

### Communications (Rep)

Log and review the rep's own outreach communications.

- Log a new communication (call, email, in-person visit) with date, contact, and notes.
- View personal communication history.
- This data feeds into the admin Communications module for manager review.

---

### Pre-Assessment Form

Submit a clinical pre-assessment inquiry to the admissions team for a potential patient.

**Form Sections**

**1. Patient Information**
- Patient initials (NOT full name — HIPAA-friendly)
- Age
- Gender
- Urgency level: ROUTINE / URGENT / EMERGENT

> ⚠️ Selecting **EMERGENT** triggers a red banner on the form and sends an ALERT-level notification to all admins immediately on submission.

**2. Clinical Presentation**
- Presenting concern (free text)
- Current medications
- Checkboxes: Suicidal Ideation (SI), Substance Use (SU), Prior Treatment
- Prior treatment details (if Prior Treatment is checked)

**3. Insurance**
- Primary insurance carrier
- Member ID
- Group number

**4. Referral Context**
- Sending hospital (dropdown of all accounts)
- Referral source (dropdown of all referral sources)
- Referring provider name

**Submission Flow**
1. Fill out all required sections.
2. Click **Submit Pre-Assessment**.
3. A success screen confirms the submission.
4. All admin users receive an in-app notification.
5. You can track the status under **My Submissions** tab.

**My Submissions Tab**
- See all past submissions with: patient initials, urgency color, SI/SU flags, submission date, current status badge.
- Status updates (Under Review, Converted, Declined, On Hold) appear as in-app notifications to the rep.

---

### Resource Library (Rep)

Browse and download approved resources provided by the admin team.

- Resources are grouped by category for easy navigation.
- Each resource shows: title, description, category badge, tags.
- **Download** button for file-based resources (opens file URL in new tab).
- **Open Link** button for web-based resources.
- Search by title or tag is available at the top.
- Read-only — reps cannot add, edit, or delete resources.

---

### Documents

Compliance document center for the rep.

- View and download required compliance documents (certifications, training records, HR forms).
- Upload completed documents as requested by admin.
- Expiry date warnings for time-limited certifications.

---

### Payments

Commission and payment history.

- View payment records linked to admitted patients / closed opportunities.
- Payment dates, amounts, status (Pending / Paid).
- Integration with Paycom for automated payroll data (when configured).

---

## Account (Facility) Module Reference

The Account portal is a read-only external-facing view for referring hospital contacts.

### Account Dashboard
- Overview stats: total referrals sent, conversion rate, average response time.
- Recent engagement history: list of rep visits, calls, and referral outcomes.

### Engagements
- Full history of all logged activities involving this facility.
- Filterable by date range and activity type.

### Invoices
- View any invoices generated for services associated with this account.

---

## How-To Workflows

### Log a Field Activity with GPS

**Option A: From the Calendar (full modal)**
1. Navigate to **Calendar** (admin) or click the ⚡ FAB button from any rep page.
2. Click **+ New Activity** or an existing time slot.
3. Select **Activity Type** (e.g., In-Person Visit).
4. Fill in **Date/Time**, **Hospital**, and **Referral Source** as needed.
5. In the **Field Check-In** section:
   - Click **📍 Use My Location** — your browser will prompt for location access. After permission is granted, latitude/longitude are auto-filled.
   - Click **✅ Arrived Now** to stamp the current time into the *Arrived At* field.
   - When leaving, click **🚪 Departed Now** to stamp the departure time.
6. You can also manually edit the coordinate or timestamp fields.
7. Add notes (see Voice Dictation below).
8. Click **Save Activity**.

**Option B: Quick Log Widget (⚡ FAB)**
1. Tap the ⚡ floating button visible on all rep and admin pages.
2. In Step 1, select the activity type.
3. In Step 2, fill in notes (voice dictation supported).
4. In Step 3, the GPS capture and check-in options are available.
5. Tap **Save**.

> **Note**: GPS requires HTTPS and browser location permission. The first time you use it, your browser will show a permission dialog — click "Allow".

---

### Use Voice Dictation for Notes

Voice dictation is powered by the **Web Speech API** (Chrome and Edge only).

1. In any Activity modal or Quick Log form, find the **Notes** field.
2. Click the **🎙️ Dictate** button next to the Notes label.
3. Your browser will request microphone access — click **Allow**.
4. Speak your notes clearly. The notes field border turns red while recording is active.
5. Dictated text is appended to any existing notes.
6. Click **🔴 Stop** to end dictation.

> **Note**: Voice dictation requires Chrome or Edge browser. Safari and Firefox do not support the Web Speech API.

---

### Submit a Pre-Assessment Inquiry

*(Rep workflow)*

1. From any rep page, navigate to **Intake → Pre-Assessment** in the sidebar.
2. Click the **+ New Submission** tab (or it opens by default if no prior submissions).
3. Fill in:
   - **Patient initials and age** (never use full patient name).
   - **Urgency level** — if EMERGENT, a red warning banner appears.
   - **Clinical presentation**: presenting concern, current meds, SI/SU/Prior Tx checkboxes.
   - **Insurance** information.
   - **Referral context**: select the sending hospital and referral source from dropdowns.
4. Click **Submit Pre-Assessment**.
5. A confirmation message appears. The admin team is immediately notified.
6. Switch to the **My Submissions** tab to track status.

---

### Review and Action a Pre-Assessment (Admin)

1. Watch for an in-app notification (bell icon) for a new pre-assessment submission.
2. Navigate to **Intake → Pre-Assessment Inbox**.
3. The **Submitted** tab shows all new, unreviewed submissions.
4. Click any row to open the **Review Panel** on the right.
5. Read all patient details, clinical flags, and insurance info.
6. Add **Review Notes** in the text area.
7. Click the appropriate action button:
   - **Mark Under Review** — notifies the rep that review has started.
   - **On Hold** — requests more information; rep is notified.
   - **Decline** — closes the inquiry; rep is notified.
   - **Convert to Opportunity** — creates a new Opportunity in the pipeline; rep is notified.

---

### Manage the Resource Library (Admin)

**Add a Resource**
1. Navigate to **Intake → Resource Library**.
2. Click **+ Add Resource**.
3. In the modal, fill in:
   - **Title** (required)
   - **Description**
   - **Category** (select from dropdown)
   - **Tags** (comma-separated)
   - **File URL** (direct link to the file on cloud storage/SharePoint/Drive)
   - **External URL** (link to a webpage or web-based resource)
   - **Thumbnail URL** (optional preview image)
4. Click **Save**.

**Edit a Resource**
1. Find the resource card in the grid.
2. Click the **Edit** (pencil) button on the card.
3. Modify fields in the modal.
4. Click **Save**.

**Archive a Resource**
1. Click the **Archive** button on a resource card.
2. The resource is soft-deleted — it disappears from the rep library but is retained in the admin archive.

**Filter and Search**
- Use the **Category** dropdown to filter by type.
- Use the **Search** box to find by title or tag.

---

### Move a Lead Through the Pipeline

1. Go to **Admissions Pipeline** (admin) or **My Admissions** (rep).
2. Find the lead/opportunity card.
3. Click on it to open the detail view.
4. Use the **Status** dropdown to advance the stage:
   - **Lead → Screening**: call made, initial clinical info received.
   - **Screening → Pending Admission**: insurance verified, bed confirmed.
   - **Pending → Admitted**: patient has physically arrived.
   - **Admitted → Discharged**: patient discharged (triggers LOS calculation).
5. If denying, select **Denied** and fill in the denial reason — the record is then locked.
6. Save changes. The pipeline board updates in real time.

---

### Create and Track a Referral

1. Navigate to **Referrals**.
2. Click **+ New Referral**.
3. Fill in:
   - **Referring hospital** (sending facility)
   - **Referral source** (specific provider/CM contact)
   - **Rep** (assigned business development rep)
   - **Opportunity** (link to a pending or active opportunity if one exists)
   - **Referral date**
   - **Referred Out To** (for discharged patients, where applicable)
4. Save. The referral appears in the dashboard referral feed.
5. As the opportunity progresses, the referral outcome updates automatically.
6. Use filters for status, date range, and **Referred Out To** to isolate destination trends.
7. Use **Export CSV** to share destination and referral attribution data with leadership/finance.

---

### Read Executive Dashboard Metrics

The admin dashboard is designed for a morning operational review. Here's how to read it:

| Card | Action Needed |
|------|--------------|
| **Current Census** | Compare against capacity — low census = increase outreach intensity |
| **Admissions MTD** vs. goal | Identify if reps are behind target |
| **Conversion Rate** | If below 30%, investigate denial reasons in Reports |
| **Overdue Leads** | Assign or contact these leads today |
| **Rep Leaderboard** | Coach under-performing reps; reward top performers |
| **Admission Funnel** | Identify where in the pipeline you're losing volume |

---

## Mobile & Field Features

The CRM is optimized for mobile use during field visits. Key field-friendly features:

### Quick Log Widget (⚡)
- Persistent floating action button on all pages.
- Log an activity in under 30 seconds.
- Supports GPS capture and voice dictation from mobile.

### GPS Field Check-In
- **Use My Location**: Captures GPS coordinates using the device's location services.
- **Arrived Now / Departed Now**: One-tap timestamp capture — no typing needed in the field.
- Works on all modern mobile browsers (Chrome, Edge, Safari iOS).

### Voice Dictation
- Hands-free note taking while driving or walking between visits.
- Tap 🎙️ Dictate, speak, tap 🔴 Stop.
- Chrome Mobile and Edge Mobile supported.

### Progressive Web App (PWA)
- The app can be installed on iOS and Android home screens.
- Manifest and service worker configured for offline capability (requires network for data sync).

---

## Theming & Accessibility

The platform supports multiple visual themes, selectable in **Settings**.

| Theme | Description |
|-------|-------------|
| **Luxury** | Dark gold and leather tones — premium feel |
| **Azure** | Cool blue tones |
| **Emerald** | Sophisticated green palette |
| **Glass** | Dark glassmorphism with translucent panels |
| **Hot Pink** | Bold pink accent on neutral dark |
| **Rose** | Warm rose and cream tones |
| **Violet** | Deep purple with violet accents |

Themes use CSS custom properties (`--nyx-*` tokens) — the entire UI responds to theme changes without a page reload.

**Accessibility**
- Full keyboard navigation supported.
- ARIA labels on all interactive elements.
- Color contrast meets WCAG AA standards on all themes.
- Screen-reader compatible sidebar and modals.

---

## Integrations Reference

### Google Calendar
- Reps can connect their Google Calendar from **Integrations → Google Calendar**.
- Activities logged in the CRM sync as Google Calendar events.
- New Google Calendar events can optionally import as CRM activities.

### iCANotes
- Connect via API key from **Integrations → iCANotes**.
- Pulls daily census data for the Census dashboard.
- Pushes admission/discharge events back to iCANotes.

### MedWorxs
- Clinical operations data sync.
- Configure API credentials in **Integrations → MedWorxs**.

### Paycom
- HR/payroll integration for rep commission tracking.
- Rep admission data flows into Paycom for commission calculation.

### Monday.com
- Project management board sync.
- New opportunities can auto-create Monday.com items.

### Microsoft 365 Admissions Referrals
- Sync the Destiny Springs daily bedboard from M365 Excel/SharePoint.
- Extract and track admissions referrals (who referred each admission) in the Referrals ledger.
- Configured in **Integrations → Microsoft 365 Admissions Referrals Sync**.

### Discharge Sync
- Automated discharge date and referred-out destination capture from the M365 discharge sheet.
- Destination fields such as “Referred Out To”, “Discharge Destination”, or “Placement” are mapped into the Admissions Referrals ledger.
- Triggered by EHR webhook or scheduled sync.

### Email Tracking
- Track rep outreach emails (open rates, click rates).
- Requires email client plugin or BCC logging address.

### E-Sign
- DocuSign or SignNow for contract e-signatures.
- Configure in **Integrations → E-Sign**.

### Data Migration
- One-time import wizard for migrating from a legacy CRM (Salesforce, HubSpot, spreadsheets).
- Available under **Integrations → Data Migration**.

---

## Deployment & Database

### Stack
| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| Database | PostgreSQL (Neon / Vercel Postgres) |
| ORM | Prisma v7 |
| Auth | NextAuth (Credentials + OAuth) |
| Hosting | Vercel |
| Styling | Tailwind CSS + CSS custom properties |

### Environment Variables
Set these in Vercel project settings:

```env
DATABASE_URL=             # PostgreSQL connection string (pooled)
POSTGRES_PRISMA_URL=      # Alternative Prisma connection string
NEXTAUTH_SECRET=          # Random 32+ char secret
NEXTAUTH_URL=             # Full deployed URL (e.g., https://your-app.vercel.app)
```

### Database Schema Updates
The project uses **`prisma db push`** on each Vercel deployment (configured in `vercel-build` npm script). This means:
- Any schema changes made to `prisma/schema.prisma` are automatically applied to the production database on the next deployment.
- No manual migration commands are required in production.
- For local development with a database, run: `npx prisma db push` with a local DATABASE_URL set in `.env`.

### Prisma Client
After pulling code changes that include schema updates, regenerate the client:
```bash
npx prisma generate
```

---

*This guide covers the full feature set of the Destiny Springs Healthcare CRM platform. For technical questions or support, contact the platform administrator or refer to the README.md in the repository root.*
