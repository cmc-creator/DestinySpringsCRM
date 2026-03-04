import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is not set");
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Seeding NyxAegis Hospital CRM...");

  const adminPw = await bcrypt.hash("admin123!", 10);
  const repPw   = await bcrypt.hash("rep123!", 10);
  const accPw   = await bcrypt.hash("account123!", 10);

  // Admin
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

  // BD Rep
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

  // Hospital account user
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

  console.log("✅ Seed complete. Test accounts:");
  console.log("  ADMIN:   admin@nyxaegis.com / admin123!");
  console.log("  REP:     rep@nyxaegis.com / rep123!");
  console.log("  ACCOUNT: contact@nashvillegeneral.com / account123!");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
