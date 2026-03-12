import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const { name, email, password, role = "ACCOUNT", hospitalName, repTitle } = await req.json();

    if (!email || !password || !name) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    }

    const hashedPw = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPw,
        role: role === "REP" ? "REP" : "ACCOUNT",
        ...(role === "REP" ? {
          rep: { create: { title: repTitle ?? "Account Executive", status: "PENDING_REVIEW" } },
        } : {
          hospital: { create: { hospitalName: hospitalName ?? name, status: "PROSPECT" } },
        }),
      },
    });

    return NextResponse.json({ id: user.id, email: user.email, role: user.role }, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
