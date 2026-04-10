import { prisma } from "@/lib/prisma";
import HospitalsClient from "@/components/hospitals/HospitalsClient";

export const dynamic = "force-dynamic";

export default async function HospitalsPage() {
  const hospitals = await prisma.hospital.findMany({
    include: { user: { select: { name: true, email: true } }, _count: { select: { opportunities: true, contacts: true } } },
    orderBy: { createdAt: "desc" },
  });

  return <HospitalsClient initialHospitals={JSON.parse(JSON.stringify(hospitals))} />;
}
