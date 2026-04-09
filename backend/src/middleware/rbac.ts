import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/api.types';
import { UserRole, StaffRole } from '../types/enums';
import { supabaseAdmin } from '../config/database';

// Simple in-memory cache for org active status (60-second TTL)
const orgActiveCache = new Map<string, { isActive: boolean; cachedAt: number }>();
const ORG_CACHE_TTL_MS = 60_000;

const isOrgActive = async (orgId: string): Promise<boolean> => {
  const cached = orgActiveCache.get(orgId);
  if (cached && Date.now() - cached.cachedAt < ORG_CACHE_TTL_MS) {
    return cached.isActive;
  }
  const { data } = await supabaseAdmin
    .from('organizations')
    .select('is_active')
    .eq('id', orgId)
    .single();
  const isActive = data?.is_active ?? true;
  orgActiveCache.set(orgId, { isActive, cachedAt: Date.now() });
  return isActive;
};

/**
 * Role hierarchy: super_admin > admin > manager > host > viewer > customer
 */
const roleHierarchy: Record<string, number> = {
  [UserRole.SUPER_ADMIN]: 100,
  [UserRole.RESTAURANT_ADMIN]: 80,
  [UserRole.MANAGER]: 60,
  [UserRole.HOST]: 40,
  [UserRole.VIEWER]: 20,
  [UserRole.CUSTOMER]: 10,
};

/**
 * Middleware factory: require minimum role level.
 * Usage: requireRole(UserRole.MANAGER) — allows manager, admin, super_admin
 */
export const requireRole = (...allowedRoles: UserRole[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Authentication required.',
      });
      return;
    }

    const userRole = req.user.role;

    // Super admin always has access
    if (userRole === UserRole.SUPER_ADMIN) {
      next();
      return;
    }

    if (allowedRoles.includes(userRole)) {
      next();
      return;
    }

    res.status(403).json({
      success: false,
      error: 'Insufficient permissions. Required role: ' + allowedRoles.join(' or '),
    });
  };
};

/**
 * Middleware: require minimum role level (hierarchical).
 * Usage: requireMinRole(UserRole.HOST) — allows host, manager, admin, super_admin
 */
export const requireMinRole = (minRole: UserRole) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Authentication required.',
      });
      return;
    }

    const userRoleLevel = roleHierarchy[req.user.role] || 0;
    const requiredLevel = roleHierarchy[minRole] || 0;

    if (userRoleLevel >= requiredLevel) {
      next();
      return;
    }

    res.status(403).json({
      success: false,
      error: `Insufficient permissions. Minimum role required: ${minRole}`,
    });
  };
};

/**
 * Middleware: ensure user belongs to the restaurant they're trying to access.
 * Reads :orgId from route params and checks against user's restaurantId.
 * Also verifies the organization is currently active.
 */
export const requireRestaurantAccess = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: 'Authentication required.',
    });
    return;
  }

  const orgId = req.params.orgId as string;

  // Super admin can access any restaurant
  if (req.user.role === UserRole.SUPER_ADMIN) {
    req.restaurantId = orgId;
    next();
    return;
  }

  if (!orgId) {
    res.status(400).json({
      success: false,
      error: 'Organization ID is required.',
    });
    return;
  }

  if (req.user.restaurantId !== orgId) {
    res.status(403).json({
      success: false,
      error: 'You do not have access to this restaurant.',
    });
    return;
  }

  // Verify the organization is still active (cached, 60s TTL)
  const active = await isOrgActive(orgId);
  if (!active) {
    res.status(403).json({
      success: false,
      error: 'This restaurant has been deactivated. Please contact support.',
    });
    return;
  }

  req.restaurantId = orgId;
  next();
};

