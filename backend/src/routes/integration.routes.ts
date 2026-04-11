import { Router } from 'express';
import { integrationController } from '../controllers/integration.controller';
import { authenticateApiKey } from '../middleware/apiKeyAuth';
import { validate } from '../middleware/validator';
import { 
  createReservationSchema, 
  updateReservationStatusSchema,
  reservationFilterSchema 
} from '../validators/reservation.validator';

const router = Router();

/**
 * ePOS Integration API Routes
 * All routes require a valid X-Api-Key header.
 */
router.use(authenticateApiKey);

// GET /api/v1/integration/reservations - List reservations for sync
router.get('/reservations', 
  validate(reservationFilterSchema),
  (req, res, next) => integrationController.getReservations(req, res, next)
);

// POST /api/v1/integration/reservations - Push a walk-in/new reservation
router.post('/reservations',
  validate(createReservationSchema),
  (req, res, next) => integrationController.createReservation(req, res, next)
);

// PATCH /api/v1/integration/reservations/:id/status - Update reservation status
router.patch('/reservations/:id/status',
  validate(updateReservationStatusSchema),
  (req, res, next) => integrationController.updateReservationStatus(req, res, next)
);

// GET /api/v1/integration/tables - List all tables for mapping
router.get('/tables',
  (req, res, next) => integrationController.getTables(req, res, next)
);

export default router;
