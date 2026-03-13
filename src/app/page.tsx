import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

function getRoleHome(role?: string) {
  switch (role) {
    case "ADMIN":   return "/admin/dashboard";
    case "REP":     return "/rep/dashboard";
    case "ACCOUNT": return "/account/dashboard";
    default:        return "/login";
  }
}

export default async function RootPage() {
  const session = await auth();
  redirect(getRoleHome(session?.user?.role as string | undefined));
}
