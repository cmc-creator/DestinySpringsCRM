import { prisma } from "@/lib/prisma";
import OpportunitiesClient from "@/components/opportunities/OpportunitiesClient";

export const dynamic = "force-dynamic";

export default async function OpportunitiesPage() {
  const [hospitals, reps] = await Promise.all([
    prisma.hospital.findMany({ select: { id: true, hospitalName: true }, orderBy: { hospitalName: "asc" } }),
    prisma.rep.findMany({ include: { user: { select: { name: true, email: true } } }, where: { status: "ACTIVE" }, orderBy: { createdAt: "asc" } }),
  ]);
  return <OpportunitiesClient hospitals={hospitals} reps={reps} />;
}

