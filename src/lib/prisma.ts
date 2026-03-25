import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

declare global {
  var __prisma: PrismaClient | undefined;
}

function getConnectionString(): string {
  // Support all common PaaS env var naming conventions:
  // Vercel Postgres, Railway, Neon, Supabase, plain DATABASE_URL
  const url =
    process.env.DATABASE_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.POSTGRES_URL_NON_POOLING ||
    process.env.POSTGRES_URL ||
    process.env.DATABASE_PRIVATE_URL ||
    process.env.POSTGRES_PRIVATE_URL;
  if (!url) throw new Error("No database URL found. Set DATABASE_URL in your environment variables.");
  return url;
}

function createPrismaClient(): PrismaClient {
  const connectionString = getConnectionString();
  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });
}

// Lazy proxy — client is only created on first actual DB call, not at import time.
// This prevents build-time failures when DATABASE_URL is not available.
export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_, prop: string | symbol) {
    if (!global.__prisma) {
      global.__prisma = createPrismaClient();
    }
    const value = Reflect.get(global.__prisma, prop);
    return typeof value === "function" ? value.bind(global.__prisma) : value;
  },
});
