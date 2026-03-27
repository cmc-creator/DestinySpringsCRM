# Destiny Springs CRM Automation Catalog

## Priority 1 - Safe, High-Value Automations

### Follow-Up Reminders
- Trigger when lead or opportunity `nextFollowUp` is due or overdue
- Delivery options: in-app notification, email digest, daily rep summary
- Best for immediate ROI with low risk

### Quiet Referral Source Alerts
- Trigger when a referral source has no referrals or logged activity in 30, 45, or 60 days
- Recommend next action: visit, lunch, call, in-service, or email touchpoint
- Best for relationship retention and census recovery

### Low Census Playbooks
- Trigger when active pipeline volume or admissions fall below threshold
- Aegis generates a 48-hour or 72-hour action plan for target source types and outreach sequences
- Best for admins and rep leaders

### Daily / Weekly Digest Emails
- Rep digest: due follow-ups, stale opportunities, high-priority leads
- Admin digest: pipeline by stage, overdue items, AI usage, pending approvals
- Account digest: open engagements, invoice reminders, next steps

## Priority 2 - Guided Outreach Automations

### Drafted Outreach Sequences
- Aegis drafts outreach for EDs, crisis units, courts, outpatient psych, PCPs, and community mental health
- User chooses tone, cadence, and approval requirement
- Recommended default: draft only, never auto-send without explicit opt-in

### Campaign Templates By Source Type
- New ED intro campaign
- Reactivation campaign for quiet facilities
- Court / legal education sequence
- Detox / dual diagnosis service line awareness campaign
- In-service or lunch-and-learn invitation sequence

### Calendar-Based Outreach Nudges
- Before a facility visit: send prep brief and talking points
- After a meeting: prompt for recap, next step, and AI-generated follow-up email
- Best when connected to Outlook or Google Calendar

## Priority 3 - Workflow Automations

### Opportunity Stage Hygiene
- Alert when opportunity sits too long in Inquiry, Clinical Review, or Insurance Auth
- Suggest exact next action based on current stage
- Can auto-create a follow-up task after review

### Referral Intake Routing
- Suggest assigned rep or workflow owner based on geography, service line, or source type
- Escalate urgent referrals based on business rules
- Recommended as suggestion-first, not fully automatic at first

### Activity Capture Prompts
- After an email, site visit, calendar event, or note, prompt user to log activity with one click
- Aegis can prefill activity type, title, notes, and linked records

## Priority 4 - Advanced Personalization

### User Preference Learning
- Learn preferred output style: concise plan, drafted email, call script, checklist, or strategy memo
- Learn preferred source focus: ED, court, CSU, outpatient, PCP, community mental health
- Learn preferred automation thresholds and digest schedules

### Role-Specific Copilot Modes
- Admin mode: portfolio view, compliance risk, pipeline governance, adoption metrics
- Rep mode: territory strategy, reactivation plan, outreach drafting, follow-up coaching
- Account mode: engagement visibility, invoice clarity, contract status, partner communication

### Smart Recommendation Ranking
- Prioritize actions based on accepted proposals, helpful feedback, and recent workload
- Down-rank suggestions users consistently dismiss or mark not useful

## Guardrails To Keep
- Auto-send outbound marketing or relationship emails only after explicit user opt-in
- Keep AI-created CRM writes behind review and confirmation
- Log every automation-triggered suggestion or action to audit
- Start with reminders and draft generation before enabling autonomous delivery

## Recommended Rollout Order
1. Follow-up reminders
2. Quiet source alerts
3. Daily and weekly digests
4. Drafted outreach sequences
5. Stage hygiene prompts
6. Referral routing suggestions
7. Advanced personalization and ranking

## What I Would Not Auto-Do Initially
- Auto-send mass marketing emails with no approval
- Auto-delete or auto-close CRM records
- Auto-change opportunity stage without human confirmation
- Auto-contact referral sources based only on weak or incomplete data