import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/api.types';
import { customerService } from '../services/customer.service';
import { stripeService } from '../services/stripe.service';

export class CustomerController {
  async getProfile(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'Not authenticated' });
        return;
      }
      const result = await customerService.getProfileByUserId(req.user.sub);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async updateProfile(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'Not authenticated' });
        return;
      }
      const result = await customerService.updateProfile(req.user.sub, req.body);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async getUpcoming(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'Not authenticated' });
        return;
      }
      const result = await customerService.getUpcomingReservations(req.user.sub);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async getHistory(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'Not authenticated' });
        return;
      }
      const page = parseInt(req.query.page as string || '1', 10);
      const limit = parseInt(req.query.limit as string || '10', 10);
      const result = await customerService.getReservationHistory(req.user.sub, page, limit);
      res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }

  async cancelReservation(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'Not authenticated' });
        return;
      }
      const result = await customerService.cancelOwnReservation(
        req.user.sub,
        req.params.id as string
      );
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async listForRestaurant(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string || '1', 10);
      const limit = parseInt(req.query.limit as string || '20', 10);
      const search = req.query.search as string | undefined;
      const result = await customerService.listForRestaurant(
        req.params.orgId as string,
        page,
        limit,
        search
      );
      res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }

  async upgradeVip(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'Not authenticated' });
        return;
      }

      // Idempotency check: prevent double-charging already-VIP customers
      const profile = await customerService.getProfileByUserId(req.user.sub);
      if (profile.isVip) {
        res.status(400).json({ success: false, error: 'You are already a Premium member.' });
        return;
      }

      const { organizationId, returnUrl } = req.body;
      const result = await stripeService.createCustomerVipCheckoutSession(
        req.user.sub,
        organizationId,
        returnUrl
      );
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
}

export const customerController = new CustomerController();
