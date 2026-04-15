import { supabaseAdmin } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import crypto from 'crypto';

export class SetupTokenService {
  /**
   * Generate a single-use setup token for a given organization.
   * Token expires after 48 hours.
   */
  async generateSetupToken(organizationId: string): Promise<string> {
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(); // 48 hours

    const { error } = await supabaseAdmin
      .from('setup_tokens')
      .insert({
        organization_id: organizationId,
        token,
        used: false,
        expires_at: expiresAt,
      });

    if (error) {
      console.error('[SetupTokenService] Failed to create setup token:', error);
      throw new AppError('Failed to generate setup token', 500);
    }

    return token;
  }

  /**
   * Validate and consume a setup token.
   * Returns the organization ID if valid.
   * Throws if invalid, expired, or already used.
   */
  async validateAndConsumeToken(token: string): Promise<string> {
    const { data, error } = await supabaseAdmin
      .from('setup_tokens')
      .select('*')
      .eq('token', token)
      .single();

    if (error || !data) {
      throw new AppError('Invalid or expired setup token', 400);
    }

    if (data.used) {
      throw new AppError('This setup link has already been used', 400);
    }

    if (new Date(data.expires_at) < new Date()) {
      throw new AppError('This setup link has expired. Please contact support for a new one.', 400);
    }

    // Mark token as used
    await supabaseAdmin
      .from('setup_tokens')
      .update({ used: true })
      .eq('id', data.id);

    return data.organization_id;
  }

  /**
   * Regenerate a setup token for an organization.
   * Invalidates all previous tokens and creates a new one.
   */
  async regenerateToken(organizationId: string): Promise<string> {
    // Mark all old tokens as used
    await supabaseAdmin
      .from('setup_tokens')
      .update({ used: true })
      .eq('organization_id', organizationId)
      .eq('used', false);

    return this.generateSetupToken(organizationId);
  }
}

export const setupTokenService = new SetupTokenService();
