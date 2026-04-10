import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import CommunicationsHub from "@/components/communications/CommunicationsHub";

export const dynamic = "force-dynamic";

export const metadata = { title: "Communications Hub | NyxAegis Admin" };

export default async function AdminCommunicationsPage() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") redirect("/login");

  return <CommunicationsHub role="ADMIN" />;
}
