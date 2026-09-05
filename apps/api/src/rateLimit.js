/**
 * In-memory sliding-window rate limiter (per key, usually client IP).
 * Sufficient for a single Render instance. If you scale to multiple
 * instances, move limits to Redis or Render's edge layer.
 */

export function createRateLimiter({ windowMs, max }) {
  const hits = new Map();

  const prune = (now) => {
    if (hits.size < 5000) return;
    for (const [key, entry] of hits) {
      if (now >= entry.resetAt) hits.delete(key);
    }
  };

  return function allow(key) {
    const now = Date.now();
    prune(now);
    let entry = hits.get(key);
    if (!entry || now >= entry.resetAt) {
      entry = { count: 0, resetAt: now + windowMs };
      hits.set(key, entry);
    }
    entry.count += 1;
    return entry.count <= max;
  };
}

export function clientIp(request) {
  const forwarded = request.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim();
  }
  return request.socket?.remoteAddress ?? 'unknown';
}
