import 'dotenv/config';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2025-02-24.acacia' as any });

async function run() {
  try {
    const session = await stripe.checkout.sessions.create({
      customer_email: 'test@example.com',
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [
        {
          price: process.env.STRIPE_PRICE_PROFESSIONAL_GBP,
          quantity: 1,
        },
      ],
      subscription_data: {
        trial_period_days: 14,
        metadata: {
          organizationId: 'test-org',
          plan: 'professional',
        },
      },
      success_url: 'http://localhost/success',
      cancel_url: 'http://localhost/cancel',
    });
    console.log('Success:', session.url);
  } catch (err: any) {
    console.error('Stripe Error:', err.message);
    if (err.raw) console.error('Raw:', err.raw);
  }
}

run();
