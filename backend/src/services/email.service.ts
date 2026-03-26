/**
 * Pluggable email service with provider abstraction.
 * 
 * Provider priority:
 * 1. Resend (if RESEND_API_KEY is configured) — production
 * 2. Supabase Auth emails (inviteUserByEmail / resetPasswordForEmail) — development
 * 3. Console bypass (fallback for local dev when no provider is set)
 * 
 * Resend integration is wired but inactive until RESEND_API_KEY is provided.
 */

export interface EmailPayload {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
  replyTo?: string;
}

export interface EmailProvider {
  name: string;
  send(payload: EmailPayload): Promise<{ success: boolean; messageId?: string }>;
}

// ─── Console Provider (Development Fallback) ────────────

class ConsoleEmailProvider implements EmailProvider {
  name = 'console';

  async send(payload: EmailPayload) {
    console.log('─── EMAIL (Console Bypass) ────────────────');
    console.log(`To:      ${payload.to}`);
    console.log(`Subject: ${payload.subject}`);
    console.log(`Body:    ${payload.text || payload.html.substring(0, 300)}...`);
    console.log('───────────────────────────────────────────');
    return { success: true, messageId: `console-${Date.now()}` };
  }
}

// ─── Resend Provider (Production — activated when API key is set) ─

class ResendEmailProvider implements EmailProvider {
  name = 'resend';
  private apiKey: string;
  private fromEmail: string;

  constructor(apiKey: string, fromEmail: string) {
    this.apiKey = apiKey;
    this.fromEmail = fromEmail;
  }

  async send(payload: EmailPayload): Promise<{ success: boolean; messageId?: string }> {
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: payload.from || this.fromEmail,
          to: [payload.to],
          subject: payload.subject,
          html: payload.html,
          text: payload.text,
          reply_to: payload.replyTo,
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        console.error(`[EmailService] Resend API error (${response.status}):`, errorBody);
        return { success: false };
      }

      const result = await response.json() as { id: string };
      console.log(`[EmailService] Email sent via Resend to ${payload.to} (ID: ${result.id})`);
      return { success: true, messageId: result.id };
    } catch (error: any) {
      console.error('[EmailService] Resend send failed:', error.message);
      return { success: false };
    }
  }
}

// ─── Email Service ─────────────────────────────────────

class EmailService {
  private provider: EmailProvider;

  constructor() {
    // Auto-detect provider from environment
    const resendKey = process.env.RESEND_API_KEY;
    const resendFrom = process.env.RESEND_FROM_EMAIL || 'noreply@tablereserve.app';

    if (resendKey && resendKey !== 'your-resend-api-key') {
      this.provider = new ResendEmailProvider(resendKey, resendFrom);
      console.log('[EmailService] ✅ Using Resend email provider');
    } else {
      this.provider = new ConsoleEmailProvider();
      console.log('[EmailService] ⚠️  Using console bypass (set RESEND_API_KEY for production)');
    }
  }

  /**
   * Get the current provider name.
   */
  getProviderName(): string {
    return this.provider.name;
  }

  /**
   * Set a different email provider at runtime.
   */
  setProvider(provider: EmailProvider) {
    this.provider = provider;
    console.log(`[EmailService] Provider switched to: ${provider.name}`);
  }

  /**
   * Send an email via the configured provider.
   */
  async send(payload: EmailPayload) {
    return this.provider.send(payload);
  }

  // ─── Template Helpers ──────────────────────────────────

  /**
   * Send a staff invitation email.
   */
  async sendStaffInvite(params: {
    to: string;
    staffName: string;
    restaurantName: string;
    inviteToken: string;
    role: string;
    baseUrl: string;
  }) {
    const inviteUrl = `${params.baseUrl}/accept-invite?token=${params.inviteToken}`;

    return this.send({
      to: params.to,
      subject: `You're invited to join ${params.restaurantName} — TableReserve`,
      html: `
        <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #0B1517; color: #ffffff; padding: 40px; border-radius: 16px;">
          <div style="text-align: center; margin-bottom: 32px;">
            <h1 style="font-size: 24px; font-weight: 700; margin: 0 0 8px 0; color: #ffffff;">Welcome to ${params.restaurantName}</h1>
            <p style="color: #8b949e; margin: 0; font-size: 14px;">You've been invited to the team</p>
          </div>
          
          <div style="background-color: #101A1C; border: 1px solid rgba(255,255,255,0.05); border-radius: 12px; padding: 24px; margin-bottom: 24px;">
            <p style="margin: 0 0 12px 0;">Hi ${params.staffName},</p>
            <p style="margin: 0 0 16px 0; color: #c9d1d9;">You've been invited to join <strong style="color: #ffffff;">${params.restaurantName}</strong> as a <strong style="color: #4a9e6b;">${params.role}</strong> on TableReserve.</p>
            <p style="margin: 0; color: #c9d1d9;">Click the button below to set up your account and get started:</p>
          </div>
          
          <div style="text-align: center; margin-bottom: 24px;">
            <a href="${inviteUrl}" style="display: inline-block; padding: 14px 32px; background: #4a9e6b; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
              Accept Invitation
            </a>
          </div>
          
          <p style="color: #484f58; font-size: 12px; text-align: center; margin: 0;">
            If the button doesn't work, copy and paste this URL into your browser:<br/>
            <a href="${inviteUrl}" style="color: #4a9e6b; word-break: break-all;">${inviteUrl}</a>
          </p>
        </div>
      `,
      text: `Hi ${params.staffName}, you've been invited to join ${params.restaurantName} as a ${params.role}. Accept your invitation here: ${inviteUrl}`,
    });
  }

  /**
   * Send a reservation confirmation email.
   */
  async sendReservationConfirmation(params: {
    to: string;
    guestName: string;
    restaurantName: string;
    date: string;
    time: string;
    partySize: number;
    confirmationId: string;
    tableName?: string;
  }) {
    return this.send({
      to: params.to,
      subject: `Reservation Confirmed — ${params.restaurantName}`,
      html: `
        <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #0B1517; color: #ffffff; padding: 40px; border-radius: 16px;">
          <div style="text-align: center; margin-bottom: 32px;">
            <div style="width: 64px; height: 64px; background: rgba(74, 158, 107, 0.15); border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 16px;">
              <span style="font-size: 28px;">✓</span>
            </div>
            <h1 style="font-size: 24px; font-weight: 700; margin: 0 0 8px 0;">Reservation Confirmed!</h1>
            <p style="color: #8b949e; margin: 0; font-size: 14px;">Your table is secured at ${params.restaurantName}</p>
          </div>
          
          <div style="background-color: #101A1C; border: 1px solid rgba(255,255,255,0.05); border-radius: 12px; padding: 24px; margin-bottom: 24px;">
            <p style="margin: 0 0 8px 0;">Hi ${params.guestName},</p>
            <table style="width: 100%; border-collapse: collapse; margin-top: 16px;">
              <tr>
                <td style="padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.05); color: #8b949e; font-size: 14px;">📅 Date</td>
                <td style="padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.05); font-weight: 600; text-align: right;">${params.date}</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.05); color: #8b949e; font-size: 14px;">🕐 Time</td>
                <td style="padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.05); font-weight: 600; text-align: right;">${params.time}</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.05); color: #8b949e; font-size: 14px;">👥 Party Size</td>
                <td style="padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.05); font-weight: 600; text-align: right;">${params.partySize} guests</td>
              </tr>
              ${params.tableName ? `
              <tr>
                <td style="padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.05); color: #8b949e; font-size: 14px;">🪑 Table</td>
                <td style="padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.05); font-weight: 600; text-align: right;">${params.tableName}</td>
              </tr>
              ` : ''}
              <tr>
                <td style="padding: 10px 0; color: #8b949e; font-size: 14px;">🔖 Confirmation #</td>
                <td style="padding: 10px 0; font-weight: 600; text-align: right; color: #4a9e6b;">${params.confirmationId.substring(0, 8).toUpperCase()}</td>
              </tr>
            </table>
          </div>
          
          <p style="color: #484f58; font-size: 12px; text-align: center; margin: 0;">
            Need to modify or cancel? Contact the restaurant directly or visit your reservations page.
          </p>
        </div>
      `,
      text: `Hi ${params.guestName}, your reservation at ${params.restaurantName} is confirmed for ${params.date} at ${params.time} (${params.partySize} guests). Confirmation #${params.confirmationId.substring(0, 8).toUpperCase()}`,
    });
  }

  /**
   * Send a reservation cancellation email.
   */
  async sendReservationCancellation(params: {
    to: string;
    guestName: string;
    restaurantName: string;
    date: string;
    time: string;
    reason?: string;
  }) {
    return this.send({
      to: params.to,
      subject: `Reservation Cancelled — ${params.restaurantName}`,
      html: `
        <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #0B1517; color: #ffffff; padding: 40px; border-radius: 16px;">
          <div style="text-align: center; margin-bottom: 32px;">
            <h1 style="font-size: 24px; font-weight: 700; margin: 0 0 8px 0;">Reservation Cancelled</h1>
            <p style="color: #8b949e; margin: 0; font-size: 14px;">${params.restaurantName}</p>
          </div>
          
          <div style="background-color: #101A1C; border: 1px solid rgba(255,255,255,0.05); border-radius: 12px; padding: 24px; margin-bottom: 24px;">
            <p style="margin: 0 0 12px 0;">Hi ${params.guestName},</p>
            <p style="margin: 0 0 16px 0; color: #c9d1d9;">Your reservation at <strong>${params.restaurantName}</strong> for <strong>${params.date}</strong> at <strong>${params.time}</strong> has been cancelled.</p>
            ${params.reason ? `<p style="margin: 0; color: #c9d1d9; font-size: 14px;">Reason: ${params.reason}</p>` : ''}
          </div>
          
          <p style="color: #484f58; font-size: 12px; text-align: center; margin: 0;">
            If you'd like to rebook, visit our reservation page.
          </p>
        </div>
      `,
      text: `Hi ${params.guestName}, your reservation at ${params.restaurantName} for ${params.date} at ${params.time} has been cancelled.${params.reason ? ` Reason: ${params.reason}` : ''}`,
    });
  }

  /**
   * Send a premium bumped notification to the original guest.
   */
  async sendPremiumBumpNotification(params: {
    to: string;
    guestName: string;
    restaurantName: string;
    date: string;
    time: string;
  }) {
    return this.send({
      to: params.to,
      subject: `Reservation Update — ${params.restaurantName}`,
      html: `
        <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #0B1517; color: #ffffff; padding: 40px; border-radius: 16px;">
          <div style="text-align: center; margin-bottom: 32px;">
            <h1 style="font-size: 24px; font-weight: 700; margin: 0 0 8px 0;">Reservation Update</h1>
          </div>
          <div style="background-color: #101A1C; border: 1px solid rgba(255,255,255,0.05); border-radius: 12px; padding: 24px;">
            <p>Hi ${params.guestName},</p>
            <p style="color: #c9d1d9;">Unfortunately, your reservation at <strong>${params.restaurantName}</strong> for <strong>${params.date}</strong> at <strong>${params.time}</strong> has been reassigned due to a priority booking.</p>
            <p style="color: #c9d1d9;">We sincerely apologize for the inconvenience. Please rebook at your earliest convenience, or contact the restaurant for assistance.</p>
          </div>
        </div>
      `,
      text: `Hi ${params.guestName}, your reservation at ${params.restaurantName} for ${params.date} at ${params.time} has been reassigned due to a priority booking. We apologize for the inconvenience.`,
    });
  }

  /**
   * Send a password reset email (backup — Supabase handles primary flow).
   */
  async sendPasswordReset(params: { to: string; resetUrl: string }) {
    return this.send({
      to: params.to,
      subject: 'Reset Your Password — TableReserve',
      html: `
        <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #0B1517; color: #ffffff; padding: 40px; border-radius: 16px;">
          <h2 style="text-align: center;">Reset Your Password</h2>
          <div style="background-color: #101A1C; border: 1px solid rgba(255,255,255,0.05); border-radius: 12px; padding: 24px; margin-bottom: 24px;">
            <p>You requested a password reset. Click the button below to set a new password:</p>
          </div>
          <div style="text-align: center; margin-bottom: 24px;">
            <a href="${params.resetUrl}" style="display: inline-block; padding: 14px 32px; background: #4a9e6b; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600;">
              Reset Password
            </a>
          </div>
          <p style="color: #484f58; font-size: 12px; text-align: center;">If you didn't request this, you can safely ignore this email.</p>
        </div>
      `,
      text: `You requested a password reset. Visit this link to set a new password: ${params.resetUrl}`,
    });
  }
}

export const emailService = new EmailService();
