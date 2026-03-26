import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const data = await req.json();
  const { title, description, category, tags, fileUrl, externalUrl, mimeType, fileSizeKb, thumbnail, active } = data;

  const resource = await prisma.resource.update({
    where: { id: params.id },
    data: {
      ...(title       !== undefined ? { title:       String(title).trim() }       : {}),
      ...(description !== undefined ? { description: description ? String(description).trim() : null } : {}),
      ...(category    !== undefined ? { category }                                : {}),
      ...(tags        !== undefined ? { tags: Array.isArray(tags) ? tags.map(String) : [] } : {}),
      ...(fileUrl     !== undefined ? { fileUrl:     fileUrl     ? String(fileUrl).trim()     : null } : {}),
      ...(externalUrl !== undefined ? { externalUrl: externalUrl ? String(externalUrl).trim() : null } : {}),
      ...(mimeType    !== undefined ? { mimeType:    mimeType    ? String(mimeType)            : null } : {}),
      ...(fileSizeKb  !== undefined ? { fileSizeKb:  fileSizeKb  ? Number(fileSizeKb)          : null } : {}),
      ...(thumbnail   !== undefined ? { thumbnail:   thumbnail   ? String(thumbnail)           : null } : {}),
      ...(active      !== undefined ? { active:      Boolean(active) }            : {}),
    },
  });

  return NextResponse.json(resource);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await prisma.resource.update({ where: { id: params.id }, data: { active: false } });
  return NextResponse.json({ ok: true });
}
