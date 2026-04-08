/**
 * One-time script to create Stripe Products and Prices for Dinely SaaS plans.
 * Run with: npx ts-node scripts/seed-stripe-products.ts
 *
 * After running, copy the outputted price IDs into your .env:
 *   STRIPE_PRICE_STARTER=price_xxx
 *   STRIPE_PRICE_PROFESSIONAL=price_xxx
 */
import 'dotenv/config';

const Stripe = require('stripe');

const stripeKey = process.env.STRIPE_SECRET_KEY;
if (!stripeKey || !stripeKey.startsWith('sk_')) {
  console.error('❌ STRIPE_SECRET_KEY is not set or invalid in backend/.env');
  process.exit(1);
}

const stripe = Stripe(stripeKey, { apiVersion: '2025-02-24.acacia' });

async function seed() {
  console.log('🔧 Creating Stripe Products & Prices for Dinely SaaS...\n');

  // ── Starter Plan ──────────────────────────────────────
  const starterProduct = await stripe.products.create({
    name: 'Dinely Starter',
    description: 'Basic table reservation system with unlimited bookings, guest + user booking, and email notifications.',
    metadata: { plan: 'starter' },
  });

  const starterPrice = await stripe.prices.create({
    product: starterProduct.id,
    unit_amount: 2900, // $29.00
    currency: 'usd',
    recurring: { interval: 'month' },
    metadata: { plan: 'starter' },
  });

  console.log(`✅ Starter Product: ${starterProduct.id}`);
  console.log(`   Starter Price:   ${starterPrice.id}`);

  // ── Professional Plan ─────────────────────────────────
  const proProduct = await stripe.products.create({
    name: 'Dinely Professional',
    description: 'All reservation flows, staff booking system, basic analytics, and priority support.',
    metadata: { plan: 'professional' },
  });

  const proPrice = await stripe.prices.create({
    product: proProduct.id,
    unit_amount: 7900, // $79.00
    currency: 'usd',
    recurring: { interval: 'month' },
    metadata: { plan: 'professional' },
  });

  console.log(`✅ Professional Product: ${proProduct.id}`);
  console.log(`   Professional Price:   ${proPrice.id}`);

  console.log('\n──────────────────────────────────────────────');
  console.log('Add these to your backend/.env:');
  console.log(`STRIPE_PRICE_STARTER=${starterPrice.id}`);
  console.log(`STRIPE_PRICE_PROFESSIONAL=${proPrice.id}`);
  console.log('──────────────────────────────────────────────');
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err.message);
  process.exit(1);
});
