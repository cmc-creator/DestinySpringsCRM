import { prisma } from "@/lib/prisma";
import LeadsClient from "@/components/leads/LeadsClient";

export const dynamic = "force-dynamic";

export default async function LeadsPage() {
  const reps = await prisma.rep.findMany({
    include: { user: { select: { name: true, email: true } } },
    where: { status: "ACTIVE" },
    orderBy: { createdAt: "asc" },
  });
  return <LeadsClient reps={reps} />;
}

