const Stripe = require('stripe');
import { supabaseAdmin } from '../config/database';
import { AppError } from '../middleware/errorHandler';

// Initialize Stripe with the global platform secret key
const stripeKey = process.env.STRIPE_SECRET_KEY || '';
const isStripeConfigured = stripeKey.startsWith('sk_');
const stripe = isStripeConfigured
  ? Stripe(stripeKey, { apiVersion: '2025-02-24.acacia' })
  : null;

export class StripeService {
  /**
   * Generates a Stripe Connect AccountLink for standard onboarding.
   * If the organization doesn't have an account yet, creates one first.
   */
  async createConnectAccountLink(organizationId: string, frontendUrlOrOrigin: string) {
    if (!stripe || !isStripeConfigured) {
      throw new AppError('Stripe is not configured. Please add STRIPE_SECRET_KEY to your environment.', 503);
    }

    // Check if the organization already has a stripe_account_id
    const { data: org, error } = await supabaseAdmin
      .from('organizations')
      .select('stripe_account_id, stripe_onboarding_complete, slug')
      .eq('id', organizationId)
      .single();

    if (error || !org) {
      throw new AppError('Organization not found', 404);
    }

    let accountId = org.stripe_account_id;

    // If no Stripe account exists for this org, create a new one
    if (!accountId) {
      const account = await stripe.accounts.create({
        type: 'standard',
      });

      accountId = account.id;

      // Save it to Supabase
      const { error: updateError } = await supabaseAdmin
        .from('organizations')
        .update({ stripe_account_id: accountId })
        .eq('id', organizationId);

      if (updateError) {
        throw new AppError('Failed to save Stripe account ID', 500);
      }
    }

    // Now create an AccountLink for onboarding
    // Dynamic refresh & return URLs depending on environment
    let frontendUrl = process.env.FRONTEND_URL || frontendUrlOrOrigin || 'https://www.dinely.co.uk';
    if (process.env.NODE_ENV === 'production') {
      frontendUrl = process.env.FRONTEND_URL || 'https://www.dinely.co.uk';
    }

    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${frontendUrl}/admin/tabs/settings?stripe_refresh=true`,
      return_url: `${frontendUrl}/admin/tabs/settings?stripe_return=true`,
      type: 'account_onboarding',
    });

    return {
      url: accountLink.url,
      stripeAccountId: accountId
    };
  }

  /**
   * Checks the onboarding status of a connected account.
   */
  async checkAccountStatus(organizationId: string) {
    if (!stripe || !isStripeConfigured) {
      throw new AppError('Stripe is not configured. Please add STRIPE_SECRET_KEY to your environment.', 503);
    }

    const { data: org, error } = await supabaseAdmin
      .from('organizations')
      .select('stripe_account_id, stripe_onboarding_complete')
      .eq('id', organizationId)
      .single();

    if (error || !org) {
      throw new AppError('Organization not found', 404);
    }

    if (!org.stripe_account_id) {
      return {
        isConnected: false,
        detailsSubmitted: false
      };
    }

    try {
      const account = await stripe.accounts.retrieve(org.stripe_account_id);

      // Update DB if newly completed
      if (account.details_submitted && !org.stripe_onboarding_complete) {
        await supabaseAdmin
          .from('organizations')
          .update({ stripe_onboarding_complete: true })
          .eq('id', organizationId);
      }

      return {
        isConnected: true,
        detailsSubmitted: account.details_submitted
      };
    } catch (err: any) {
      throw new AppError(`Failed to fetch Stripe account: ${err.message}`, 500);
    }
  }

  /**
   * Generates a checkout session for a customer to pay the VIP premium fee.
   */
  async createCustomerVipCheckoutSession(userId: string, organizationId: string, returnUrl: string) {
    if (!stripe || !isStripeConfigured) {
      throw new AppError('Stripe is not configured. Please add STRIPE_SECRET_KEY to your environment.', 503);
    }

    // Fetch org info for branding
    const { data: org, error: orgError } = await supabaseAdmin
      .from('organizations')
      .select('name, vip_membership_fee, currency')
      .eq('id', organizationId)
      .single();

    if (orgError || !org) {
      throw new AppError('Organization not found', 404);
    }

    // Fetch customer record for reference
    const { data: customer, error: custError } = await supabaseAdmin
      .from('customers')
      .select('id, email')
      .eq('user_id', userId)
      .single();

    if (custError || !customer) {
      throw new AppError('Customer profile not found', 404);
    }

    const fee = org.vip_membership_fee || 15;
    const currency = (org.currency || 'GBP').toLowerCase();

    try {
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        mode: 'payment',
        customer_email: customer.email,
        line_items: [
          {
            price_data: {
              currency,
              product_data: {
                name: `Premium Membership - ${org.name}`,
                description: 'Unlock priority bookings, premium tables, and exclusive complimentary benefits.',
              },
              unit_amount: Math.round(fee * 100),
            },
            quantity: 1,
          },
        ],
        success_url: `${returnUrl}?upgrade_success=true&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${returnUrl}?upgrade_cancelled=true`,
        client_reference_id: customer.id,
        metadata: {
          customerId: customer.id,
          organizationId,
          type: 'vip_upgrade'
        }
      });

      return { url: session.url };
    } catch (err: any) {
      console.error('[StripeService] VIP checkout error:', err.message);
      throw new AppError(`Payment service error: ${err.message}`, 500);
    }
  }

  /**
   * Handles the Stripe Webhook to process completed payments.
   */
  async handleWebhookEvent(rawBody: Buffer, signature: string, webhookSecret: string) {
    if (!stripe || !isStripeConfigured) {
      throw new AppError('Stripe is not configured', 503);
    }

    let event;

    try {
      event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    } catch (err: any) {
      throw new AppError(`Webhook signature verification failed: ${err.message}`, 400);
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      
      if (session.payment_status === 'paid' && session.metadata?.type === 'vip_upgrade') {
        const customerId = session.metadata.customerId;
        
        const { error } = await supabaseAdmin
          .from('customers')
          .update({ is_vip: true })
          .eq('id', customerId);
          
        if (error) {
          console.error('[Webhook] Failed to update customer VIP status:', error);
        }
      }
    }

    return { received: true };
  }
}

export const stripeService = new StripeService();
