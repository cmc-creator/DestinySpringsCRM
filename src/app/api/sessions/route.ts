import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const maxDuration = 15;

function detectDevice(ua: string): "mobile" | "tablet" | "desktop" {
  if (/tablet|ipad|playbook|silk/i.test(ua)) return "tablet";
  if (/mobile|android|iphone|ipod|blackberry|opera mini|iemobile|wpdesktop/i.test(ua)) return "mobile";
  return "desktop";
}

/** POST — create a new tracking session for the authenticated user */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ua = req.headers.get("user-agent") ?? "";
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    req.headers.get("x-real-ip") ??
    undefined;

  try {
    const userSession = await prisma.userSession.create({
      data: {
        userId: session.user.id,
        ipAddress: ip,
        userAgent: ua.slice(0, 512),
        deviceType: detectDevice(ua),
      },
      select: { id: true, loginAt: true, deviceType: true },
    });
    return NextResponse.json(userSession, { status: 201 });
  } catch (err) {
    console.error("[sessions] create error:", err);
    return NextResponse.json({ error: "Failed to create session" }, { status: 500 });
  }
}
