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
        console.log("[auth] authorize called, credential keys:", Object.keys(credentials ?? {}));
        console.log("[auth] email present:", !!credentials?.email, "password present:", !!credentials?.password);

        if (!credentials?.email || !credentials?.password) {
          console.error("[auth] Missing credentials - email or password not provided");
          return null;
        }

        let user;
        try {
          user = await prisma.user.findUnique({
            where: { email: credentials.email as string },
          });
          console.log("[auth] DB lookup result:", user ? `found user ${user.email}` : "no user found");
        } catch (err) {
          console.error("[auth] DB error during credential lookup:", err);
          return null;
        }

        if (!user || !user.password) {
          console.error("[auth] User not found or has no password");
          return null;
        }

        let isValid = false;
        try {
          isValid = await bcrypt.compare(credentials.password as string, user.password);
          console.log("[auth] bcrypt result:", isValid);
        } catch (err) {
          console.error("[auth] bcrypt error:", err);
          return null;
        }

        if (!isValid) {
          console.error("[auth] Password mismatch");
          return null;
        }

        console.log("[auth] Auth success for:", user.email);
        return { id: user.id, email: user.email, name: user.name, role: user.role };
      },
    }),
  ],
});
