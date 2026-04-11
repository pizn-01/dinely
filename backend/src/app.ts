import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { corsOptions } from './config/cors';
import { errorHandler } from './middleware/errorHandler';

// Import routes
import authRoutes from './routes/auth.routes';
import organizationRoutes from './routes/organization.routes';
import tableRoutes from './routes/table.routes';
import reservationRoutes from './routes/reservation.routes';
import staffRoutes from './routes/staff.routes';
import apiKeyRoutes from './routes/apiKey.routes';
import dashboardRoutes from './routes/dashboard.routes';
import adminRoutes from './routes/admin.routes';
import customerRoutes from './routes/customer.routes';
import waitingListRoutes from './routes/waitingList.routes';
import publicRoutes from './routes/public.routes';
import stripeRoutes from './routes/stripe.routes';
import subscriptionRoutes from './routes/subscription.routes';
import integrationRoutes from './routes/integration.routes';
import { generalLimiter } from './middleware/rateLimiter';

const app = express();
app.set('trust proxy', 1);

// ─── Global Middleware ──────────────────────────────────

app.use(helmet());
app.use(cors(corsOptions));
// ─── Stripe Webhook (MUST be before express.json) ──────────
import { stripeController } from './controllers/stripe.controller';
import { subscriptionService } from './services/subscription.service';

app.post('/api/v1/stripe/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const sig = req.headers['stripe-signature'] as string;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_test_secret';

    const Stripe = require('stripe');
    const stripeKey = process.env.STRIPE_SECRET_KEY || '';
    const stripe = stripeKey.startsWith('sk_') ? Stripe(stripeKey, { apiVersion: '2025-02-24.acacia' }) : null;

    if (!stripe) {
      return res.status(503).json({ error: 'Stripe not configured' });
    }

    let event;
    try {
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err: any) {
      // In production, NEVER bypass signature verification
      if (process.env.NODE_ENV === 'production') {
        console.error('[Stripe Webhook] Signature verification failed:', err.message);
        return res.status(400).json({ success: false, error: `Webhook signature verification failed` });
      }
      // Dev-only fallback: parse raw JSON without verification
      if (!webhookSecret || webhookSecret === 'whsec_test_secret') {
        console.warn('[Stripe Webhook] DEV MODE: Bypassing signature verification');
        event = JSON.parse(req.body.toString());
      } else {
        console.error('[Stripe Webhook] Signature verification failed:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
      }
    }

    // Route to subscription handler for subscription-related events
    const subscriptionEvents = [
      'checkout.session.completed',
      'customer.subscription.updated',
      'customer.subscription.deleted',
      'invoice.payment_failed',
    ];

    if (subscriptionEvents.includes(event.type)) {
      // Check if it's a SaaS subscription event
      const session = event.data?.object;
      const isSaas = session?.metadata?.type === 'saas_subscription' ||
                     event.type.startsWith('customer.subscription') ||
                     event.type === 'invoice.payment_failed';

      if (isSaas) {
        await subscriptionService.handleSubscriptionWebhook(event);
      } else {
        // Delegate VIP/other checkout events to the existing handler
        await stripeController.handleWebhook(req as any, res, () => {});
        return;
      }
    }

    res.json({ received: true });
  } catch (error) {
    console.error('[Stripe Webhook Error]', error);
    res.status(400).json({ success: false, error: `Webhook processing failed` });
  }
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// ─── Health Check ───────────────────────────────────────

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// ─── API Routes ─────────────────────────────────────────

const API_PREFIX = '/api/v1';

// Apply general rate limit to all API routes
app.use(API_PREFIX, generalLimiter);

app.use(`${API_PREFIX}/auth`, authRoutes);
app.use(`${API_PREFIX}/organizations`, organizationRoutes);
app.use(`${API_PREFIX}/organizations`, stripeRoutes);
app.use(`${API_PREFIX}/organizations/:orgId/tables`, tableRoutes);
app.use(`${API_PREFIX}/organizations/:orgId/reservations`, reservationRoutes);
app.use(`${API_PREFIX}/organizations/:orgId/staff`, staffRoutes);
app.use(`${API_PREFIX}/organizations/:orgId/waiting-list`, waitingListRoutes);
app.use(`${API_PREFIX}/organizations/:orgId/customers`, customerRoutes);
app.use(`${API_PREFIX}/organizations/:orgId/api-keys`, apiKeyRoutes);
app.use(`${API_PREFIX}/organizations/:orgId/dashboard`, dashboardRoutes);
app.use(`${API_PREFIX}/customers`, customerRoutes);
app.use(`${API_PREFIX}/admin`, adminRoutes);
app.use(`${API_PREFIX}/public`, publicRoutes);
app.use(`${API_PREFIX}/subscriptions`, subscriptionRoutes);
app.use(`${API_PREFIX}/integration`, integrationRoutes);

// ─── 404 Handler ────────────────────────────────────────

app.use((_req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
  });
});

// ─── Global Error Handler ───────────────────────────────

app.use(errorHandler);

export default app;
