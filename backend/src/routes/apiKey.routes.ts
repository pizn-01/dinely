import { Router } from 'express';
import { apiKeyController } from '../controllers/apiKey.controller';
import { authenticate } from '../middleware/auth';
import { requireMinRole, requireRestaurantAccess } from '../middleware/rbac';
import { validate } from '../middleware/validator';
import { createApiKeySchema } from '../validators/apiKey.validator';
import { UserRole } from '../types/enums';
import { planGate } from '../middleware/planGate';

const router = Router({ mergeParams: true });

// All API key routes require authentication, manager+ role, and Professional plan
router.use(authenticate);
router.use(requireRestaurantAccess);
router.use(requireMinRole(UserRole.MANAGER));
router.use(planGate('eposIntegration'));

// GET /organizations/:orgId/api-keys
router.get('/',
  (req, res, next) => apiKeyController.list(req, res, next)
);

// POST /organizations/:orgId/api-keys
router.post('/',
  requireMinRole(UserRole.RESTAURANT_ADMIN), // Only admins can create
  validate(createApiKeySchema),
  (req, res, next) => apiKeyController.create(req, res, next)
);

// DELETE /organizations/:orgId/api-keys/:id
router.delete('/:id',
  requireMinRole(UserRole.RESTAURANT_ADMIN), // Only admins can revoke
  (req, res, next) => apiKeyController.revoke(req, res, next)
);

export default router;
