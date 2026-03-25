import { defineConfig } from "prisma/config";

const databaseUrl =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_PRISMA_URL ||
  process.env.POSTGRES_URL_NON_POOLING ||
  process.env.POSTGRES_URL ||
  process.env.DATABASE_PRIVATE_URL ||
  process.env.POSTGRES_PRIVATE_URL;

if (!databaseUrl) {
  console.warn(
    "[prisma.config.ts] WARNING: No database URL found. " +
      "Set DATABASE_URL in Vercel Environment Variables."
  );
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  ...(databaseUrl ? { datasource: { url: databaseUrl } } : {}),
});
