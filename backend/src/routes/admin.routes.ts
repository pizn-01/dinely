import { Router } from 'express';
import { adminController } from '../controllers/admin.controller';
import { authenticate } from '../middleware/auth';
import { requireMinRole } from '../middleware/rbac';
import { validate } from '../middleware/validator';
import { adminUpdateOrgSchema, adminToggleOrgStatusSchema } from '../validators/admin.validator';
import { UserRole } from '../types/enums';

const router = Router();

// All admin routes require super admin authentication
router.use(authenticate);
router.use(requireMinRole(UserRole.SUPER_ADMIN));

// GET /admin/organizations
router.get('/organizations',
  (req, res, next) => adminController.listOrganizations(req, res, next)
);

// GET /admin/organizations/:id
router.get('/organizations/:id',
  (req, res, next) => adminController.getOrganization(req, res, next)
);

// PUT /admin/organizations/:id — validated with strict field whitelist
router.put('/organizations/:id',
  validate(adminUpdateOrgSchema),
  (req, res, next) => adminController.updateOrganization(req, res, next)
);

// PATCH /admin/organizations/:id/status — validated to ensure boolean
router.patch('/organizations/:id/status',
  validate(adminToggleOrgStatusSchema),
  (req, res, next) => adminController.toggleOrgStatus(req, res, next)
);

// GET /admin/stats
router.get('/stats',
  (req, res, next) => adminController.getPlatformStats(req, res, next)
);

// GET /admin/users
router.get('/users',
  (req, res, next) => adminController.listUsers(req, res, next)
);

// GET /admin/settings
router.get('/settings',
  (req, res, next) => adminController.getSettings(req, res, next)
);

// PUT /admin/settings/:key
router.put('/settings/:key',
  (req, res, next) => adminController.updateSetting(req, res, next)
);

// GET /admin/audit-log
router.get('/audit-log',
  (req, res, next) => adminController.getAuditLog(req, res, next)
);

// GET /admin/organizations/:id/subscription
router.get('/organizations/:id/subscription',
  (req, res, next) => adminController.getOrganizationSubscription(req, res, next)
);

// GET /admin/support-tickets
router.get('/support-tickets',
  (req, res, next) => adminController.listSupportTickets(req, res, next)
);

// PATCH /admin/support-tickets/:id/status
router.patch('/support-tickets/:id/status',
  (req, res, next) => adminController.updateSupportTicketStatus(req, res, next)
);

// POST /admin/broadcasts
router.post('/broadcasts',
  (req, res, next) => adminController.createBroadcast(req, res, next)
);

// GET /admin/broadcasts
router.get('/broadcasts',
  (req, res, next) => adminController.listBroadcasts(req, res, next)
);

// PATCH /admin/broadcasts/:id/toggle
router.patch('/broadcasts/:id/toggle',
  (req, res, next) => adminController.toggleBroadcast(req, res, next)
);

export default router;
