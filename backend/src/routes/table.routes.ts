import { Router } from 'express';
import { tableController } from '../controllers/table.controller';
import { authenticate } from '../middleware/auth';
import { requireMinRole, requireRestaurantAccess } from '../middleware/rbac';
import { validate } from '../middleware/validator';
import { createTableSchema, updateTableSchema, createAreaSchema, updateAreaSchema, bulkUpdatePositionsSchema, mergeTablesSchema } from '../validators/table.validator';
import { UserRole } from '../types/enums';
import multer from 'multer';

const router = Router({ mergeParams: true }); // mergeParams to access :orgId from parent
const upload = multer({ storage: multer.memoryStorage() });

// All routes require authentication
router.use(authenticate);
router.use(requireRestaurantAccess);

// ─── Areas ──────────────────────────────────────────────

router.get('/areas',
  requireMinRole(UserRole.VIEWER),
  (req, res, next) => tableController.listAreas(req, res, next)
);

router.post('/areas',
  requireMinRole(UserRole.MANAGER),
  validate(createAreaSchema),
  (req, res, next) => tableController.createArea(req, res, next)
);

router.put('/areas/:areaId',
  requireMinRole(UserRole.MANAGER),
  validate(updateAreaSchema),
  (req, res, next) => tableController.updateArea(req, res, next)
);

router.delete('/areas/:areaId',
  requireMinRole(UserRole.RESTAURANT_ADMIN),
  (req, res, next) => tableController.deleteArea(req, res, next)
);

// ─── Tables ─────────────────────────────────────────────

router.get('/',
  requireMinRole(UserRole.VIEWER),
  (req, res, next) => tableController.listTables(req, res, next)
);

router.get('/availability',
  requireMinRole(UserRole.VIEWER),
  (req, res, next) => tableController.checkAvailability(req, res, next)
);

router.get('/:id',
  requireMinRole(UserRole.VIEWER),
  (req, res, next) => tableController.getTable(req, res, next)
);

router.post('/',
  requireMinRole(UserRole.MANAGER),
  validate(createTableSchema),
  (req, res, next) => tableController.createTable(req, res, next)
);

router.post('/import',
  requireMinRole(UserRole.RESTAURANT_ADMIN),
  upload.single('file'),
  (req, res, next) => tableController.importTables(req, res, next)
);

router.put('/positions',
  requireMinRole(UserRole.MANAGER),
  validate(bulkUpdatePositionsSchema),
  (req, res, next) => tableController.bulkUpdatePositions(req, res, next)
);

router.post('/merge',
  requireMinRole(UserRole.MANAGER),
  validate(mergeTablesSchema),
  (req, res, next) => tableController.mergeTables(req, res, next)
);

router.post('/:id/unmerge',
  requireMinRole(UserRole.MANAGER),
  (req, res, next) => tableController.unmergeTable(req, res, next)
);

router.put('/:id',
  requireMinRole(UserRole.MANAGER),
  validate(updateTableSchema),
  (req, res, next) => tableController.updateTable(req, res, next)
);

router.delete('/:id',
  requireMinRole(UserRole.RESTAURANT_ADMIN),
  (req, res, next) => tableController.deleteTable(req, res, next)
);

export default router;
