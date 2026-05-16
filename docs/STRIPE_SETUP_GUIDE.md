# Stripe Setup Guide

_For restaurant admins and the Dinely superadmin._

---

## What you need to do

There are two separate Stripe setups in Dinely. Do both.

---

## 1 — Dinely Platform (Superadmin)

This is the Stripe account that receives SaaS subscription payments when restaurants purchase a Dinely plan.

**Steps (one-time, already done if subscriptions are working):**

1. Log in to [dashboard.stripe.com](https://dashboard.stripe.com) with the Dinely platform account.
2. Copy the **Secret Key** (`sk_live_…`) and add it to the backend environment:
   ```
   STRIPE_SECRET_KEY=sk_live_...
   ```
3. Create two recurring price IDs for the subscription plans and add them to the environment:
   ```
   STRIPE_PRICE_STARTER_GBP=price_...
   STRIPE_PRICE_PROFESSIONAL_GBP=price_...
   ```
4. In Stripe → Developers → Webhooks, add a webhook endpoint pointing to:
   ```
   https://your-backend-domain/api/v1/stripe/webhook
   ```
   Enable these events:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`

5. Copy the webhook signing secret and add it:
   ```
   STRIPE_WEBHOOK_SECRET=whsec_...
   ```

**What this covers:**
- Restaurant owners purchasing Starter (£49/mo) or Professional (£79/mo) plans → payment goes to Dinely's Stripe account.
- Subscription lifecycle (trial, cancellation, failed payment) is handled automatically via webhook.

---

## 2 — Restaurant Admin (per restaurant)

Each restaurant must connect their own Stripe account to receive payments for:
- Premium table reservation deposits
- VIP membership fees from customers

**Requirements:**
- The restaurant must be on the **Professional plan**. Stripe Connect is not available on Starter or Free.
- The restaurant must complete Stripe's identity verification (takes 5–10 minutes).

**Steps:**

1. Log in to the Admin Dashboard.
2. Go to **Settings → Payment Gateway**.
3. Click **Connect with Stripe**.
4. You will be redirected to Stripe to create or connect an existing account.
5. Complete all required details (bank account, business info, ID verification).
6. After finishing, Stripe will return you to the Admin Dashboard automatically.
7. The settings page will show **"Connected to Stripe"** when setup is complete.

**After connecting:**
- Go back to **Settings → Payment Gateway** and enable **"Require Payment for Premium Tables"** if you want guests to pay the deposit upfront when booking premium tables.
- Premium table payments will go directly to the restaurant's Stripe account.
- VIP membership fee payments from customers will also go to the restaurant's Stripe account.

---

## Database migration (superadmin/developer)

Before the new premium payment flow works, run this migration in the Supabase SQL editor:

```sql
ALTER TABLE reservations
  ADD COLUMN IF NOT EXISTS stripe_session_id VARCHAR(255) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS table_fee DECIMAL(10,2) DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_reservations_stripe_session
  ON reservations (stripe_session_id)
  WHERE stripe_session_id IS NOT NULL;
```

File is also at: `backend/supabase/migrations/20260516_add_stripe_session_to_reservations.sql`

---

## How payments flow

| Payment type | Who receives it | Route |
|---|---|---|
| SaaS subscription (Starter/Professional) | Dinely (superadmin) | Direct Stripe charge |
| Premium table deposit | Restaurant | Via restaurant's Stripe Connect account |
| VIP membership fee | Restaurant | Via restaurant's Stripe Connect account |

---

## Troubleshooting

**"Stripe Payment Gateway is Locked" shown in settings**
The restaurant is on the Free or Starter plan. Upgrade to Professional to unlock Stripe Connect.

**"Connect with Stripe" does nothing / shows error**
Check that `STRIPE_SECRET_KEY` is set in the backend environment and starts with `sk_live_` (production) or `sk_test_` (test mode).

**After completing Stripe onboarding, the page looks blank**
This was a known bug (now fixed in this release). The return URL previously pointed to a non-existent page. After the fix, you will be returned to the Admin Dashboard automatically. If you are on an older deployment, navigate manually to `/admin` and check the Payment Gateway section.

**Premium reservation payment not charging guests**
Ensure the restaurant has completed Stripe Connect onboarding and the "Require Payment for Premium Tables" toggle is enabled in Settings.

**Webhook events not arriving**
Verify the webhook URL is registered in Stripe Dashboard under Developers → Webhooks and the `STRIPE_WEBHOOK_SECRET` environment variable matches the signing secret shown in Stripe.
