import { Router } from 'express';
import { reservationController } from '../controllers/reservation.controller';
import { authenticate } from '../middleware/auth';
import { requireMinRole, requireRestaurantAccess } from '../middleware/rbac';
import { validate } from '../middleware/validator';
import { createReservationSchema, updateReservationSchema, updateReservationStatusSchema, reservationFilterSchema, updateTotalAmountSchema, tableReportFilterSchema } from '../validators/reservation.validator';
import { UserRole } from '../types/enums';
import multer from 'multer';

const router = Router({ mergeParams: true });
const upload = multer({ storage: multer.memoryStorage() });

// All routes require authentication
router.use(authenticate);
router.use(requireRestaurantAccess);

// GET /organizations/:orgId/reservations
router.get('/',
  requireMinRole(UserRole.VIEWER),
  validate(reservationFilterSchema, 'query'),
  (req, res, next) => reservationController.list(req, res, next)
);

// GET /organizations/:orgId/reservations/calendar
router.get('/calendar',
  requireMinRole(UserRole.VIEWER),
  (req, res, next) => reservationController.getCalendarView(req, res, next)
);

// GET /organizations/:orgId/reservations/monthly-counts?year=2026&month=4
router.get('/monthly-counts',
  requireMinRole(UserRole.VIEWER),
  (req, res, next) => reservationController.getMonthlyReservationCounts(req, res, next)
);

// GET /organizations/:orgId/reservations/export
router.get('/export',
  requireMinRole(UserRole.MANAGER),
  (req, res, next) => reservationController.exportCsv(req, res, next)
);

// GET /organizations/:orgId/reservations/:id
router.get('/:id',
  requireMinRole(UserRole.VIEWER),
  (req, res, next) => reservationController.getById(req, res, next)
);

// POST /organizations/:orgId/reservations
router.post('/',
  requireMinRole(UserRole.HOST),
  validate(createReservationSchema),
  (req, res, next) => reservationController.create(req, res, next)
);

// PUT /organizations/:orgId/reservations/:id
router.put('/:id',
  requireMinRole(UserRole.HOST),
  validate(updateReservationSchema),
  (req, res, next) => reservationController.update(req, res, next)
);

// PATCH /organizations/:orgId/reservations/:id/status
router.patch('/:id/status',
  requireMinRole(UserRole.HOST),
  validate(updateReservationStatusSchema),
  (req, res, next) => reservationController.updateStatus(req, res, next)
);

// DELETE /organizations/:orgId/reservations/:id
router.delete('/:id',
  requireMinRole(UserRole.HOST),
  (req, res, next) => reservationController.cancel(req, res, next)
);

// PATCH /organizations/:orgId/reservations/:id/total — Manual total amount update
router.patch('/:id/total',
  requireMinRole(UserRole.HOST),
  validate(updateTotalAmountSchema),
  (req, res, next) => reservationController.updateTotalAmount(req, res, next)
);

// GET /organizations/:orgId/reservations/reports/table-revenue — Table revenue report
router.get('/reports/table-revenue',
  requireMinRole(UserRole.VIEWER),
  validate(tableReportFilterSchema, 'query'),
  (req, res, next) => reservationController.getTableRevenueReport(req, res, next)
);

// POST /organizations/:orgId/reservations/import — Bulk CSV import
router.post('/import',
  requireMinRole(UserRole.HOST),
  upload.single('file'),
  (req, res, next) => reservationController.importCsv(req, res, next)
);

export default router;
