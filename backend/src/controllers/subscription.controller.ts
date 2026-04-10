import { Request, Response, NextFunction } from 'express';
import { subscriptionService } from '../services/subscription.service';
import { AuthenticatedRequest } from '../types/api.types';

export class SubscriptionController {

  /**
   * POST /subscriptions/checkout
   * Body: { organizationId, plan, email, successUrl?, cancelUrl? }
   * Creates a Stripe Checkout Session and returns the URL.
   */
  async createCheckoutSession(req: Request, res: Response, next: NextFunction) {
    try {
      const { organizationId, plan, email, successUrl, cancelUrl } = req.body;

      if (!organizationId || !plan || !email) {
        return res.status(400).json({
          success: false,
          error: 'organizationId, plan, and email are required.',
        });
      }

      const origin = (req.headers.origin as string) || process.env.FRONTEND_URL || 'https://www.dinely.co.uk';
      const finalSuccessUrl = successUrl || `${origin}/subscription-success?session_id={CHECKOUT_SESSION_ID}`;
      const finalCancelUrl = cancelUrl || `${origin}/signup?plan=${plan}&cancelled=true`;

      const result = await subscriptionService.createCheckoutSession(
        organizationId,
        plan,
        email,
        finalSuccessUrl,
        finalCancelUrl
      );

      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /subscriptions/portal
   * Body: { organizationId }
   * Creates a Stripe Billing Portal session.
   */
  async createPortalSession(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { organizationId } = req.body;

      if (!organizationId) {
        return res.status(400).json({
          success: false,
          error: 'organizationId is required.',
        });
      }

      const origin = (req.headers.origin as string) || process.env.FRONTEND_URL || 'https://www.dinely.co.uk';
      const returnUrl = `${origin}/admin`;

      const result = await subscriptionService.createBillingPortalSession(organizationId, returnUrl);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /subscriptions/status/:orgId
   * Returns subscription plan and status.
   */
  async getStatus(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const orgId = req.params.orgId as string;
      const result = await subscriptionService.getSubscriptionStatus(orgId);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
}

export const subscriptionController = new SubscriptionController();
