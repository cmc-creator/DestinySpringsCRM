import { prisma } from "@/lib/prisma";
import InvoicesClient from "@/components/invoices/InvoicesClient";

export const dynamic = "force-dynamic";

export default async function InvoicesPage() {
  const hospitals = await prisma.hospital.findMany({
    select: { id: true, hospitalName: true, isPriorityPartner: true, priorityDiscountPercent: true },
    orderBy: { hospitalName: "asc" },
  });
  return <InvoicesClient hospitals={hospitals} />;
}
