import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { env } from '../config/env';
import { AuthenticatedRequest, JwtPayload } from '../types/api.types';
import { UserRole } from '../types/enums';
import { supabaseAdmin } from '../config/database';

// ─── Token Revocation Store ─────────────────────────────
// In-memory set for MVP. For multi-instance production deployments,
// replace with Redis or a Supabase table.
const revokedTokens = new Set<string>();

/**
 * Add a token's jti to the revocation set.
 * Called on explicit logout to invalidate the token server-side.
 */
export const revokeToken = (jti: string) => {
  revokedTokens.add(jti);
};

/**
 * Check if a token's jti has been revoked.
 */
export const isTokenRevoked = (jti: string): boolean => {
  return revokedTokens.has(jti);
};

/**
 * Middleware to authenticate requests via JWT (Bearer token).
 * Sets req.user with decoded JWT payload.
 */
export const authenticate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        error: 'Authentication required. Please provide a valid Bearer token.',
      });
      return;
    }

    const token = authHeader.split(' ')[1];

    // Verify the JWT
    const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;

    // Check if this specific token has been revoked (e.g., via logout)
    if (decoded.jti && isTokenRevoked(decoded.jti)) {
      res.status(401).json({
        success: false,
        error: 'Token has been revoked. Please log in again.',
      });
      return;
    }

    req.user = decoded;
    next();
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      res.status(401).json({
        success: false,
        error: 'Token expired. Please log in again.',
      });
      return;
    }

    res.status(401).json({
      success: false,
      error: 'Invalid authentication token.',
    });
  }
};

/**
 * Optional authentication — sets req.user if token is present, but doesn't block.
 */
export const optionalAuth = async (
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;

      // Skip revoked tokens silently in optional auth
      if (!decoded.jti || !isTokenRevoked(decoded.jti)) {
        req.user = decoded;
      }
    }
  } catch {
    // Token invalid — continue without user
  }
  next();
};

/**
 * Generate a JWT token for a user.
 *
 * Staff/admin tokens get a 365-day expiry (effectively "never expires")
 * to satisfy the requirement that staff sessions persist until explicit logout.
 * Customer tokens use the standard configured expiry (default 30d).
 *
 * Every token includes a unique `jti` (JWT ID) for server-side revocation.
 */
export const generateToken = (payload: Omit<JwtPayload, 'iat' | 'exp' | 'jti'>): string => {
  const isStaffOrAdmin = payload.role !== UserRole.CUSTOMER;
  return jwt.sign(
    { ...payload, jti: crypto.randomUUID() },
    env.JWT_SECRET,
    { expiresIn: isStaffOrAdmin ? '365d' : env.JWT_EXPIRES_IN } as jwt.SignOptions
  );
};

/**
 * Generate a refresh token (longer expiry).
 */
export const generateRefreshToken = (userId: string): string => {
  return jwt.sign({ sub: userId, type: 'refresh' }, env.JWT_SECRET, {
    expiresIn: '30d',
  } as jwt.SignOptions);
};
