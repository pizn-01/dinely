import * as dotenv from 'dotenv';
dotenv.config();

import { emailService } from './src/services/email.service';
import { env } from './src/config/env';

async function testResend() {
  console.log('🔄 Initializing Resend Email Test...');
  console.log(`🔑 Using Provider: ${emailService.getProviderName()}`);

  if (emailService.getProviderName() !== 'resend') {
    console.error('❌ Error: Email service is NOT using Resend. Please check your .env RESEND_API_KEY.');
    process.exit(1);
  }

  const testEmail = process.argv[2];

  if (!testEmail) {
    console.error('❌ Please provide an email address as an argument.');
    console.log('Usage: npx ts-node-dev test-resend-email.ts <your-email@example.com>');
    process.exit(1);
  }

  console.log(`\n📨 Attempting to send test email to: ${testEmail}`);

  try {
    const result = await emailService.send({
      to: testEmail,
      subject: '🚀 Resend Integration Success — Dinely',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; background: #f8f9fa;">
          <h2 style="color: #4a9e6b;">🎉 It works!</h2>
          <p>This is a test email sent from your Node.js backend using the Resend API.</p>
          <p><strong>Environment:</strong> ${env.NODE_ENV}</p>
          <p>You are now fully integrated and ready to send transactional emails for the Dinely application.</p>
        </div>
      `,
      text: '🎉 It works! This is a test email sent from your Node.js backend using the Resend API.',
    });

    if (result.success) {
      console.log(`✅ Success! Email sent successfully. Message ID: ${result.messageId}`);
    } else {
      console.error('❌ Failed to send email via Resend.');
    }
  } catch (error) {
    console.error('❌ Unhandled error during email send:', error);
  }

  process.exit(0);
}

testResend();
