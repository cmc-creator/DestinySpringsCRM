import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

// One-time seed endpoint. Protected by SEED_SECRET env var.
// Delete this file once the database is seeded.
export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (!secret || secret !== process.env.SEED_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const adminPw = await bcrypt.hash("admin123!", 10);
    const repPw   = await bcrypt.hash("rep123!", 10);
    const accPw   = await bcrypt.hash("account123!", 10);

    await prisma.user.upsert({
      where: { email: "admin@nyxaegis.com" },
      update: {},
      create: {
        email: "admin@nyxaegis.com",
        name: "NyxAegis Admin",
        password: adminPw,
        role: "ADMIN",
      },
    });

    await prisma.user.upsert({
      where: { email: "rep@nyxaegis.com" },
      update: {},
      create: {
        email: "rep@nyxaegis.com",
        name: "Jordan Rivera",
        password: repPw,
        role: "REP",
        rep: {
          create: {
            phone: "555-234-5678",
            city: "Nashville",
            state: "TN",
            title: "Senior Account Executive",
            territory: "Southeast US",
            status: "ACTIVE",
            rating: 4.8,
            hipaaTrainedAt: new Date("2024-01-15"),
            licensedStates: ["TN", "KY", "AL", "GA", "FL"],
            businessName: "Rivera BD Consulting",
            w9OnFile: true,
          },
        },
      },
    });

    await prisma.user.upsert({
      where: { email: "contact@nashvillegeneral.com" },
      update: {},
      create: {
        email: "contact@nashvillegeneral.com",
        name: "Dr. Sarah Chen",
        password: accPw,
        role: "ACCOUNT",
        hospital: {
          create: {
            hospitalName: "Nashville General Medical Center",
            systemName: "Tennessee Health Alliance",
            hospitalType: "ACUTE_CARE",
            npi: "1234567890",
            bedCount: 450,
            annualRevenue: 280000000,
            serviceLines: ["Cardiology", "Oncology", "Orthopedics", "Emergency Medicine"],
            primaryContactName: "Dr. Sarah Chen",
            primaryContactTitle: "Chief Medical Officer",
            primaryContactEmail: "contact@nashvillegeneral.com",
            primaryContactPhone: "615-555-1000",
            address: "1234 Medical Center Dr",
            city: "Nashville",
            state: "TN",
            zip: "37203",
            status: "ACTIVE",
            source: "REFERRAL",
            contractValue: 450000,
          },
        },
      },
    });

    return NextResponse.json({
      ok: true,
      message: "Database seeded. Now delete src/app/api/seed/route.ts",
      users: [
        "admin@nyxaegis.com / admin123!",
        "rep@nyxaegis.com / rep123!",
        "contact@nashvillegeneral.com / account123!",
      ],
    });
  } catch (err) {
    console.error("[seed]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
