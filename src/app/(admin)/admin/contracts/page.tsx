import { prisma } from "@/lib/prisma";
import ContractsClient from "@/components/contracts/ContractsClient";

export default async function ContractsPage() {
  const [hospitals, reps] = await Promise.all([
    prisma.hospital.findMany({
      select: { id: true, hospitalName: true, isPriorityPartner: true, priorityDiscountPercent: true },
      orderBy: { hospitalName: "asc" },
    }),
    prisma.rep.findMany({
      include: { user: { select: { name: true, email: true } } },
      where: { status: "ACTIVE" },
      orderBy: { createdAt: "asc" },
    }),
  ]);
  return <ContractsClient hospitals={hospitals} reps={reps} />;
}
