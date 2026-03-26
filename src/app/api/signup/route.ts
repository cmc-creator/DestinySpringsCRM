import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { Resend } from "resend";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, getRequestIdentity } from "@/lib/rate-limit";

export const maxDuration = 30;

const ADMIN_NOTIFY_EMAIL = "cmc@conniemichelleconsulting.com";

// Basic email format validation — prevents obviously malformed inputs
function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Minimum password length
const MIN_PASSWORD_LENGTH = 8;

export async function POST(req: NextRequest) {
  try {
    const requestIdentity = getRequestIdentity(req);
    const identityLimit = checkRateLimit({
      namespace: "signup-ip",
      key: requestIdentity,
      limit: 10,
      windowMs: 15 * 60 * 1000,
    });

    if (!identityLimit.allowed) {
      return NextResponse.json(
        { error: "Too many signup attempts. Please wait a few minutes and try again." },
        {
          status: 429,
          headers: { "Retry-After": String(identityLimit.retryAfterSeconds) },
        }
      );
    }

    const { name, email, password, role = "ACCOUNT", hospitalName, repTitle, plan = "starter" } = await req.json();

    if (!email || !password || !name) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (!isValidEmail(email)) {
      return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
    }

    const emailIdentityLimit = checkRateLimit({
      namespace: "signup-email",
      key: `${email.toLowerCase().trim()}|${requestIdentity}`,
      limit: 5,
      windowMs: 15 * 60 * 1000,
    });

    if (!emailIdentityLimit.allowed) {
      return NextResponse.json(
        { error: "Too many signup attempts for this email. Please wait before trying again." },
        {
          status: 429,
          headers: { "Retry-After": String(emailIdentityLimit.retryAfterSeconds) },
        }
      );
    }

    if (typeof password !== "string" || password.length < MIN_PASSWORD_LENGTH) {
      return NextResponse.json({ error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` }, { status: 400 });
    }

    // Enforce name length to prevent abuse
    if (typeof name !== "string" || name.trim().length < 2 || name.length > 100) {
      return NextResponse.json({ error: "Name must be between 2 and 100 characters" }, { status: 400 });
    }

    // Only ACCOUNT and REP roles can self-register — ADMIN must be created directly
    const allowedRoles = ["ACCOUNT", "REP"];
    if (!allowedRoles.includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
    if (existing) {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    }

    const hashedPw = await bcrypt.hash(password, 10);

    // Derive a unique org slug from the email prefix (lowercase alphanumeric only)
    const emailPrefix = email.split("@")[0].toLowerCase().replace(/[^a-z0-9]/g, "");
    const baseSlug = emailPrefix || "org";
    const existingSlugs = await prisma.organization.findMany({
      where: { slug: { startsWith: baseSlug } },
      select: { slug: true },
    });
    const slugSet = new Set(existingSlugs.map((o: { slug: string }) => o.slug));
    let orgSlug = baseSlug;
    let suffix = 1;
    while (slugSet.has(orgSlug)) { orgSlug = `${baseSlug}${suffix++}`; }

    const allowedPlans = ["starter", "solo_rep", "bd_team", "health_system"];
    const planParam: string = allowedPlans.includes(plan) ? plan : "starter";

    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: email.toLowerCase().trim(),
        password: hashedPw,
        role: role === "REP" ? "REP" : "ACCOUNT",
        organization: {
          create: {
            name: hospitalName?.trim() || name.trim(),
            slug: orgSlug,
            planTier: planParam,
          },
        },
        ...(role === "REP" ? {
          rep: { create: { title: repTitle ?? "Behavioral Health Liaison", status: "PENDING_REVIEW" } },
        } : {
          hospital: { create: { hospitalName: hospitalName ?? name.trim(), status: "PROSPECT" } },
        }),
      },
    });

    // Fire-and-forget notification email to admin - don't let failure block the response
    const resendKey = process.env.RESEND_API_KEY;
    if (resendKey) {
      const resend = new Resend(resendKey);
      const roleLabel = role === "REP" ? "Business Development Rep" : "Leadership / Operations (Account)";
      const titleLine = role === "REP" && repTitle
        ? `<tr><td style="padding:7px 12px;background:#f8fafc;font-weight:600;">Title</td><td style="padding:7px 12px;background:#f8fafc;">${repTitle}</td></tr>`
        : role === "ACCOUNT" && hospitalName
        ? `<tr><td style="padding:7px 12px;background:#f8fafc;font-weight:600;">Organization</td><td style="padding:7px 12px;background:#f8fafc;">${hospitalName}</td></tr>`
        : "";
      const fromEmail = process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev";
      resend.emails.send({
        from: `NyxAegis Alerts <${fromEmail}>`,
        to: ADMIN_NOTIFY_EMAIL,
        subject: `New signup: ${name.trim()} (${roleLabel})`,
        html: `
          <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px;border:1px solid #e5e7eb;border-radius:10px;">
            <h2 style="margin:0 0 16px;color:#1e293b;">New Signup</h2>
            <p style="color:#475569;margin:0 0 14px;">A new account was created and is ready for review in User Accounts.</p>
            <table style="width:100%;border-collapse:collapse;font-size:0.9rem;">
              <tr><td style="padding:7px 12px;font-weight:600;width:140px;">Name</td><td style="padding:7px 12px;">${name.trim()}</td></tr>
              <tr><td style="padding:7px 12px;background:#f8fafc;font-weight:600;">Email</td><td style="padding:7px 12px;background:#f8fafc;">${email.toLowerCase().trim()}</td></tr>
              <tr><td style="padding:7px 12px;font-weight:600;">Role</td><td style="padding:7px 12px;">${roleLabel}</td></tr>
              ${titleLine}
              <tr><td style="padding:7px 12px;background:#f8fafc;font-weight:600;">Submitted</td><td style="padding:7px 12px;background:#f8fafc;">${new Date().toLocaleString("en-US", { timeZone: "America/Phoenix", month: "long", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })} MST</td></tr>
            </table>
            <p style="margin:18px 0 0;font-size:0.8rem;color:#94a3b8;">Log into your admin portal (Admin &rarr; User Accounts) to manage this account.</p>
          </div>
        `,
      }).catch((e: unknown) => console.error("[signup] notification email failed:", e));
    }

    return NextResponse.json({ id: user.id, email: user.email, role: user.role }, { status: 201 });
  } catch (err) {
    // Always log the real error server-side (visible in Vercel logs)
    console.error("[signup] Error:", err);

    // Handle known Prisma error codes
    if (err && typeof err === "object" && "code" in err) {
      const code = (err as { code: string }).code;
      if (code === "P2002") return NextResponse.json({ error: "Email already registered" }, { status: 409 });
      if (code === "P1001") return NextResponse.json({ error: "Cannot reach the database. Please try again in a moment." }, { status: 503 });
      if (code === "P1003") return NextResponse.json({ error: "Database setup is incomplete. Please contact support." }, { status: 503 });
    }

    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("database URL") || message.includes("DATABASE_URL")) {
      return NextResponse.json({ error: "Service is not configured. Please contact support." }, { status: 503 });
    }

    // In development, expose the real message to ease debugging
    if (process.env.NODE_ENV !== "production") {
      return NextResponse.json({ error: message }, { status: 500 });
    }

    return NextResponse.json({ error: "Server error. Please try again." }, { status: 500 });
  }
}
