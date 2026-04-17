import 'dotenv/config';
import { subscriptionService } from '../src/services/subscription.service';
import { supabaseAdmin } from '../src/config/database';

async function run() {
  try {
    // 1. Create a dummy org
    const { data: org, error: orgErr } = await supabaseAdmin.from('organizations').insert({
      name: 'Stripe Debug Org',
      email: 'stripe-debug@example.com',
      country: 'United Kingdom',
      timezone: 'GMT+0 London',
      owner_name: 'Debug Owner'
    }).select('id').single();

    if (orgErr) {
      console.error('Failed org:', orgErr);
      return;
    }

    console.log('Created dummy org:', org.id);

    // 2. Call service using the live function
    const result = await subscriptionService.createCheckoutSession(
      org.id,
      'professional',
      'stripe-debug@example.com',
      'http://localhost/success',
      'http://localhost/cancel',
      'gbp'
    );
    console.log('Success!', result);
  } catch (err: any) {
    console.error('Error in service:', err.message);
    if (err.raw) console.error(err.raw);
  }
}

run();
