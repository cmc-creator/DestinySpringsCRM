import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import RepActivitiesClient from "./RepActivitiesClient";

export const dynamic = "force-dynamic";

export default async function RepActivitiesPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const rep = await prisma.rep.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });
  if (!rep) redirect("/login");

  const hospitals = await prisma.hospital.findMany({
    select: { id: true, hospitalName: true },
    orderBy: { hospitalName: "asc" },
  });

  return <RepActivitiesClient repId={rep.id} hospitals={hospitals} />;
}
