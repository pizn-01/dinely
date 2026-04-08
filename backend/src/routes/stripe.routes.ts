import { Router } from 'express';
import { stripeController } from '../controllers/stripe.controller';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { UserRole } from '../types/enums';

const router = Router();

// Only organization admins / owners can generate connect links
router.post(
  '/:id/stripe/connect',
  authenticate,
  requireRole(UserRole.RESTAURANT_ADMIN),
  stripeController.getConnectLink.bind(stripeController)
);

router.get(
  '/:id/stripe/status',
  authenticate,
  requireRole(UserRole.RESTAURANT_ADMIN),
  stripeController.getConnectStatus.bind(stripeController)
);

export default router;
