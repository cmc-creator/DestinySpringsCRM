import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const maxDuration = 30;

// GET /api/admin/users — list all users
export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        rep: { select: { id: true, title: true, status: true } },
        hospital: { select: { id: true, hospitalName: true, status: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ users });
  } catch (err) {
    console.error("[admin/users GET]", err);
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
  }
}

// POST /api/admin/users — create a user directly (admin only, bypasses self-registration)
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { name, email, password, role, repTitle, hospitalName, status } = await req.json();

    if (!name || !email || !password || !role) {
      return NextResponse.json({ error: "name, email, password, and role are required" }, { status: 400 });
    }

    const validRoles = ["ADMIN", "REP", "ACCOUNT"];
    if (!validRoles.includes(role)) {
      return NextResponse.json({ error: "Invalid role. Must be ADMIN, REP, or ACCOUNT." }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
    if (existing) {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    }

    const hashed = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: email.toLowerCase().trim(),
        password: hashed,
        role,
        ...(role === "REP"
          ? {
              rep: {
                create: {
                  title: repTitle ?? "Business Development Representative",
                  status: (status as "ACTIVE" | "PENDING_REVIEW") ?? "ACTIVE",
                },
              },
            }
          : role === "ACCOUNT"
          ? {
              hospital: {
                create: {
                  hospitalName: hospitalName ?? name.trim(),
                  status: "ACTIVE",
                },
              },
            }
          : {}),
      },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    });

    return NextResponse.json({ user }, { status: 201 });
  } catch (err) {
    console.error("[admin/users POST]", err);
    if (err && typeof err === "object" && "code" in err && (err as { code: string }).code === "P2002") {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    }
    return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
  }
}

// DELETE /api/admin/users?id=xxx — remove a user
export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  // Prevent deleting self
  if (id === session.user.id) {
    return NextResponse.json({ error: "Cannot delete your own account" }, { status: 400 });
  }

  try {
    await prisma.user.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[admin/users DELETE]", err);
    return NextResponse.json({ error: "Failed to delete user" }, { status: 500 });
  }
}

// PATCH /api/admin/users?id=xxx — approve a pending self-signup
export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  try {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        role: true,
        rep: { select: { id: true, status: true } },
        hospital: { select: { id: true, status: true } },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (user.role === "REP") {
      if (!user.rep) return NextResponse.json({ error: "Rep profile not found" }, { status: 404 });
      const rep = await prisma.rep.update({
        where: { id: user.rep.id },
        data: { status: "ACTIVE" },
        select: { id: true, status: true },
      });
      return NextResponse.json({ ok: true, userId: user.id, role: user.role, status: rep.status });
    }

    if (user.role === "ACCOUNT") {
      if (!user.hospital) return NextResponse.json({ error: "Account profile not found" }, { status: 404 });
      const hospital = await prisma.hospital.update({
        where: { id: user.hospital.id },
        data: { status: "ACTIVE" },
        select: { id: true, status: true },
      });
      return NextResponse.json({ ok: true, userId: user.id, role: user.role, status: hospital.status });
    }

    return NextResponse.json({ error: "Only REP and ACCOUNT users require approval" }, { status: 400 });
  } catch (err) {
    console.error("[admin/users PATCH]", err);
    return NextResponse.json({ error: "Failed to approve user" }, { status: 500 });
  }
}

// PUT /api/admin/users?id=xxx — reset user password
export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  try {
    const { password } = (await req.json()) as { password?: string };
    if (!password || password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    }

    const hashed = await bcrypt.hash(password, 10);
    await prisma.user.update({ where: { id }, data: { password: hashed } });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[admin/users PUT]", err);
    return NextResponse.json({ error: "Failed to reset password" }, { status: 500 });
  }
}
