import { Router, Request, Response, NextFunction } from 'express';
import { organizationService } from '../services/organization.service';
import { reservationService } from '../services/reservation.service';
import { validate } from '../middleware/validator';
import { createReservationSchema } from '../validators/reservation.validator';
import { publicApiLimiter } from '../middleware/rateLimiter';
import { optionalAuth } from '../middleware/auth';
import { tableService } from '../services/table.service';
import { broadcastService } from '../services/broadcast.service';
import { supabaseAdmin } from '../config/database';
import { stripeService } from '../services/stripe.service';
import { AppError } from '../middleware/errorHandler';
import { UserRole } from '../types/enums';

const router = Router();

// Apply strict rate limiting for public unauthenticated endpoints
router.use(publicApiLimiter);
router.use(optionalAuth);

// Helper to safely extract string param from Express v5
const param = (req: Request, key: string): string => req.params[key] as string;

type BookingAudience = 'guest' | 'logged_in';

const resolveBookingAudience = (req: Request): BookingAudience => {
  return (req as any).user?.role === UserRole.CUSTOMER ? 'logged_in' : 'guest';
};

const getBookingPauseForDate = (org: any, date: string, audience: BookingAudience) => {
  const bookingPause = org?.bookingPause || {};
  const isEnabled = audience === 'logged_in'
    ? bookingPause.loggedInEnabled
    : bookingPause.guestEnabled;

  if (!isEnabled || !Array.isArray(bookingPause.dates)) return null;

  const match = bookingPause.dates.find((day: any) => {
    return day?.date === date && typeof day?.message === 'string' && day.message.trim().length > 0;
  });

  if (!match) return null;

  return {
    message: match.message.trim(),
    organization: {
      name: org.name,
      phone: org.phone || null,
      address: org.address || null,
    },
  };
};

const assertBookingNotPaused = (org: any, date: string, audience: BookingAudience) => {
  const pause = getBookingPauseForDate(org, date, audience);
  if (pause) {
    throw new AppError(pause.message, 409);
  }
};

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
        widgetBgUrl: org.widgetBgUrl || null,
        widgetHeading: org.widgetHeading || null,
        widgetCtaText: org.widgetCtaText || null,
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

    assertBookingNotPaused(
      org,
      date,
      resolveBookingAudience(req)
    );

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
    const audience = resolveBookingAudience(req);

    if (!date || !partySize) {
      res.status(400).json({
        success: false,
        error: 'date and partySize query parameters are required',
      });
      return;
    }

    const bookingPause = getBookingPauseForDate(org, date, audience);
    if (bookingPause) {
      res.json({
        success: true,
        data: {
          allSlots: [],
          availableSlots: [],
          isClosed: false,
          isBookingPaused: true,
          bookingPauseMessage: bookingPause.message,
          bookingPauseOrganization: bookingPause.organization,
        },
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
      assertBookingNotPaused(
        org,
        req.body.reservationDate,
        resolveBookingAudience(req)
      );

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

// POST /public/:slug/reservations/checkout — Create Stripe checkout for a premium table reservation
router.post('/:slug/reservations/checkout', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const org = await organizationService.getBySlug(param(req, 'slug'));

    const {
      reservationDate, startTime, partySize, tableId,
      guestFirstName, guestLastName, guestEmail, guestPhone,
      specialRequests, tableFee, successUrl, cancelUrl,
    } = req.body;

    assertBookingNotPaused(
      org,
      reservationDate,
      resolveBookingAudience(req)
    );

    if (!tableFee || tableFee <= 0) {
      res.status(400).json({ success: false, error: 'tableFee is required for premium checkout' });
      return;
    }
    if (!successUrl || !cancelUrl) {
      res.status(400).json({ success: false, error: 'successUrl and cancelUrl are required' });
      return;
    }

    // Create reservation first (standard create, no payment fields in DTO)
    const reservation = await reservationService.create(org.id, {
      reservationDate,
      startTime,
      partySize,
      tableId: tableId || null,
      guestFirstName: guestFirstName || 'Guest',
      guestLastName: guestLastName || '',
      guestEmail: guestEmail || '',
      guestPhone: guestPhone || '',
      specialRequests: specialRequests || '',
      source: 'website',
    });

    // Fetch org Stripe Connect details
    const { data: orgStripe } = await supabaseAdmin
      .from('organizations')
      .select('currency, stripe_account_id, stripe_onboarding_complete')
      .eq('id', org.id)
      .single();

    // Create Stripe Checkout session
    const { url, sessionId } = await stripeService.createPremiumReservationCheckoutSession({
      reservationId: reservation.id,
      tableFee: parseFloat(tableFee),
      currency: orgStripe?.currency || 'GBP',
      restaurantName: org.name,
      stripeAccountId: orgStripe?.stripe_account_id || null,
      stripeOnboardingComplete: orgStripe?.stripe_onboarding_complete || false,
      successUrl,
      cancelUrl,
    });

    // Mark reservation as awaiting payment and store the Stripe session ID
    await supabaseAdmin
      .from('reservations')
      .update({ payment_status: 'pending', stripe_session_id: sessionId, table_fee: tableFee })
      .eq('id', reservation.id);

    res.status(201).json({ success: true, data: { reservationId: reservation.id, url } });
  } catch (error) {
    next(error);
  }
});

// GET /public/reservations/:id — Get public reservation details
router.get('/reservations/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await reservationService.getPublicReservation(param(req, 'id'));
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

// POST /public/reservations/:id/cancel — Cancel reservation (public)
router.post('/reservations/:id/cancel', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { reason } = req.body;
    if (!reason || reason.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Cancellation reason is required'
      });
    }

    // Get reservation details to find restaurant ID
    const reservation = await reservationService.getPublicReservation(param(req, 'id'));
    
    // Cancel the reservation
    const result = await reservationService.cancelReservation(
      param(req, 'id'),
      reservation.restaurant?.id || '',
      reason.trim()
    );

    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

export default router;
