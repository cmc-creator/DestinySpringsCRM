import { NextRequest } from "next/server";

type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
};

type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

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

export function checkRateLimit(params: {
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
    return {
      allowed: true,
      remaining: Math.max(params.limit - 1, 0),
      retryAfterSeconds: Math.ceil(params.windowMs / 1000),
    };
  }

  current.count += 1;
  buckets.set(bucketKey, current);

  const retryAfterSeconds = Math.max(Math.ceil((current.resetAt - now) / 1000), 1);
  if (current.count > params.limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds,
    };
  }

  return {
    allowed: true,
    remaining: Math.max(params.limit - current.count, 0),
    retryAfterSeconds,
  };
}
