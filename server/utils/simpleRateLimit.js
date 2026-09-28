const buckets = new Map();

const pruneExpired = (now) => {
  if (buckets.size < 500) return;
  for (const [key, entry] of buckets) {
    if (!entry || now >= entry.resetAt) buckets.delete(key);
  }
};

export const consumeRateLimit = (key, { max, windowMs }) => {
  const now = Date.now();
  pruneExpired(now);
  const entry = buckets.get(key);
  if (!entry || now >= entry.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: max - 1 };
  }
  if (entry.count >= max) {
    return { ok: false, remaining: 0, retryAfterMs: entry.resetAt - now };
  }
  entry.count += 1;
  return { ok: true, remaining: max - entry.count };
};

export const clientIp = (req) =>
  String(req.ip || req.socket?.remoteAddress || "unknown");
