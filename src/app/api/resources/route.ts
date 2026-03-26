import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const maxDuration = 30;

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category");
  const search   = searchParams.get("search");

  const resources = await prisma.resource.findMany({
    where: {
      active: true,
      ...(category ? { category: category as never } : {}),
      ...(search ? {
        OR: [
          { title:       { contains: search, mode: "insensitive" } },
          { description: { contains: search, mode: "insensitive" } },
          { tags:        { has: search } },
        ],
      } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return NextResponse.json(resources);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const data = await req.json();
  const { title, description, category, tags, fileUrl, externalUrl, mimeType, fileSizeKb, thumbnail } = data;

  if (!title?.trim()) return NextResponse.json({ error: "Title is required" }, { status: 400 });

  const resource = await prisma.resource.create({
    data: {
      title:       String(title).trim(),
      description: description ? String(description).trim() : null,
      category:    category ?? "OTHER",
      tags:        Array.isArray(tags) ? tags.map(String) : [],
      fileUrl:     fileUrl     ? String(fileUrl).trim()     : null,
      externalUrl: externalUrl ? String(externalUrl).trim() : null,
      mimeType:    mimeType    ? String(mimeType).trim()    : null,
      fileSizeKb:  fileSizeKb  ? Number(fileSizeKb)         : null,
      thumbnail:   thumbnail   ? String(thumbnail).trim()   : null,
      uploadedById: session.user.id,
    },
  });

  return NextResponse.json(resource, { status: 201 });
}
