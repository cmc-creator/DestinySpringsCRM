import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { LegalDocType } from "@prisma/client";

const VALID_DOC_TYPES = new Set<string>(Object.values(LegalDocType));

const DOC_LABELS: Record<string, string> = {
  CONFLICT_OF_INTEREST: "Conflict of Interest Disclosure",
  IP_OWNERSHIP:         "IP Ownership Affidavit",
  NDA:                  "Mutual Non-Disclosure Agreement",
  MSLA:                 "Master Software License Agreement",
  BAA:                  "HIPAA Business Associate Agreement",
  SLA:                  "Service Level Agreement",
  AUP:                  "Acceptable Use Policy",
  SOLE_SOURCE:          "Sole Source Justification & Procurement Authorization",
};

// How many party signatures a doc requires before it's fully executed
const DOC_PARTY_COUNTS: Record<string, number> = {
  CONFLICT_OF_INTEREST: 1,
  IP_OWNERSHIP:         1,
  NDA:                  2,
  MSLA:                 2,
  BAA:                  2,
  SLA:                  2,
  AUP:                  1,
  SOLE_SOURCE:          1,
};

// POST /api/legal/signatures — record an e-signature
export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      docType: string;
      signerName: string;
      signerEmail: string;
      signerTitle?: string;
      signerRole: string;
    };

    const { docType, signerName, signerEmail, signerTitle, signerRole } = body;

    // Validate
    if (!docType || !VALID_DOC_TYPES.has(docType)) {
      return NextResponse.json({ error: "Invalid document type" }, { status: 400 });
    }
    if (!signerName || signerName.trim().length < 2) {
      return NextResponse.json({ error: "Full name required" }, { status: 400 });
    }
    if (!signerEmail || !signerEmail.includes("@")) {
      return NextResponse.json({ error: "Valid email required" }, { status: 400 });
    }
    if (!signerRole) {
      return NextResponse.json({ error: "Signer role required" }, { status: 400 });
    }

    // Check if already signed for this doc + role
    const existing = await prisma.legalDocSignature.findFirst({
      where: {
        docType: docType as LegalDocType,
        signerRole,
      },
    });
    if (existing) {
      return NextResponse.json({ error: "This document has already been signed for this role", existing }, { status: 409 });
    }

    // Get logged-in user if any
    const session = await auth();
    const userId = session?.user?.id ?? undefined;

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
      ?? req.headers.get("x-real-ip")
      ?? undefined;
    const userAgent = req.headers.get("user-agent") ?? undefined;

    const signature = await prisma.legalDocSignature.create({
      data: {
        docType: docType as LegalDocType,
        signerName: signerName.trim(),
        signerEmail: signerEmail.trim().toLowerCase(),
        signerTitle: signerTitle?.trim() || undefined,
        signerRole,
        ipAddress: ip,
        userAgent,
        userId,
      },
    });

    // ── Fire-and-forget emails ──────────────────────────────────────────────
    const resendKey = process.env.RESEND_API_KEY;
    if (resendKey) {
      const resend = new Resend(resendKey);
      const fromEmail = process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev";
      const docLabel  = DOC_LABELS[docType] ?? docType;
      const signedAt  = new Date(signature.signedAt).toLocaleString("en-US", {
        timeZone: "America/Phoenix", month: "long", day: "numeric", year: "numeric",
        hour: "2-digit", minute: "2-digit",
      });

      // 1. Confirmation email to the signer
      resend.emails.send({
        from:    `NyxAegis Legal <${fromEmail}>`,
        to:      signature.signerEmail,
        subject: `Signature confirmed: ${docLabel}`,
        html: `
          <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px;border:1px solid #e5e7eb;border-radius:10px;">
            <h2 style="margin:0 0 6px;color:#1e293b;">Signature Confirmed</h2>
            <p style="color:#475569;margin:0 0 20px;font-size:0.95rem;">Your electronic signature has been recorded.</p>
            <table style="width:100%;border-collapse:collapse;font-size:0.9rem;">
              <tr><td style="padding:8px 12px;font-weight:600;width:160px;">Document</td><td style="padding:8px 12px;">${docLabel}</td></tr>
              <tr><td style="padding:8px 12px;background:#f8fafc;font-weight:600;">Signed By</td><td style="padding:8px 12px;background:#f8fafc;">${signature.signerName}${signature.signerTitle ? ` · ${signature.signerTitle}` : ""}</td></tr>
              <tr><td style="padding:8px 12px;font-weight:600;">Signed At</td><td style="padding:8px 12px;">${signedAt} MST</td></tr>
            </table>
            <p style="margin:18px 0 0;font-size:0.8rem;color:#94a3b8;">
              This signature is legally binding under the E-SIGN Act (15 U.S.C. § 7001) and Arizona UETA (A.R.S. § 44-7001).
              Please retain this confirmation for your records.
            </p>
          </div>
        `,
      }).catch((e: unknown) => console.error("[legal/signatures] confirmation email failed:", e));

      // 2. If this signature completes the document, notify all co-signers
      const required = DOC_PARTY_COUNTS[docType] ?? 0;
      if (required > 1) {
        const allSigs = await prisma.legalDocSignature.findMany({
          where: { docType: docType as LegalDocType },
        });
        if (allSigs.length === required) {
          const coSigners = allSigs.filter(s => s.id !== signature.id);
          for (const co of coSigners) {
            resend.emails.send({
              from:    `NyxAegis Legal <${fromEmail}>`,
              to:      co.signerEmail,
              subject: `Fully executed: ${docLabel}`,
              html: `
                <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px;border:1px solid #e5e7eb;border-radius:10px;">
                  <h2 style="margin:0 0 6px;color:#16a34a;">Document Fully Executed ✓</h2>
                  <p style="color:#475569;margin:0 0 20px;font-size:0.95rem;">All parties have signed. The <strong>${docLabel}</strong> is now fully executed.</p>
                  <table style="width:100%;border-collapse:collapse;font-size:0.9rem;">
                    ${allSigs.map(s => `<tr><td style="padding:7px 12px;font-weight:600;">${s.signerRole}</td><td style="padding:7px 12px;">${s.signerName}${s.signerTitle ? ` · ${s.signerTitle}` : ""}</td></tr>`).join("")}
                  </table>
                  <p style="margin:18px 0 0;font-size:0.8rem;color:#94a3b8;">Please retain this notification for your records.</p>
                </div>
              `,
            }).catch((e: unknown) => console.error("[legal/signatures] fully-executed email failed:", e));
          }
          // Also notify signer just completing it
          resend.emails.send({
            from:    `NyxAegis Legal <${fromEmail}>`,
            to:      signature.signerEmail,
            subject: `Fully executed: ${docLabel}`,
            html: `
              <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px;border:1px solid #e5e7eb;border-radius:10px;">
                <h2 style="margin:0 0 6px;color:#16a34a;">Document Fully Executed ✓</h2>
                <p style="color:#475569;margin:0 0 20px;font-size:0.95rem;">All parties have signed. The <strong>${docLabel}</strong> is now fully executed.</p>
                <table style="width:100%;border-collapse:collapse;font-size:0.9rem;">
                  ${allSigs.map(s => `<tr><td style="padding:7px 12px;font-weight:600;">${s.signerRole}</td><td style="padding:7px 12px;">${s.signerName}${s.signerTitle ? ` · ${s.signerTitle}` : ""}</td></tr>`).join("")}
                </table>
                <p style="margin:18px 0 0;font-size:0.8rem;color:#94a3b8;">Please retain this notification for your records.</p>
              </div>
            `,
          }).catch((e: unknown) => console.error("[legal/signatures] fully-executed email to final signer failed:", e));
        }
      }
    }
    // ── End emails ──────────────────────────────────────────────────────────

    return NextResponse.json({ ok: true, signature });
  } catch (e) {
    console.error("[POST /api/legal/signatures]", e);
    return NextResponse.json({ error: "Failed to record signature" }, { status: 500 });
  }
}

// GET /api/legal/signatures — public: sanitized list; admin: full list
export async function GET() {
  const session = await auth();
  const isAdmin = session?.user?.role === "ADMIN";

  const signatures = await prisma.legalDocSignature.findMany({
    orderBy: { signedAt: "asc" },
  });

  if (isAdmin) {
    return NextResponse.json(signatures);
  }

  // Public view — omit email, IP, userAgent, userId
  const sanitized = signatures.map(({ id, docType, signerName, signerTitle, signerRole, signedAt }) => ({
    id, docType, signerName, signerTitle, signerRole, signedAt,
  }));

  return NextResponse.json(sanitized);
}
