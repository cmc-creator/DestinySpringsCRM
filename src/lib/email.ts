import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = `Destiny Springs Hub <${process.env.RESEND_FROM_EMAIL}>`;
const BASE = process.env.NEXTAUTH_URL ?? "https://destinyspringshub.com";

function layout(content: string): string {
  return `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:20px;background:#0a0a0a;font-family:'Helvetica Neue',Arial,sans-serif;">
  <div style="max-width:560px;margin:0 auto;background:#0f0d0a;border:1px solid rgba(201,168,76,0.25);border-radius:12px;overflow:hidden;">
    <div style="background:linear-gradient(135deg,#1a1208 0%,#0f0d0a 100%);padding:20px 28px;border-bottom:1px solid rgba(201,168,76,0.2);">
      <div style="font-size:10px;font-weight:700;letter-spacing:0.2em;color:#c9a84c;text-transform:uppercase;margin-bottom:2px;">DESTINY SPRINGS HUB</div>
      <div style="font-size:18px;font-weight:900;color:#ede4cf;letter-spacing:-0.01em;">NyxAegis CRM</div>
    </div>
    <div style="padding:24px 28px;">
      ${content}
    </div>
    <div style="padding:14px 28px;border-top:1px solid rgba(201,168,76,0.1);text-align:center;">
      <p style="margin:0;font-size:11px;color:rgba(237,228,207,0.3);">Destiny Springs Hub &bull; Internal CRM Notification &bull; Do not reply</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

function btn(href: string, label: string, color = "#c9a84c", textColor = "#1a1208"): string {
  return `<a href="${href}" style="display:inline-block;background:${color};color:${textColor};padding:10px 22px;border-radius:7px;font-weight:800;text-decoration:none;font-size:13px;letter-spacing:0.3px;">${label}</a>`;
}

function infoBox(accent: string, badgeText: string, title: string, sub: string): string {
  return `
    <div style="background:${accent}0f;border:1px solid ${accent}33;border-radius:8px;padding:14px 18px;margin-bottom:20px;">
      <div style="font-size:10px;font-weight:700;letter-spacing:0.1em;color:${accent};margin-bottom:4px;">${badgeText}</div>
      <div style="font-size:15px;font-weight:700;color:#ede4cf;">${title}</div>
      ${sub ? `<div style="font-size:12px;color:rgba(237,228,207,0.5);margin-top:3px;">${sub}</div>` : ""}
    </div>
  `;
}

// ── Task: Due Soon ───────────────────────────────────────────────────────────
export async function sendTaskDueSoonEmail(opts: {
  to: string;
  name: string;
  taskTitle: string;
  dueDate: string;
}) {
  if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM_EMAIL) return;
  await resend.emails
    .send({
      from: FROM,
      to: opts.to,
      subject: `Task Due Soon: ${opts.taskTitle}`,
      html: layout(`
        <h2 style="margin:0 0 6px;color:#ede4cf;font-size:17px;font-weight:800;">Task Due Soon</h2>
        <p style="color:rgba(237,228,207,0.55);margin:0 0 18px;font-size:14px;">Hi ${opts.name || "there"},<br>The following task is coming up soon.</p>
        ${infoBox("#fbbf24", "UPCOMING TASK", opts.taskTitle, `Due: ${opts.dueDate}`)}
        ${btn(`${BASE}/rep/tasks`, "View My Tasks")}
      `),
    })
    .catch((e: unknown) => console.error("[email] task-due-soon failed:", e));
}

// ── Task: Overdue ────────────────────────────────────────────────────────────
export async function sendTaskOverdueEmail(opts: {
  to: string;
  name: string;
  taskTitle: string;
  dueDate: string;
}) {
  if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM_EMAIL) return;
  await resend.emails
    .send({
      from: FROM,
      to: opts.to,
      subject: `Overdue Task: ${opts.taskTitle}`,
      html: layout(`
        <h2 style="margin:0 0 6px;color:#f87171;font-size:17px;font-weight:800;">Task Overdue</h2>
        <p style="color:rgba(237,228,207,0.55);margin:0 0 18px;font-size:14px;">Hi ${opts.name || "there"},<br>The following task is past its due date and still open.</p>
        ${infoBox("#f87171", "OVERDUE TASK", opts.taskTitle, `Was due: ${opts.dueDate}`)}
        ${btn(`${BASE}/rep/tasks`, "View My Tasks", "#f87171", "#fff")}
      `),
    })
    .catch((e: unknown) => console.error("[email] task-overdue failed:", e));
}

// ── Opportunity: Assigned to Rep ─────────────────────────────────────────────
export async function sendOpportunityAssignedEmail(opts: {
  to: string;
  name: string;
  oppTitle: string;
  hospitalName: string;
  stage: string;
}) {
  if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM_EMAIL) return;
  const stageLabel = opts.stage.replace(/_/g, " ");
  await resend.emails
    .send({
      from: FROM,
      to: opts.to,
      subject: `New Opportunity Assigned: ${opts.oppTitle}`,
      html: layout(`
        <h2 style="margin:0 0 6px;color:#ede4cf;font-size:17px;font-weight:800;">Opportunity Assigned to You</h2>
        <p style="color:rgba(237,228,207,0.55);margin:0 0 18px;font-size:14px;">Hi ${opts.name || "there"},<br>A new opportunity has been assigned to you in NyxAegis.</p>
        ${infoBox("#c9a84c", "NEW OPPORTUNITY", opts.oppTitle, `${opts.hospitalName} &bull; ${stageLabel}`)}
        ${btn(`${BASE}/rep/opportunities`, "View Opportunities")}
      `),
    })
    .catch((e: unknown) => console.error("[email] opp-assigned failed:", e));
}

// ── Compliance: Expiring Soon (to rep) ───────────────────────────────────────
export async function sendComplianceExpiringSoonEmail(opts: {
  to: string;
  name: string;
  docTitle: string;
  docType: string;
  expiresOn: string;
}) {
  if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM_EMAIL) return;
  const typeLabel = opts.docType.replace(/_/g, " ");
  await resend.emails
    .send({
      from: FROM,
      to: opts.to,
      subject: `Compliance Document Expiring: ${opts.docTitle}`,
      html: layout(`
        <h2 style="margin:0 0 6px;color:#fbbf24;font-size:17px;font-weight:800;">Compliance Document Expiring Soon</h2>
        <p style="color:rgba(237,228,207,0.55);margin:0 0 18px;font-size:14px;">Hi ${opts.name || "there"},<br>The following compliance document will expire soon. Please renew it to stay active.</p>
        ${infoBox("#fbbf24", typeLabel, opts.docTitle, `Expires: ${opts.expiresOn}`)}
        ${btn(`${BASE}/rep/documents`, "View My Documents", "#fbbf24", "#1a1208")}
      `),
    })
    .catch((e: unknown) => console.error("[email] compliance-expiring failed:", e));
}

// ── Compliance: Expired (to admin) ───────────────────────────────────────────
export async function sendComplianceExpiredAdminEmail(opts: {
  to: string;
  repName: string;
  docTitle: string;
  docType: string;
  expiredOn: string;
}) {
  if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM_EMAIL) return;
  const typeLabel = opts.docType.replace(/_/g, " ");
  await resend.emails
    .send({
      from: FROM,
      to: opts.to,
      subject: `Expired Compliance Doc: ${opts.repName} — ${opts.docTitle}`,
      html: layout(`
        <h2 style="margin:0 0 6px;color:#f87171;font-size:17px;font-weight:800;">Compliance Document Expired</h2>
        <p style="color:rgba(237,228,207,0.55);margin:0 0 18px;font-size:14px;">A rep's compliance document has expired and requires attention.</p>
        ${infoBox("#f87171", typeLabel, opts.docTitle, `Rep: ${opts.repName} &bull; Expired: ${opts.expiredOn}`)}
        ${btn(`${BASE}/admin/compliance`, "View Compliance Center", "#f87171", "#fff")}
      `),
    })
    .catch((e: unknown) => console.error("[email] compliance-expired-admin failed:", e));
}

// ── Contract: Expiring Soon (to admin) ───────────────────────────────────────
export async function sendContractExpiringEmail(opts: {
  to: string;
  contractTitle: string;
  hospitalName: string;
  endsOn: string;
  daysLeft: number;
}) {
  if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM_EMAIL) return;
  const urgencyColor = opts.daysLeft <= 14 ? "#f97316" : "#fbbf24";
  await resend.emails
    .send({
      from: FROM,
      to: opts.to,
      subject: `Contract Expiring in ${opts.daysLeft} Day${opts.daysLeft === 1 ? "" : "s"}: ${opts.contractTitle}`,
      html: layout(`
        <h2 style="margin:0 0 6px;color:${urgencyColor};font-size:17px;font-weight:800;">Contract Expiring Soon</h2>
        <p style="color:rgba(237,228,207,0.55);margin:0 0 18px;font-size:14px;">The following contract is approaching its end date and may need renewal.</p>
        ${infoBox(urgencyColor, `${opts.daysLeft}d LEFT`, opts.contractTitle, `Hospital: ${opts.hospitalName} &bull; Ends: ${opts.endsOn}`)}
        ${btn(`${BASE}/admin/contracts`, "View Contracts", urgencyColor, "#1a1208")}
      `),
    })
    .catch((e: unknown) => console.error("[email] contract-expiring failed:", e));
}

// ── Contract: Expired (to admin) ─────────────────────────────────────────────
export async function sendContractExpiredEmail(opts: {
  to: string;
  contractTitle: string;
  hospitalName: string;
  expiredOn: string;
}) {
  if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM_EMAIL) return;
  await resend.emails
    .send({
      from: FROM,
      to: opts.to,
      subject: `Contract Expired: ${opts.contractTitle}`,
      html: layout(`
        <h2 style="margin:0 0 6px;color:#f87171;font-size:17px;font-weight:800;">Contract Expired</h2>
        <p style="color:rgba(237,228,207,0.55);margin:0 0 18px;font-size:14px;">A contract has passed its end date and its status has been automatically set to Expired.</p>
        ${infoBox("#f87171", "EXPIRED", opts.contractTitle, `Hospital: ${opts.hospitalName} &bull; Expired: ${opts.expiredOn}`)}
        ${btn(`${BASE}/admin/contracts`, "View Contracts", "#f87171", "#fff")}
      `),
    })
    .catch((e: unknown) => console.error("[email] contract-expired failed:", e));
}

// ── Opportunity: Admitted ────────────────────────────────────────────────────
export async function sendAdmissionEmail(opts: {
  to: string;
  name: string;
  oppTitle: string;
  hospitalName: string;
}) {
  if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM_EMAIL) return;
  await resend.emails
    .send({
      from: FROM,
      to: opts.to,
      subject: `Referral Admitted: ${opts.oppTitle}`,
      html: layout(`
        <h2 style="margin:0 0 6px;color:#34d399;font-size:17px;font-weight:800;">Referral Admitted &#127881;</h2>
        <p style="color:rgba(237,228,207,0.55);margin:0 0 18px;font-size:14px;">Hi ${opts.name || "there"},<br>Great news &mdash; your referral has been officially admitted.</p>
        ${infoBox("#34d399", "ADMITTED", opts.oppTitle, opts.hospitalName)}
        ${btn(`${BASE}/rep/opportunities`, "View Opportunities", "#34d399", "#052e16")}
      `),
    })
    .catch((e: unknown) => console.error("[email] admission failed:", e));
}
