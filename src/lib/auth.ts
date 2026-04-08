import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { authConfig } from "@/lib/auth.config";

// Primary admin accounts — always granted ADMIN access regardless of DB role/status.
// This is a safety net so the primary admin can never be locked out.
const FORCE_ADMIN_EMAILS = new Set([
  "ccooper@destinysprings.com",
  "cmc@conniemichelleconsulting.com",
]);

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  trustHost: true,
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const normalizedEmail = String(credentials.email).toLowerCase().trim();
        const providedPassword = String(credentials.password);
        const isForcedAdmin = FORCE_ADMIN_EMAILS.has(normalizedEmail);

        let user;
        try {
          user = await prisma.user.findFirst({
            where: { email: { equals: normalizedEmail, mode: "insensitive" } },
            include: {
              rep: { select: { status: true } },
              hospital: { select: { status: true } },
            },
          });
        } catch (err) {
          console.error("[auth] DB error during credential lookup:", err);
          return null;
        }

        if (!user) {
          console.warn("[auth] credentials rejected: user not found", { email: normalizedEmail });
          return null;
        }

        // Non-forced-admins must have a password hash in the DB.
        if (!user.password && !isForcedAdmin) {
          console.warn("[auth] credentials rejected: missing password", { email: normalizedEmail });
          return null;
        }

        if (!isForcedAdmin && user.role === "REP" && user.rep?.status !== "ACTIVE") {
          console.warn("[auth] credentials rejected: REP not active", { email: normalizedEmail, repStatus: user.rep?.status ?? null });
          return null;
        }

        if (!isForcedAdmin && user.role === "ACCOUNT" && user.hospital?.status !== "ACTIVE") {
          console.warn("[auth] credentials rejected: ACCOUNT hospital not active", { email: normalizedEmail, hospitalStatus: user.hospital?.status ?? null });
          return null;
        }

        let isValid = false;
        // Try the stored bcrypt hash first (if one exists).
        if (user.password) {
          try {
            isValid = await bcrypt.compare(providedPassword, user.password);
          } catch (err) {
            console.error("[auth] bcrypt error:", err);
          }
        }

        // Forced admins can always use BOOTSTRAP_PASSWORD as a guaranteed recovery fallback,
        // even if their DB password is null, wrong, or the hash is corrupt.
        if (!isValid && isForcedAdmin) {
          const bootstrapPw = process.env.BOOTSTRAP_PASSWORD;
          if (bootstrapPw && providedPassword === bootstrapPw) {
            isValid = true;
            console.warn("[auth] forced admin signed in via BOOTSTRAP_PASSWORD fallback", { email: normalizedEmail });
          }
        }

        if (!isValid) {
          console.warn("[auth] credentials rejected: password mismatch", { email: normalizedEmail });
          return null;
        }

        try {
          if (!user.firstLoginAt) {
            await prisma.user.update({
              where: { id: user.id },
              data: { firstLoginAt: new Date() },
            });
          }
        } catch (err) {
          console.warn("[auth] failed to stamp first login", err);
        }

        try {
          await prisma.auditLog.create({
            data: {
              userId: user.id,
              userEmail: user.email,
              userName: user.name ?? undefined,
              action: "LOGIN_SUCCESS",
              resource: "User",
              resourceId: user.id,
              diff: {
                _meta: {
                  source: "AUTH_CREDENTIALS",
                },
              },
            },
          });
        } catch (err) {
          console.warn("[auth] failed to write login audit event", err);
        }

        const effectiveRole = isForcedAdmin ? "ADMIN" : user.role;
        return { id: user.id, email: user.email, name: user.name, role: effectiveRole, organizationId: user.organizationId ?? null };
      },
    }),
  ],
});
