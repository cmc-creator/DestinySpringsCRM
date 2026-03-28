import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type ProfileBody = {
  fullName?: string;
  title?: string;
  phone?: string;
  city?: string;
  state?: string;
  bio?: string;
  avatar?: string | null;
};

function clean(value: unknown, max = 120) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, max);
}

function cleanAvatar(value: unknown): string | null {
  if (value === null) return null;
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if ((trimmed.startsWith("https://") || trimmed.startsWith("http://")) && trimmed.length <= 500) {
    return trimmed;
  }
  if (trimmed.startsWith("data:image/") && trimmed.length <= 350000) {
    return trimmed;
  }
  return null;
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      role: true,
      name: true,
      email: true,
      image: true,
      rep: {
        select: {
          title: true,
          phone: true,
          city: true,
          state: true,
          bio: true,
        },
      },
      hospital: {
        select: {
          hospitalName: true,
          primaryContactTitle: true,
          primaryContactPhone: true,
        },
      },
    },
  });

  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const profile = {
    fullName: user.name ?? "",
    email: user.email,
    role: user.role,
    organizationName: user.hospital?.hospitalName ?? "",
    title: user.role === "REP" ? (user.rep?.title ?? "") : (user.hospital?.primaryContactTitle ?? ""),
    phone: user.role === "REP" ? (user.rep?.phone ?? "") : (user.hospital?.primaryContactPhone ?? ""),
    city: user.rep?.city ?? "",
    state: user.rep?.state ?? "",
    bio: user.rep?.bio ?? "",
    avatar: user.image ?? "",
  };

  return NextResponse.json({ profile });
}

export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as ProfileBody | null;
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const fullName = clean(body.fullName, 100);
  const title = clean(body.title, 100);
  const phone = clean(body.phone, 40);
  const city = clean(body.city, 80);
  const state = clean(body.state, 80);
  const bio = clean(body.bio, 500);
  const hasAvatarField = Object.prototype.hasOwnProperty.call(body, "avatar");
  const avatar = hasAvatarField ? cleanAvatar(body.avatar) : undefined;

  const existing = await prisma.user.findUnique({ where: { id: session.user.id }, select: { role: true, rep: { select: { id: true } }, hospital: { select: { id: true } } } });
  if (!existing) return NextResponse.json({ error: "User not found" }, { status: 404 });

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      name: fullName,
      ...(hasAvatarField ? { image: avatar } : {}),
    },
  });

  if (existing.role === "REP" && existing.rep?.id) {
    await prisma.rep.update({
      where: { id: existing.rep.id },
      data: {
        title,
        phone,
        city,
        state,
        bio,
      },
    });
  }

  if (existing.role === "ACCOUNT" && existing.hospital?.id) {
    await prisma.hospital.update({
      where: { id: existing.hospital.id },
      data: {
        primaryContactName: fullName,
        primaryContactTitle: title,
        primaryContactPhone: phone,
      },
    });
  }

  return NextResponse.json({ ok: true });
}