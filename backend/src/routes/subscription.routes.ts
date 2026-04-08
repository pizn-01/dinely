import { Router } from 'express';
import { subscriptionController } from '../controllers/subscription.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// Public — called right after signup, no auth token needed yet in some flows
// The checkout endpoint authenticates via the organizationId + email combo
router.post(
  '/checkout',
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
