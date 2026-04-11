import { Router } from 'express';
import { integrationController } from '../controllers/integration.controller';
import { authenticateApiKey } from '../middleware/apiKeyAuth';
import { validate } from '../middleware/validator';
import { rateLimit } from '../middleware/rateLimiter';
import { 
  createReservationSchema, 
  updateReservationSchema,
  updateReservationStatusSchema,
  reservationFilterSchema 
} from '../validators/reservation.validator';
import {
  createTableSchema,
  updateTableSchema,
  createAreaSchema,
  updateAreaSchema,
} from '../validators/table.validator';
import {
  createWaitingListSchema,
  updateWaitingListStatusSchema,
} from '../validators/waitingList.validator';
import {
  inviteStaffSchema,
  updateStaffSchema,
} from '../validators/staff.validator';
import {
  updateOrganizationSchema,
} from '../validators/organization.validator';

const router = Router();

/**
 * ePOS Integration API Routes
 * All routes require a valid X-Api-Key header.
 * 
 * These endpoints provide full Staff + Admin dashboard parity
 * so that an external ePOS system can fully integrate with Dinely.
 */

// ─── Authentication ─────────────────────────────────────
router.use(authenticateApiKey);

// ─── Integration-specific rate limiter ──────────────────
// 600 requests per 15 minutes, keyed by API key (restaurantId)
const integrationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  maxRequests: 600,
  keyGenerator: (req) => `integration:${(req as any).restaurantId || req.ip}`,
  message: 'Integration API rate limit exceeded. Please try again later.',
});
router.use(integrationLimiter);

// ═══════════════════════════════════════════════════════════
// DASHBOARD / ANALYTICS
// ═══════════════════════════════════════════════════════════

// GET /api/v1/integration/dashboard/stats
router.get('/dashboard/stats',
  (req, res, next) => integrationController.getDashboardStats(req, res, next)
);

// GET /api/v1/integration/dashboard/trend
router.get('/dashboard/trend',
  (req, res, next) => integrationController.getDashboardTrend(req, res, next)
);

// ═══════════════════════════════════════════════════════════
// RESERVATIONS
// ═══════════════════════════════════════════════════════════

// GET /api/v1/integration/reservations
router.get('/reservations', 
  validate(reservationFilterSchema, 'query'),
  (req, res, next) => integrationController.getReservations(req, res, next)
);

// GET /api/v1/integration/reservations/calendar
router.get('/reservations/calendar',
  (req, res, next) => integrationController.getCalendarView(req, res, next)
);

// GET /api/v1/integration/reservations/export
router.get('/reservations/export',
  (req, res, next) => integrationController.exportReservationsCsv(req, res, next)
);

// GET /api/v1/integration/reservations/available-tables
router.get('/reservations/available-tables',
  (req, res, next) => integrationController.getAvailableTables(req, res, next)
);

// GET /api/v1/integration/reservations/available-slots
router.get('/reservations/available-slots',
  (req, res, next) => integrationController.getAvailableTimeSlots(req, res, next)
);

// GET /api/v1/integration/reservations/:id
router.get('/reservations/:id',
  (req, res, next) => integrationController.getReservationById(req, res, next)
);

// POST /api/v1/integration/reservations
router.post('/reservations',
  validate(createReservationSchema),
  (req, res, next) => integrationController.createReservation(req, res, next)
);

// PUT /api/v1/integration/reservations/:id
router.put('/reservations/:id',
  validate(updateReservationSchema),
  (req, res, next) => integrationController.updateReservation(req, res, next)
);

// PATCH /api/v1/integration/reservations/:id/status
router.patch('/reservations/:id/status',
  validate(updateReservationStatusSchema),
  (req, res, next) => integrationController.updateReservationStatus(req, res, next)
);

// DELETE /api/v1/integration/reservations/:id
router.delete('/reservations/:id',
  (req, res, next) => integrationController.cancelReservation(req, res, next)
);

// ═══════════════════════════════════════════════════════════
// TABLES
// ═══════════════════════════════════════════════════════════

// GET /api/v1/integration/tables
router.get('/tables',
  (req, res, next) => integrationController.getTables(req, res, next)
);

// GET /api/v1/integration/tables/:id
router.get('/tables/:id',
  (req, res, next) => integrationController.getTableById(req, res, next)
);

// POST /api/v1/integration/tables
router.post('/tables',
  validate(createTableSchema),
  (req, res, next) => integrationController.createTable(req, res, next)
);

// PUT /api/v1/integration/tables/:id
router.put('/tables/:id',
  validate(updateTableSchema),
  (req, res, next) => integrationController.updateTable(req, res, next)
);

// DELETE /api/v1/integration/tables/:id
router.delete('/tables/:id',
  (req, res, next) => integrationController.deleteTable(req, res, next)
);

// ─── Floor Areas ────────────────────────────────────────
// GET /api/v1/integration/tables/areas
router.get('/areas',
  (req, res, next) => integrationController.listAreas(req, res, next)
);

// POST /api/v1/integration/areas
router.post('/areas',
  validate(createAreaSchema),
  (req, res, next) => integrationController.createArea(req, res, next)
);

// PUT /api/v1/integration/areas/:areaId
router.put('/areas/:areaId',
  validate(updateAreaSchema),
  (req, res, next) => integrationController.updateArea(req, res, next)
);

// DELETE /api/v1/integration/areas/:areaId
router.delete('/areas/:areaId',
  (req, res, next) => integrationController.deleteArea(req, res, next)
);

// ═══════════════════════════════════════════════════════════
// WAITING LIST
// ═══════════════════════════════════════════════════════════

// GET /api/v1/integration/waiting-list
router.get('/waiting-list',
  (req, res, next) => integrationController.getWaitingList(req, res, next)
);

// POST /api/v1/integration/waiting-list
router.post('/waiting-list',
  validate(createWaitingListSchema),
  (req, res, next) => integrationController.addToWaitingList(req, res, next)
);

// PATCH /api/v1/integration/waiting-list/:id/status
router.patch('/waiting-list/:id/status',
  validate(updateWaitingListStatusSchema),
  (req, res, next) => integrationController.updateWaitingListStatus(req, res, next)
);

// DELETE /api/v1/integration/waiting-list/:id
router.delete('/waiting-list/:id',
  (req, res, next) => integrationController.removeFromWaitingList(req, res, next)
);

// ═══════════════════════════════════════════════════════════
// STAFF MANAGEMENT
// ═══════════════════════════════════════════════════════════

// GET /api/v1/integration/staff
router.get('/staff',
  (req, res, next) => integrationController.listStaff(req, res, next)
);

// GET /api/v1/integration/staff/:id
router.get('/staff/:id',
  (req, res, next) => integrationController.getStaffById(req, res, next)
);

// POST /api/v1/integration/staff
router.post('/staff',
  validate(inviteStaffSchema),
  (req, res, next) => integrationController.inviteStaff(req, res, next)
);

// PUT /api/v1/integration/staff/:id
router.put('/staff/:id',
  validate(updateStaffSchema),
  (req, res, next) => integrationController.updateStaff(req, res, next)
);

// DELETE /api/v1/integration/staff/:id
router.delete('/staff/:id',
  (req, res, next) => integrationController.removeStaff(req, res, next)
);

// ═══════════════════════════════════════════════════════════
// CUSTOMERS
// ═══════════════════════════════════════════════════════════

// GET /api/v1/integration/customers
router.get('/customers',
  (req, res, next) => integrationController.listCustomers(req, res, next)
);

// ═══════════════════════════════════════════════════════════
// ORGANIZATION / SETTINGS
// ═══════════════════════════════════════════════════════════

// GET /api/v1/integration/settings
router.get('/settings',
  (req, res, next) => integrationController.getSettings(req, res, next)
);

// PUT /api/v1/integration/settings
router.put('/settings',
  validate(updateOrganizationSchema),
  (req, res, next) => integrationController.updateSettings(req, res, next)
);

export default router;
