# How to Set Up Your Stripe Webhook
### A step-by-step guide for Dinely restaurant admins

---

## What is a webhook and why do you need it?

When a customer pays for a premium reservation or a VIP membership on your restaurant's booking page, Stripe processes the payment. The webhook is how Stripe tells your Dinely system "payment was successful" — so the reservation gets confirmed automatically. Without it, payments go through but the booking stays unconfirmed.

---

## Step 1 — Log in to your Stripe Dashboard

1. Go to **https://dashboard.stripe.com**
2. Log in with the Stripe account you connected to your Dinely admin panel

> If you are using **Test Mode**, make sure the toggle in the top-right corner says **"Test mode"** while testing. Switch to **Live mode** when you are ready to take real payments.

---

## Step 2 — Go to the Webhooks section

1. In the left sidebar, click **"Developers"**
2. In the sub-menu that appears, click **"Webhooks"**

You will land on a page that lists your existing webhooks (it may be empty).

---

## Step 3 — Add a new endpoint

1. Click the **"Add endpoint"** button (top right of the Webhooks page)
2. In the **"Endpoint URL"** field, paste exactly this:

```
https://dinely.fly.dev/api/v1/stripe/webhook
```

3. Under **"Select events to listen to"**, click **"+ Select events"**
4. Search for and tick each of these four events:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
5. Click **"Add events"** to confirm your selection
6. Click **"Add endpoint"** to save

---

## Step 4 — Copy your Signing Secret

After saving, you will be taken to the webhook detail page.

1. Look for the section called **"Signing secret"**
2. Click **"Reveal"** (it is hidden by default)
3. Copy the full value — it starts with **`whsec_`**

Keep this value safe. You will need it in the next step.

---

## Step 5 — Send the Signing Secret to your Dinely developer

Send the `whsec_...` value to your developer (privately — do not share it in a public channel or email). They will add it to the server so your system can securely verify that webhook events are genuinely coming from Stripe.

---

## Quick visual summary

```
Stripe Dashboard
  └── Developers (left sidebar)
        └── Webhooks
              └── Add endpoint
                    ├── URL: https://dinely.fly.dev/api/v1/stripe/webhook
                    ├── Events: checkout.session.completed
                    │          customer.subscription.updated
                    │          customer.subscription.deleted
                    │          invoice.payment_failed
                    └── Save → Reveal Signing Secret → Copy whsec_...
```

---

## Recommended YouTube video

Search on YouTube for:

> **"Stripe webhooks tutorial"** by the official **Stripe Developers** channel

The Stripe Developers YouTube channel (search "Stripe Developers" on YouTube) has an official short walkthrough called **"How to use Stripe Webhooks"** that shows the exact screens in about 5 minutes. It is the clearest visual guide available and matches exactly what is described in this document.

---

## Common questions

**Q: I don't see a "Developers" option in my sidebar.**
A: Make sure you are logged in as the account owner or an admin. Restricted-access accounts may not see this menu. Switch to your main Stripe login.

**Q: Should I use Test mode or Live mode?**
A: Create the webhook in **Live mode** for real bookings. If you want to test first, create a separate webhook in Test mode pointing to the same URL — Stripe treats them independently.

**Q: What if I already have a webhook listed?**
A: If there is already an endpoint with the Dinely URL, click on it and check that all four events are listed. If any are missing, click "Add events" on that existing endpoint to add them. Do not create a duplicate.

**Q: The signing secret says "whsec_test_..." — is that correct?**
A: That means you are in Test mode. The Live mode secret will start with `whsec_` (without "test"). Make sure you are on the Live mode tab when setting up for real payments.

---

*Guide prepared for Dinely — May 2026*
