import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import CommunicationsHub from "@/components/communications/CommunicationsHub";

export const dynamic = "force-dynamic";

export const metadata = { title: "Communications Hub | NyxAegis Rep" };

export default async function RepCommunicationsPage() {
  const session = await auth();
  if (!session || session.user.role !== "REP") redirect("/login");

  return <CommunicationsHub role="REP" />;
}
