/**
 * One-time script: reset passwords for ccooper and svalentine to Rep1234!
 * mpalacios password is left untouched.
 *
 * Run: $env:DATABASE_URL="<url>"; npx tsx scripts/reset-user-passwords.ts
 */
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is not set");

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter } as ConstructorParameters<typeof PrismaClient>[0]);

const TARGET_PASSWORD = "Rep1234!";
const RESET_EMAILS = [
  "ccooper@destinysprings.com",
  "svalentine@destinysprings.com",
];
const CHECK_EMAIL = "mpalacios@destinysprings.com";

async function main() {
  const hashed = await bcrypt.hash(TARGET_PASSWORD, 10);

  for (const email of RESET_EMAILS) {
    const result = await prisma.user.updateMany({
      where: { email },
      data: { password: hashed },
    });
    if (result.count === 0) {
      console.warn(`[WARN] No user found for ${email}`);
    } else {
      console.log(`[OK]  Password set for ${email}`);
    }
  }

  // Check mpalacios – log only, do NOT change
  const mpalaciosUser = await prisma.user.findUnique({
    where: { email: CHECK_EMAIL },
    select: { email: true, password: true },
  });

  if (!mpalaciosUser) {
    console.warn(`[WARN] ${CHECK_EMAIL} not found in database`);
  } else if (!mpalaciosUser.password) {
    console.log(`[INFO] ${CHECK_EMAIL} has no password set (OAuth only)`);
  } else {
    const stillDefault = await bcrypt.compare(TARGET_PASSWORD, mpalaciosUser.password);
    if (stillDefault) {
      console.log(`[INFO] ${CHECK_EMAIL} is still using the default password – left unchanged`);
    } else {
      console.log(`[INFO] ${CHECK_EMAIL} has changed her password – left unchanged`);
    }
  }

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
