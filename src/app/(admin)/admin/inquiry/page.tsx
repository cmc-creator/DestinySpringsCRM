import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import AdminInquiryClient from "./AdminInquiryClient";

export const dynamic = "force-dynamic";

export default async function AdminInquiryPage() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") redirect("/login");
  return <AdminInquiryClient />;
}
