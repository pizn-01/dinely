import { Router, Response, NextFunction } from 'express';
import { stripeController } from '../controllers/stripe.controller';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { UserRole } from '../types/enums';
import { AuthenticatedRequest } from '../types/api.types';

const router = Router();

/**
 * Manual tenant ownership check.
 * These routes use `:id` instead of `:orgId`, so requireRestaurantAccess
 * won't match. We enforce ownership here instead.
 */
const requireOrgOwnership = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  // Super admins can access any organization
  if (req.user?.role === 'super_admin') return next();
  if (req.user?.restaurantId !== (req.params.id as string)) {
    return res.status(403).json({ success: false, error: 'Access denied to this organization.' });
  }
  next();
};

// Only organization admins / owners can generate connect links
router.post(
  '/:id/stripe/connect',
  authenticate,
  requireRole(UserRole.RESTAURANT_ADMIN),
  requireOrgOwnership,
  stripeController.getConnectLink.bind(stripeController)
);

router.get(
  '/:id/stripe/status',
  authenticate,
  requireRole(UserRole.RESTAURANT_ADMIN),
  requireOrgOwnership,
  stripeController.getConnectStatus.bind(stripeController)
);

export default router;
