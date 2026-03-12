import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

declare global {
  var __prisma: PrismaClient | undefined;
}

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL environment variable is not set");
  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });
}

// Lazy proxy - client is only created on first actual DB call, not at import time.
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
