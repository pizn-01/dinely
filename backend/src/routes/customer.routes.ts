import { Router } from 'express';
import { customerController } from '../controllers/customer.controller';
import { authenticate } from '../middleware/auth';
import { requireMinRole, requireRestaurantAccess } from '../middleware/rbac';
import { validate } from '../middleware/validator';
import { updateCustomerProfileSchema } from '../validators/waitingList.validator';
import { UserRole } from '../types/enums';

const router = Router({ mergeParams: true });

// ─── Customer self-service routes (/api/v1/customers/me/*) ─────

router.get('/me', authenticate,
  (req, res, next) => customerController.getProfile(req, res, next)
);

router.put('/me', authenticate, validate(updateCustomerProfileSchema),
  (req, res, next) => customerController.updateProfile(req, res, next)
);

router.get('/me/reservations/upcoming', authenticate,
  (req, res, next) => customerController.getUpcoming(req, res, next)
);

router.get('/me/reservations/history', authenticate,
  (req, res, next) => customerController.getHistory(req, res, next)
);

router.post('/me/reservations/:id/cancel', authenticate,
  (req, res, next) => customerController.cancelReservation(req, res, next)
);

router.post('/me/upgrade-vip', authenticate,
  (req, res, next) => customerController.upgradeVip(req, res, next)
);

// ─── Admin-scoped routes (/api/v1/organizations/:orgId/customers) ─

router.get('/', authenticate, requireRestaurantAccess, requireMinRole(UserRole.MANAGER),
  (req, res, next) => customerController.listForRestaurant(req, res, next)
);

export default router;
