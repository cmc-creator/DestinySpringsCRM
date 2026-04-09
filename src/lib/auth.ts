import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";
import Google from "next-auth/providers/google";
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
  callbacks: {
    // Preserve session and authorized from authConfig
    ...authConfig.callbacks,

    // Override jwt to handle both credentials and OAuth sign-in
    async jwt({ token, user, account }) {
      if (account?.provider === "google" || account?.provider === "microsoft-entra-id") {
        // OAuth sign-in: resolve to CRM user by email (happens once per session)
        const email = (token.email ?? user?.email) as string | undefined;
        if (email) {
          const crmUser = await prisma.user.findFirst({
            where: { email: { equals: email, mode: "insensitive" } },
          });
          if (crmUser) {
            token.id   = crmUser.id;
            token.role = crmUser.role as never;
          }
        }
      } else if (user) {
        // Credentials sign-in
        token.id   = user.id as string;
        token.role = (user as { role: string }).role as never;
      }
      return token;
    },

    // Store integration tokens automatically on OAuth sign-in
    async signIn({ user, account }) {
      if (account?.provider === "google" || account?.provider === "microsoft-entra-id") {
        if (!user.email) return false;

        const crmUser = await prisma.user.findFirst({
          where: { email: { equals: user.email, mode: "insensitive" } },
        });
        // Block OAuth sign-in if the user doesn't exist in the CRM
        if (!crmUser) return "/login?error=OAuthNotLinked";

        const provider = account.provider === "google" ? "google" : "microsoft";
        const tokenData = {
          accessToken:  account.access_token  ?? "",
          refreshToken: account.refresh_token ?? null,
          expiresAt:    account.expires_at    ? new Date(account.expires_at * 1000) : null,
          scope:        account.scope         ?? null,
          email:        user.email            ?? null,
          displayName:  user.name             ?? null,
        };
        try {
          await prisma.integrationToken.upsert({
            where:  { userId_provider: { userId: crmUser.id, provider } },
            create: { userId: crmUser.id, provider, ...tokenData },
            update: tokenData,
          });
        } catch (err) {
          console.error("[auth] failed to upsert integration token on OAuth sign-in", err);
          // Don't block sign-in if token storage fails — they can reconnect manually
        }
        return true;
      }
      return true;
    },
  },
  providers: [
    // ── Microsoft 365 / Entra ID ────────────────────────────────────────────
    // Same credentials as MICROSOFT_CLIENT_ID / MICROSOFT_CLIENT_SECRET.
    // Users who sign in with Microsoft automatically connect Outlook + Calendar.
    ...(process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET
      ? [MicrosoftEntraID({
          clientId:     process.env.MICROSOFT_CLIENT_ID,
          clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
          authorization: {
            params: {
              scope: "openid email profile offline_access User.Read Mail.ReadWrite Mail.Send Calendars.ReadWrite",
            },
          },
        })]
      : []),

    // ── Google ──────────────────────────────────────────────────────────────
    // Same credentials as GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET.
    // Users who sign in with Google automatically connect Gmail + Calendar.
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [Google({
          clientId:     process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          authorization: {
            params: {
              scope:       "openid email profile https://www.googleapis.com/auth/gmail.modify https://www.googleapis.com/auth/calendar.events",
              access_type: "offline",
              prompt:      "consent",
            },
          },
        })]
      : []),

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
