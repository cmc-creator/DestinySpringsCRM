import { prisma } from "@/lib/prisma";
import InvoicesClient from "@/components/invoices/InvoicesClient";

export default async function InvoicesPage() {
  const hospitals = await prisma.hospital.findMany({
    select: { id: true, hospitalName: true },
    orderBy: { hospitalName: "asc" },
  });
  return <InvoicesClient hospitals={hospitals} />;
}
