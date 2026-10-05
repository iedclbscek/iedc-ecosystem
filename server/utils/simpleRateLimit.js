const MAX_KEYS = 1000;
const buckets = new Map();

const pruneExpired = (now) => {
  for (const [key, entry] of buckets) {
    if (!entry || now >= entry.resetAt) buckets.delete(key);
  }
};

export const consumeRateLimit = (key, { max, windowMs }) => {
  const now = Date.now();
  pruneExpired(now);

  const entry = buckets.get(key);
  if (entry && now < entry.resetAt) {
    if (entry.count >= max) {
      return { ok: false, remaining: 0, retryAfterMs: entry.resetAt - now };
    }
    entry.count += 1;
    return { ok: true, remaining: max - entry.count };
  }

  if (buckets.size >= MAX_KEYS) {
    // ponytail: evict oldest at 1000 process-local keys; use a shared store for cross-worker limits.
    buckets.delete(buckets.keys().next().value);
  }

  buckets.set(key, { count: 1, resetAt: now + windowMs });
  return { ok: true, remaining: max - 1 };
};

export const clientIp = (req) =>
  String(req.ip || req.socket?.remoteAddress || "unknown");
