import { Router, Request, Response, NextFunction } from 'express';
import { organizationService } from '../services/organization.service';
import { reservationService } from '../services/reservation.service';
import { validate } from '../middleware/validator';
import { createReservationSchema } from '../validators/reservation.validator';
import { publicApiLimiter } from '../middleware/rateLimiter';
import { tableService } from '../services/table.service';
import { broadcastService } from '../services/broadcast.service';
import { supabaseAdmin } from '../config/database';

const router = Router();

// Apply strict rate limiting for public unauthenticated endpoints
router.use(publicApiLimiter);

// Helper to safely extract string param from Express v5
const param = (req: Request, key: string): string => req.params[key] as string;

/**
 * Public endpoints for restaurant website widgets and POS.
 * Authenticated via restaurant slug (public info only).
 */

// GET /public/broadcasts/active — Global system banners
router.get('/broadcasts/active', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const broadcasts = await broadcastService.getActiveBroadcasts();
    res.json({ success: true, data: broadcasts });
  } catch (error) {
    next(error);
  }
});

// GET /public/:slug/info — Get restaurant public info
router.get('/:slug/info', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const org = await organizationService.getBySlug(param(req, 'slug'));

    // Return only public-safe fields
    res.json({
      success: true,
      data: {
        id: org.id,
        name: org.name,
        slug: org.slug,
        address: org.address,
        phone: org.phone,
        openingTime: org.openingTime,
        closingTime: org.closingTime,
        maxPartySize: org.maxPartySize,
        allowWalkIns: org.allowWalkIns,
        logoUrl: org.logoUrl || null,
        cancellationPolicy: org.cancellationPolicy || null,
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /public/:slug/availability — Check table availability
router.get('/:slug/availability', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const org = await organizationService.getBySlug(param(req, 'slug'));
    const date = req.query.date as string;
    const time = req.query.time as string;
    const partySize = req.query.partySize as string;

    if (!date || !time || !partySize) {
      res.status(400).json({
        success: false,
        error: 'date, time, and partySize query parameters are required',
      });
      return;
    }

    const available = await reservationService.getAvailableTables(
      org.id,
      date,
      time,
      parseInt(partySize, 10)
    );

    res.json({ success: true, data: available });
  } catch (error) {
    next(error);
  }
});

// GET /public/:slug/slots — Get all available and locked slots for a given day
router.get('/:slug/slots', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const org = await organizationService.getBySlug(param(req, 'slug'));
    const date = req.query.date as string;
    const partySize = req.query.partySize as string;

    if (!date || !partySize) {
      res.status(400).json({
        success: false,
        error: 'date and partySize query parameters are required',
      });
      return;
    }

    const slotData = await reservationService.getAvailableTimeSlots(
      org.id,
      date,
      parseInt(partySize, 10)
    );

    res.json({ success: true, data: slotData });
  } catch (error) {
    next(error);
  }
});

// GET /public/:slug/tables — Get all active tables for an organization
router.get('/:slug/tables', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const org = await organizationService.getBySlug(param(req, 'slug'));
    const tables = await tableService.listPublicTables(org.id);
    res.json({ success: true, data: tables });
  } catch (error) {
    next(error);
  }
});

// POST /public/:slug/reserve — Make a reservation (guest)
router.post('/:slug/reserve',
  validate(createReservationSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const org = await organizationService.getBySlug(param(req, 'slug'));

      const result = await reservationService.create(org.id, {
        ...req.body,
        source: 'website',
      });

      // Broadcast to dashboards for real-time sync
      supabaseAdmin.channel(`restaurant_${org.id}`).send({
        type: 'broadcast',
        event: 'RESERVATION_CREATED',
        payload: result
      });

      res.status(201).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
