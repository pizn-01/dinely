/**
 * One-time script to create Stripe Prices on existing Products for Dinely SaaS plans.
 * Run with: npx ts-node scripts/create-stripe-prices.ts
 *
 * This creates prices for both GBP and USD products:
 *   - Starter GBP: £49/month on prod_ULsnnIRQGLP320
 *   - Starter USD: $49/month on prod_UIXrVVQSvb5p7b
 *   - Professional GBP: £79/month on prod_ULss8Rmnv310SI
 *   - Professional USD: $79/month on prod_UIXrk9A7U5iyeX
 *
 * After running, copy the outputted price IDs into your backend/.env and Fly.io secrets.
 */
import 'dotenv/config';

const Stripe = require('stripe');

const stripeKey = process.env.STRIPE_SECRET_KEY;
if (!stripeKey || !stripeKey.startsWith('sk_')) {
  console.error('❌ STRIPE_SECRET_KEY is not set or invalid in backend/.env');
  process.exit(1);
}

const stripe = Stripe(stripeKey, { apiVersion: '2025-02-24.acacia' });

// Your Stripe Product IDs
const PRODUCTS = {
  starter: {
    gbp: 'prod_ULsnnIRQGLP320',
    usd: 'prod_UIXrVVQSvb5p7b',
  },
  professional: {
    gbp: 'prod_ULss8Rmnv310SI',
    usd: 'prod_UIXrk9A7U5iyeX',
  },
};

async function createPrices() {
  console.log('🔧 Creating Stripe Prices for Dinely SaaS...\n');

  // ── Starter GBP ──
  const starterGbpPrice = await stripe.prices.create({
    product: PRODUCTS.starter.gbp,
    unit_amount: 4900, // £49.00
    currency: 'gbp',
    recurring: { interval: 'month' },
    metadata: { plan: 'starter', currency: 'gbp' },
  });
  console.log(`✅ Starter GBP Price:        ${starterGbpPrice.id}`);

  // ── Starter USD ──
  const starterUsdPrice = await stripe.prices.create({
    product: PRODUCTS.starter.usd,
    unit_amount: 4900, // $49.00
    currency: 'usd',
    recurring: { interval: 'month' },
    metadata: { plan: 'starter', currency: 'usd' },
  });
  console.log(`✅ Starter USD Price:        ${starterUsdPrice.id}`);

  // ── Professional GBP ──
  const proGbpPrice = await stripe.prices.create({
    product: PRODUCTS.professional.gbp,
    unit_amount: 7900, // £79.00
    currency: 'gbp',
    recurring: { interval: 'month' },
    metadata: { plan: 'professional', currency: 'gbp' },
  });
  console.log(`✅ Professional GBP Price:   ${proGbpPrice.id}`);

  // ── Professional USD ──
  const proUsdPrice = await stripe.prices.create({
    product: PRODUCTS.professional.usd,
    unit_amount: 7900, // $79.00
    currency: 'usd',
    recurring: { interval: 'month' },
    metadata: { plan: 'professional', currency: 'usd' },
  });
  console.log(`✅ Professional USD Price:   ${proUsdPrice.id}`);

  console.log('\n──────────────────────────────────────────────');
  console.log('Add these to your backend/.env AND Fly.io secrets:');
  console.log(`STRIPE_PRICE_STARTER_GBP=${starterGbpPrice.id}`);
  console.log(`STRIPE_PRICE_STARTER_USD=${starterUsdPrice.id}`);
  console.log(`STRIPE_PRICE_PROFESSIONAL_GBP=${proGbpPrice.id}`);
  console.log(`STRIPE_PRICE_PROFESSIONAL_USD=${proUsdPrice.id}`);
  console.log('──────────────────────────────────────────────');
  console.log('\nFor Fly.io, run:');
  console.log(`flyctl secrets set STRIPE_PRICE_STARTER_GBP=${starterGbpPrice.id} STRIPE_PRICE_STARTER_USD=${starterUsdPrice.id} STRIPE_PRICE_PROFESSIONAL_GBP=${proGbpPrice.id} STRIPE_PRICE_PROFESSIONAL_USD=${proUsdPrice.id}`);
}

createPrices().catch((err) => {
  console.error('❌ Failed:', err.message);
  process.exit(1);
});
