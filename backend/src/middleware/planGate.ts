import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/api.types';
import { supabaseAdmin } from '../config/database';
import { getPlanLimits, PlanLimits } from '../config/planLimits';
import { AppError } from './errorHandler';

/**
 * planGate(feature)
 * ─────────────────
 * Express middleware factory that blocks access to a route if the
 * authenticated organization's subscription plan does not include
 * the requested feature.
 *
 * Example usage:
 *   router.get('/integration/...', authenticate, planGate('eposIntegration'), handler);
 *
 * @param feature - A key from PlanLimits that must be `true` to allow access.
 */
export function planGate(feature: keyof PlanLimits) {
  return async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      // Resolve the restaurant ID from the authenticated request
      const restaurantId = req.restaurantId || req.user?.restaurantId;

      if (!restaurantId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required.',
        });
        return;
      }

      // Fetch the current subscription plan directly from DB.
      // This ensures we always reflect the live state (not a stale JWT claim).
      const { data: org, error } = await supabaseAdmin
        .from('organizations')
        .select('subscription_plan, subscription_status')
        .eq('id', restaurantId)
        .single();

      if (error || !org) {
        res.status(403).json({
          success: false,
          error: 'Organization not found.',
        });
        return;
      }

      const plan = org.subscription_plan || 'free';
      const status = org.subscription_status || 'none';

      // During an active trial, grant access to all features regardless of plan.
      // This gives trial users the full Professional experience.
      if (status === 'trialing') {
        next();
        return;
      }

      const limits = getPlanLimits(plan);

      if (!limits[feature]) {
        res.status(403).json({
          success: false,
          error: `This feature requires a Professional plan. Your current plan (${plan}) does not include access to this feature.`,
          code: 'PLAN_LIMIT_EXCEEDED',
          requiredPlan: 'professional',
          currentPlan: plan,
        });
        return;
      }

      // Attach plan info to the request for downstream use (e.g., reservation limit checks)
      (req as any).subscriptionPlan = plan;
      (req as any).subscriptionStatus = status;

      next();
    } catch (err) {
      next(err);
    }
  };
}
