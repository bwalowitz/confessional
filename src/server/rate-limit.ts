import { env } from "@/lib/env";

export type RateLimitResult = {
  ok: boolean;
  remaining: number;
  resetAt: number;
};

type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

const checkMemoryRateLimit = (key: string, limit: number, windowMs: number): RateLimitResult => {
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    const bucket = { count: 1, resetAt: now + windowMs };
    buckets.set(key, bucket);
    return { ok: true, remaining: limit - 1, resetAt: bucket.resetAt };
  }

  if (existing.count >= limit) {
    return { ok: false, remaining: 0, resetAt: existing.resetAt };
  }

  existing.count += 1;
  return { ok: true, remaining: limit - existing.count, resetAt: existing.resetAt };
};

const checkRedisRateLimit = async (
  key: string,
  limit: number,
  windowMs: number
): Promise<RateLimitResult | null> => {
  if (!env.upstashRedisRestUrl || !env.upstashRedisRestToken) {
    return null;
  }

  const url = `${env.upstashRedisRestUrl.replace(/\/$/, "")}/pipeline`;
  const redisKey = `confessional:ratelimit:${key}`;
  const windowSeconds = Math.max(1, Math.ceil(windowMs / 1000));
  const now = Date.now();

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.upstashRedisRestToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify([
        ["INCR", redisKey],
        ["PTTL", redisKey],
        ["EXPIRE", redisKey, windowSeconds, "NX"]
      ])
    });

    if (!response.ok) {
      return null;
    }

    const pipeline = (await response.json()) as Array<{ result?: string | number }>;
    const count = Number(pipeline?.[0]?.result ?? 0);
    const ttlMsRaw = Number(pipeline?.[1]?.result ?? -1);
    const ttlMs = ttlMsRaw > 0 ? ttlMsRaw : windowMs;
    const resetAt = now + ttlMs;

    if (!Number.isFinite(count) || count <= 0) {
      return null;
    }

    if (count > limit) {
      return { ok: false, remaining: 0, resetAt };
    }

    return { ok: true, remaining: Math.max(0, limit - count), resetAt };
  } catch {
    return null;
  }
};

export const checkRateLimit = async (
  key: string,
  limit: number,
  windowMs: number
): Promise<RateLimitResult> => {
  const redisResult = await checkRedisRateLimit(key, limit, windowMs);
  if (redisResult) {
    return redisResult;
  }

  return checkMemoryRateLimit(key, limit, windowMs);
};
