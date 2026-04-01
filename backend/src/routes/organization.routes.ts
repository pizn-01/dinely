import { Router } from 'express';
import { organizationController } from '../controllers/organization.controller';
import { authenticate } from '../middleware/auth';
import { requireMinRole, requireRestaurantAccess } from '../middleware/rbac';
import { validate } from '../middleware/validator';
import { updateOrganizationSchema, setupStepSchema } from '../validators/organization.validator';
import { UserRole } from '../types/enums';

const router = Router();

// All routes require authentication
router.use(authenticate);

// GET /organizations/:orgId
router.get('/:orgId',
  requireRestaurantAccess,
  requireMinRole(UserRole.VIEWER),
  (req, res, next) => organizationController.getById(req, res, next)
);

// PUT /organizations/:orgId
router.put('/:orgId',
  requireRestaurantAccess,
  requireMinRole(UserRole.RESTAURANT_ADMIN),
  validate(updateOrganizationSchema),
  (req, res, next) => organizationController.update(req, res, next)
);

// PATCH /organizations/:orgId/setup
router.patch('/:orgId/setup',
  requireRestaurantAccess,
  requireMinRole(UserRole.RESTAURANT_ADMIN),
  validate(setupStepSchema),
  (req, res, next) => organizationController.updateSetup(req, res, next)
);

// GET /organizations/:orgId/stats
router.get('/:orgId/stats',
  requireRestaurantAccess,
  requireMinRole(UserRole.VIEWER),
  (req, res, next) => organizationController.getStats(req, res, next)
);

import multer from 'multer';
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// POST /organizations/:orgId/logo
router.post('/:orgId/logo',
  requireRestaurantAccess,
  requireMinRole(UserRole.RESTAURANT_ADMIN),
  upload.single('logo'),
  (req, res, next) => organizationController.uploadLogo(req, res, next)
);

export default router;
