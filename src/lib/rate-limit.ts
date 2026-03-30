import { NextRequest } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
};

// ── In-memory fallback (local dev / no Redis env vars) ─────────────────────
type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

function checkInMemory(params: {
  namespace: string;
  key: string;
  limit: number;
  windowMs: number;
}): RateLimitResult {
  const now = Date.now();
  const bucketKey = `${params.namespace}:${params.key}`;
  const current = buckets.get(bucketKey);

  if (!current || current.resetAt <= now) {
    buckets.set(bucketKey, { count: 1, resetAt: now + params.windowMs });
    return { allowed: true, remaining: Math.max(params.limit - 1, 0), retryAfterSeconds: Math.ceil(params.windowMs / 1000) };
  }

  current.count += 1;
  buckets.set(bucketKey, current);

  const retryAfterSeconds = Math.max(Math.ceil((current.resetAt - now) / 1000), 1);
  if (current.count > params.limit) {
    return { allowed: false, remaining: 0, retryAfterSeconds };
  }
  return { allowed: true, remaining: Math.max(params.limit - current.count, 0), retryAfterSeconds };
}

// ── Upstash / Vercel KV distributed rate limiter ───────────────────────────
// Requires env vars: UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN
// (Vercel KV automatically provides KV_REST_API_URL / KV_REST_API_TOKEN —
//  map those to the Upstash names in your Vercel project settings, or set
//  UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN directly.)

let redis: Redis | null = null;

function getRedis(): Redis | null {
  if (redis) return redis;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  redis = new Redis({ url, token });
  return redis;
}

// Cache Ratelimit instances so we don't recreate them per-request
const limiterCache = new Map<string, Ratelimit>();

function getLimiter(namespace: string, limit: number, windowMs: number): Ratelimit | null {
  const r = getRedis();
  if (!r) return null;

  const cacheKey = `${namespace}:${limit}:${windowMs}`;
  if (limiterCache.has(cacheKey)) return limiterCache.get(cacheKey)!;

  const windowSeconds = Math.ceil(windowMs / 1000);
  const limiter = new Ratelimit({
    redis: r,
    limiter: Ratelimit.slidingWindow(limit, `${windowSeconds}s`),
    prefix: `rl:${namespace}`,
  });
  limiterCache.set(cacheKey, limiter);
  return limiter;
}

// ── Public API ──────────────────────────────────────────────────────────────

function getClientIp(req: NextRequest): string {
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || "unknown";
  }
  return req.headers.get("x-real-ip") || "unknown";
}

export function getRequestIdentity(req: NextRequest): string {
  const ip = getClientIp(req);
  const userAgent = req.headers.get("user-agent") || "unknown-agent";
  return `${ip}|${userAgent.slice(0, 80)}`;
}

export async function checkRateLimit(params: {
  namespace: string;
  key: string;
  limit: number;
  windowMs: number;
}): Promise<RateLimitResult> {
  const limiter = getLimiter(params.namespace, params.limit, params.windowMs);

  if (!limiter) {
    // No Redis configured — use in-memory (local dev / fallback)
    return checkInMemory(params);
  }

  try {
    const { success, remaining, reset } = await limiter.limit(params.key);
    const retryAfterSeconds = Math.max(Math.ceil((reset - Date.now()) / 1000), 1);
    return { allowed: success, remaining, retryAfterSeconds };
  } catch {
    // If Redis is unavailable, fail open (don't block users)
    return { allowed: true, remaining: params.limit, retryAfterSeconds: 0 };
  }
}
