import type { NextAuthConfig } from "next-auth";
import { NextResponse } from "next/server";

function getRoleHome(role?: string) {
  switch (role) {
    case "ADMIN":   return "/admin/dashboard";
    case "REP":     return "/rep/dashboard";
    case "ACCOUNT": return "/account/dashboard";
    default:        return "/login";
  }
}

export const authConfig: NextAuthConfig = {
  trustHost: true,
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.role = (user as { role: string }).role as never;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.role = token.role as never;
      }
      return session;
    },
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const role = (auth?.user as { role?: string } | undefined)?.role;
      const { pathname } = nextUrl;

      const isProtected =
        pathname.startsWith("/admin") ||
        pathname.startsWith("/rep") ||
        pathname.startsWith("/account");

      if (isProtected && !isLoggedIn) return false; // → redirect to /login

      // Role-based access control
      if (isLoggedIn) {
        if (pathname.startsWith("/admin") && role !== "ADMIN") {
          return NextResponse.redirect(new URL(getRoleHome(role), nextUrl));
        }
        if (pathname.startsWith("/rep") && role !== "REP" && role !== "ADMIN") {
          return NextResponse.redirect(new URL("/unauthorized", nextUrl));
        }
        if (pathname.startsWith("/account") && role !== "ACCOUNT" && role !== "ADMIN") {
          return NextResponse.redirect(new URL("/unauthorized", nextUrl));
        }
      }

      return true;
    },
  },
  session: { strategy: "jwt", maxAge: 28800 }, // 8 hours
  providers: [],
};
