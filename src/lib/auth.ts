import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { authConfig } from "@/lib/auth.config";

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

        if (!user || !user.password) {
          console.warn("[auth] credentials rejected: user not found or missing password", { email: normalizedEmail });
          return null;
        }

        if (user.role === "REP" && user.rep?.status !== "ACTIVE") {
          console.warn("[auth] credentials rejected: REP not active", { email: normalizedEmail, repStatus: user.rep?.status ?? null });
          return null;
        }

        if (user.role === "ACCOUNT" && user.hospital?.status !== "ACTIVE") {
          console.warn("[auth] credentials rejected: ACCOUNT hospital not active", { email: normalizedEmail, hospitalStatus: user.hospital?.status ?? null });
          return null;
        }

        let isValid = false;
        try {
          isValid = await bcrypt.compare(providedPassword, user.password);
        } catch (err) {
          console.error("[auth] bcrypt error:", err);
          return null;
        }

        if (!isValid) {
          console.warn("[auth] credentials rejected: password mismatch", { email: normalizedEmail });
          return null;
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

        return { id: user.id, email: user.email, name: user.name, role: user.role, organizationId: user.organizationId ?? null };
      },
    }),
  ],
});
