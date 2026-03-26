import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import AdminResourcesClient from "./AdminResourcesClient";

export const dynamic = "force-dynamic";

export default async function AdminResourcesPage() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") redirect("/login");
  return <AdminResourcesClient />;
}
