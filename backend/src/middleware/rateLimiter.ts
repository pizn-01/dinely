import { Request, Response, NextFunction } from 'express';

/**
 * In-memory rate limiter using a sliding window approach.
 * For production, replace with Redis-backed rate limiting.
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
  windowMs: number;       // Time window in ms
  maxRequests: number;    // Max requests per window
  keyGenerator?: (req: Request) => string;
  message?: string;
}

/**
 * Creates a rate limiting middleware.
 */
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
      // New window
      entry = { count: 1, resetAt: now + windowMs };
      store.set(key, entry);
    } else {
      entry.count++;
    }

    // Set rate limit headers
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

/** General API rate limit: 100 requests per 15 minutes */
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  maxRequests: 100,
});

/**
 * Login rate limit: 10 attempts per 2 minutes per IP.
 * This covers /login, /staff-login, /customer-login.
 * Users get 10 tries, then wait ~2 minutes before trying again.
 */
export const loginLimiter = rateLimit({
  windowMs: 2 * 60 * 1000,   // 2-minute window
  maxRequests: 10,            // 10 attempts
  message: 'Too many login attempts. Please try again in a couple of minutes.',
});

/**
 * Auth rate limit for non-login routes (signup, forgot password, etc.)
 * More generous: 20 requests per 15 minutes.
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  maxRequests: 20,
  message: 'Too many requests. Please try again later.',
});

/** Public API rate limit: 120 requests per minute per IP */
export const publicApiLimiter = rateLimit({
  windowMs: 60 * 1000,
  maxRequests: 120,
});

/** Strict limiter for sensitive operations: 5 per hour */
export const strictLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  maxRequests: 5,
  message: 'Rate limit exceeded for this operation. Please try again later.',
});
