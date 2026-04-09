import { Router, Response, NextFunction } from 'express';
import { subscriptionController } from '../controllers/subscription.controller';
import { authenticate } from '../middleware/auth';
import { requireMinRole } from '../middleware/rbac';
import { UserRole } from '../types/enums';
import { AuthenticatedRequest } from '../types/api.types';

const router = Router();

// POST /subscriptions/checkout — Create a Stripe Checkout Session for a SaaS subscription
// Requires authentication: the admin of the organization must be logged in
router.post(
  '/checkout',
  authenticate,
  requireMinRole(UserRole.RESTAURANT_ADMIN),
  (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    // Verify the org belongs to this admin (super_admin can bypass)
    if (req.user?.role !== 'super_admin' && req.user?.restaurantId !== req.body.organizationId) {
      return res.status(403).json({ success: false, error: 'Access denied to this organization.' });
    }
    next();
  },
  (req, res, next) => subscriptionController.createCheckoutSession(req, res, next)
);

// Authenticated — billing portal for existing subscribers
router.post(
  '/portal',
  authenticate,
  (req, res, next) => subscriptionController.createPortalSession(req, res, next)
);

// Authenticated — check subscription status
router.get(
  '/status/:orgId',
  authenticate,
  (req, res, next) => subscriptionController.getStatus(req, res, next)
);

export default router;
