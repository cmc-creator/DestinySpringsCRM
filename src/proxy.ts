import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";

// Lightweight NextAuth instance for Edge middleware.
// Uses auth.config.ts (no prisma/Node imports) so it's Edge-compatible.
// Session tokens are decrypted with AUTH_SECRET - same secret the full auth.ts uses.
export const { auth: proxy } = NextAuth(authConfig);
