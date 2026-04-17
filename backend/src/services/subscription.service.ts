const Stripe = require('stripe');
import { supabaseAdmin } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { setupTokenService } from './setupToken.service';
import { emailService } from './email.service';

// Initialize Stripe with the platform secret key
const stripeKey = process.env.STRIPE_SECRET_KEY || '';
const isStripeConfigured = stripeKey.startsWith('sk_');
const stripe = isStripeConfigured
  ? Stripe(stripeKey, { apiVersion: '2025-02-24.acacia' })
  : null;

// Plan → Price ID mapping (multi-currency: GBP + USD)
const PLAN_PRICES: Record<string, Record<string, string>> = {
  starter: {
    gbp: process.env.STRIPE_PRICE_STARTER_GBP || '',
    usd: process.env.STRIPE_PRICE_STARTER_USD || process.env.STRIPE_PRICE_STARTER || '',
  },
  professional: {
    gbp: process.env.STRIPE_PRICE_PROFESSIONAL_GBP || '',
    usd: process.env.STRIPE_PRICE_PROFESSIONAL_USD || process.env.STRIPE_PRICE_PROFESSIONAL || '',
  },
};

export class SubscriptionService {

  /**
   * Creates a Stripe Checkout Session for a SaaS subscription.
   * @param currency - 'gbp' or 'usd' (defaults to 'gbp')
   */
  async createCheckoutSession(
    organizationId: string,
    plan: string,
    email: string,
    successUrl: string,
    cancelUrl: string,
    currency: string = 'gbp'
  ) {
    if (!stripe || !isStripeConfigured) {
      throw new AppError('Stripe is not configured. Please add STRIPE_SECRET_KEY to your environment.', 503);
    }

    const planPrices = PLAN_PRICES[plan];
    if (!planPrices) {
      throw new AppError(`Invalid plan "${plan}". Valid plans: starter, professional.`, 400);
    }

    const currencyKey = (currency || 'gbp').toLowerCase();
    const priceId = planPrices[currencyKey] || planPrices['gbp'] || planPrices['usd'];
    if (!priceId) {
      throw new AppError(`No price configured for plan "${plan}" in currency "${currencyKey}". Please set STRIPE_PRICE_${plan.toUpperCase()}_${currencyKey.toUpperCase()} in your environment.`, 400);
    }

    // Fetch the org to get/create a Stripe customer
    const { data: org, error: orgError } = await supabaseAdmin
      .from('organizations')
      .select('id, name, stripe_customer_id')
      .eq('id', organizationId)
      .single();

    if (orgError || !org) {
      throw new AppError('Organization not found', 404);
    }

    let customerId = org.stripe_customer_id;

    // Create Stripe Customer if one doesn't exist
    if (!customerId) {
      const customer = await stripe.customers.create({
        email,
        name: org.name,
        metadata: { organizationId },
      });
      customerId = customer.id;

      // Persist the customer ID
      await supabaseAdmin
        .from('organizations')
        .update({ stripe_customer_id: customerId })
        .eq('id', organizationId);
    }

    // Create a Checkout Session in subscription mode with 14-day trial
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      subscription_data: {
        trial_period_days: 14,
        metadata: {
          organizationId,
          plan,
        },
      },
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        organizationId,
        plan,
        type: 'saas_subscription',
      },
    });

    return { url: session.url, sessionId: session.id };
  }

  /**
   * Creates a Stripe Billing Portal session so an admin can manage billing.
   */
  async createBillingPortalSession(organizationId: string, returnUrl: string) {
    if (!stripe || !isStripeConfigured) {
      throw new AppError('Stripe is not configured.', 503);
    }

    const { data: org, error } = await supabaseAdmin
      .from('organizations')
      .select('stripe_customer_id')
      .eq('id', organizationId)
      .single();

    if (error || !org || !org.stripe_customer_id) {
      throw new AppError('No active subscription found for this organization.', 404);
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: org.stripe_customer_id,
      return_url: returnUrl,
    });

    return { url: session.url };
  }

  /**
   * Gets the current subscription status for an organization.
   */
  async getSubscriptionStatus(organizationId: string) {
    const { data: org, error } = await supabaseAdmin
      .from('organizations')
      .select('subscription_plan, subscription_status, stripe_customer_id')
      .eq('id', organizationId)
      .single();

    if (error || !org) {
      throw new AppError('Organization not found', 404);
    }

    // Also fetch the detailed subscription record if exists
    const { data: sub } = await supabaseAdmin
      .from('subscriptions')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    return {
      plan: org.subscription_plan || 'free',
      status: org.subscription_status || 'none',
      subscription: sub || null,
    };
  }

  /**
   * Handles Stripe webhook events for subscription lifecycle.
   */
  async handleSubscriptionWebhook(event: any) {
    const eventType = event.type;

    switch (eventType) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        
        // Only handle SaaS subscription checkouts
        if (session.metadata?.type !== 'saas_subscription') break;

        const organizationId = session.metadata.organizationId;
        const plan = session.metadata.plan;
        const stripeCustomerId = session.customer;
        const stripeSubscriptionId = session.subscription;

        if (!organizationId || !stripeSubscriptionId) break;

        // Fetch the subscription details from Stripe
        const subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);

        // Insert subscription record
        await supabaseAdmin.from('subscriptions').upsert({
          organization_id: organizationId,
          stripe_customer_id: stripeCustomerId,
          stripe_subscription_id: stripeSubscriptionId,
          plan,
          status: subscription.status, // 'trialing' if trial is active
          current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          cancel_at_period_end: subscription.cancel_at_period_end || false,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'stripe_subscription_id',
        });

        // Update organization plan
        await supabaseAdmin
          .from('organizations')
          .update({
            subscription_plan: plan,
            subscription_status: subscription.status,
            stripe_customer_id: stripeCustomerId,
          })
          .eq('id', organizationId);

        console.log(`[Webhook] ✅ Subscription created: org=${organizationId} plan=${plan} status=${subscription.status}`);

        // Generate secure setup token and send purchase confirmation email
        try {
          const setupToken = await setupTokenService.generateSetupToken(organizationId);
          const frontendUrl = process.env.FRONTEND_URL || 'https://www.dinely.co.uk';
          const setupUrl = `${frontendUrl}/setup?token=${setupToken}`;

          // Get org details for the email
          const { data: orgData } = await supabaseAdmin
            .from('organizations')
            .select('name, email')
            .eq('id', organizationId)
            .single();

          const emailTo = session.customer_email || orgData?.email;
          if (emailTo) {
            await emailService.sendPurchaseConfirmation({
              to: emailTo,
              restaurantName: orgData?.name || 'Your Restaurant',
              plan,
              setupUrl,
            });
            console.log(`[Webhook] 📧 Purchase confirmation email sent to ${emailTo}`);
          }
        } catch (tokenErr: any) {
          console.error('[Webhook] Failed to generate setup token or send email:', tokenErr.message);
        }

        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        const orgId = subscription.metadata?.organizationId;

        if (!orgId) break;

        // Determine plan from price metadata or existing record
        let plan = subscription.metadata?.plan;
        if (!plan) {
          const { data: existingSub } = await supabaseAdmin
            .from('subscriptions')
            .select('plan')
            .eq('stripe_subscription_id', subscription.id)
            .single();
          plan = existingSub?.plan;
        }

        // Update subscription record
        await supabaseAdmin
          .from('subscriptions')
          .update({
            status: subscription.status,
            current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            cancel_at_period_end: subscription.cancel_at_period_end || false,
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_subscription_id', subscription.id);

        // Update organization
        await supabaseAdmin
          .from('organizations')
          .update({
            subscription_status: subscription.status,
            subscription_plan: subscription.status === 'canceled' ? 'free' : (plan || 'free'),
          })
          .eq('id', orgId);

        console.log(`[Webhook] 🔄 Subscription updated: org=${orgId} status=${subscription.status}`);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const orgId = subscription.metadata?.organizationId;

        if (!orgId) break;

        // Update subscription record
        await supabaseAdmin
          .from('subscriptions')
          .update({
            status: 'canceled',
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_subscription_id', subscription.id);

        // Downgrade organization to free
        await supabaseAdmin
          .from('organizations')
          .update({
            subscription_plan: 'free',
            subscription_status: 'canceled',
          })
          .eq('id', orgId);

        console.log(`[Webhook] ❌ Subscription canceled: org=${orgId}`);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        const subscriptionId = invoice.subscription;

        if (!subscriptionId) break;

        // Find the org via subscription
        const { data: sub } = await supabaseAdmin
          .from('subscriptions')
          .select('organization_id')
          .eq('stripe_subscription_id', subscriptionId)
          .single();

        if (sub) {
          await supabaseAdmin
            .from('organizations')
            .update({ subscription_status: 'past_due' })
            .eq('id', sub.organization_id);

          console.log(`[Webhook] ⚠️ Payment failed: org=${sub.organization_id}`);
        }
        break;
      }

      default:
        // Unhandled event type — no action needed
        break;
    }

    return { received: true };
  }
}

export const subscriptionService = new SubscriptionService();
