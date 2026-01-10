type RateLimitBucket = {
  count: number;
  resetAt: number;
};

export type RateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
  retryAfterMs: number;
};

const buckets = new Map<string, RateLimitBucket>();
let lastSweep = 0;
const SWEEP_INTERVAL_MS = 60_000;

const sweepExpired = (now: number) => {
  if (now - lastSweep < SWEEP_INTERVAL_MS) return;
  lastSweep = now;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) {
      buckets.delete(key);
    }
  }
};

export const checkRateLimit = (
  key: string,
  limit: number,
  windowMs: number
): RateLimitResult => {
  const now = Date.now();
  sweepExpired(now);

  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= now) {
    const resetAt = now + windowMs;
    buckets.set(key, { count: 1, resetAt });
    return {
      allowed: true,
      limit,
      remaining: Math.max(0, limit - 1),
      resetAt,
      retryAfterMs: windowMs,
    };
  }

  if (existing.count >= limit) {
    const retryAfterMs = Math.max(0, existing.resetAt - now);
    return {
      allowed: false,
      limit,
      remaining: 0,
      resetAt: existing.resetAt,
      retryAfterMs,
    };
  }

  existing.count += 1;
  return {
    allowed: true,
    limit,
    remaining: Math.max(0, limit - existing.count),
    resetAt: existing.resetAt,
    retryAfterMs: Math.max(0, existing.resetAt - now),
  };
};

export const buildRateLimitHeaders = (result: RateLimitResult) => ({
  "X-RateLimit-Limit": String(result.limit),
  "X-RateLimit-Remaining": String(Math.max(0, result.remaining)),
  "X-RateLimit-Reset": String(Math.ceil(result.resetAt / 1000)),
  ...(result.allowed
    ? {}
    : { "Retry-After": String(Math.ceil(result.retryAfterMs / 1000)) }),
});
