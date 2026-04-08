import { Request, Response, NextFunction } from 'express';
import { stripeService } from '../services/stripe.service';
import { AuthenticatedRequest } from '../types/api.types';

export class StripeController {

  /**
   * Creates or retrieves an AccountLink for Stripe onboarding.
   */
  async getConnectLink(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const origin = req.headers.origin as string || '';
      const result = await stripeService.createConnectAccountLink(id, origin);

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Retrieves the current Stripe onboarding status.
   */
  async getConnectStatus(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const result = await stripeService.checkAccountStatus(id);

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Handles Stripe Webhooks.
   */
  async handleWebhook(req: Request, res: Response, next: NextFunction) {
    try {
      const sig = req.headers['stripe-signature'] as string;
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_test_secret';
      
      const result = await stripeService.handleWebhookEvent(req.body, sig, webhookSecret);
      res.json(result);
    } catch (error) {
      console.error('[Stripe Webhook Error]', error);
      res.status(400).send(`Webhook Error: ${(error as Error).message}`);
    }
  }
}

export const stripeController = new StripeController();
