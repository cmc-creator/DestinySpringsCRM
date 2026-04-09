import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import RepResourcesClient from "./RepResourcesClient";

export const dynamic = "force-dynamic";

export default async function RepResourcesPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const resources = await prisma.resource.findMany({
    where: { active: true },
    orderBy: [{ category: "asc" }, { title: "asc" }],
    select: {
      id: true,
      title: true,
      description: true,
      category: true,
      tags: true,
      fileUrl: true,
      externalUrl: true,
      mimeType: true,
      fileSizeKb: true,
    },
  });

  return <RepResourcesClient resources={resources} />;
}
