import { Request, Response, NextFunction } from 'express';

/**
 * In-memory rate limiter using a sliding window approach.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Clean up expired entries periodically (every 5 minutes)
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (entry.resetAt <= now) {
      store.delete(key);
    }
  }
}, 5 * 60 * 1000);

export interface RateLimitOptions {
  windowMs: number;
  maxRequests: number;
  keyGenerator?: (req: Request) => string;
  message?: string;
}

export const rateLimit = (options: RateLimitOptions) => {
  const {
    windowMs,
    maxRequests,
    keyGenerator = (req) => req.ip || 'unknown',
    message = 'Too many requests. Please try again later.',
  } = options;

  return (req: Request, res: Response, next: NextFunction): void => {
    const key = `rl:${keyGenerator(req)}`;
    const now = Date.now();

    let entry = store.get(key);

    if (!entry || entry.resetAt <= now) {
      entry = { count: 1, resetAt: now + windowMs };
      store.set(key, entry);
    } else {
      entry.count++;
    }

    res.setHeader('X-RateLimit-Limit', maxRequests);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - entry.count));
    res.setHeader('X-RateLimit-Reset', Math.ceil(entry.resetAt / 1000));

    if (entry.count > maxRequests) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
      res.status(429).json({
        success: false,
        error: message,
        retryAfter,
      });
      return;
    }

    next();
  };
};

// ─── Prebuilt rate limiters ────────────────────────────

/** General API rate limit: 200 requests per 15 minutes */
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  maxRequests: 200,
});

/**
 * Auth rate limit (login, signup, etc.)
 * Limits users to 6 attempts per 5 minutes before locking them out.
 */
export const authLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  maxRequests: 6,
  message: 'Too many login attempts. Please try again in 5 minutes.',
});

/** Public API rate limit: 200 requests per minute per IP */
export const publicApiLimiter = rateLimit({
  windowMs: 60 * 1000,
  maxRequests: 200,
});

/** Strict limiter for sensitive operations: 5 per hour */
export const strictLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  maxRequests: 5,
  message: 'Rate limit exceeded for this operation. Please try again later.',
});
