import { supabaseAdmin } from '../config/database';
import { CreateOrganizationDto, UpdateOrganizationDto } from '../types/api.types';
import { AppError, NotFoundError } from '../middleware/errorHandler';
import { generateUniqueSlug } from '../utils/slug';
import { getTodayDate, resolveIanaTimezone } from '../utils/time';
import { getPlanLimits } from '../config/planLimits';

export class OrganizationService {
  /**
   * Get organization by ID.
   */
  async getById(id: string) {
    const { data, error } = await supabaseAdmin
      .from('organizations')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      throw new NotFoundError('Organization');
    }

    return this.formatOrganization(data);
  }

  /**
   * Get organization by slug.
   */
  async getBySlug(slug: string) {
    const { data, error } = await supabaseAdmin
      .from('organizations')
      .select('*')
      .eq('slug', slug)
      .eq('is_active', true)
      .single();

    if (error || !data) {
      throw new NotFoundError('Organization');
    }

    return this.formatOrganization(data);
  }

  /**
   * Update organization settings.
   */
  async update(id: string, dto: UpdateOrganizationDto) {
    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    // Map camelCase DTO to snake_case DB columns
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.address !== undefined) updateData.address = dto.address;
    if (dto.phone !== undefined) updateData.phone = dto.phone;
    if (dto.email !== undefined) updateData.email = dto.email;
    if (dto.openingTime !== undefined) updateData.opening_time = dto.openingTime;
    if (dto.closingTime !== undefined) updateData.closing_time = dto.closingTime;
    if (dto.currency !== undefined) updateData.currency = dto.currency;
    if (dto.allowMergeableTables !== undefined) updateData.allow_mergeable_tables = dto.allowMergeableTables;
    if (dto.allowWalkIns !== undefined) updateData.allow_walk_ins = dto.allowWalkIns;
    if (dto.defaultReservationDurationMin !== undefined) updateData.default_reservation_duration_min = dto.defaultReservationDurationMin;
    if (dto.minAdvanceBookingHours !== undefined) updateData.min_advance_booking_hours = dto.minAdvanceBookingHours;
    if (dto.maxAdvanceBookingDays !== undefined) updateData.max_advance_booking_days = dto.maxAdvanceBookingDays;
    if (dto.maxPartySize !== undefined) updateData.max_party_size = dto.maxPartySize;
    if (dto.requirePayment !== undefined) updateData.require_payment = dto.requirePayment;
    if (dto.cancellationPolicy !== undefined) updateData.cancellation_policy = dto.cancellationPolicy;
    if (dto.setupCompleted !== undefined) updateData.setup_completed = dto.setupCompleted;
    if (dto.logoUrl !== undefined) updateData.logo_url = dto.logoUrl;
    if (dto.vipMembershipFee !== undefined) updateData.vip_membership_fee = dto.vipMembershipFee;
    if (dto.autologinSecret !== undefined) updateData.autologin_secret = dto.autologinSecret;
    if (dto.weeklyHours !== undefined) updateData.weekly_hours = dto.weeklyHours;
    if (dto.brandingColor !== undefined) updateData.branding_color = dto.brandingColor;
    if (dto.emailCustomNote !== undefined) updateData.email_custom_note = dto.emailCustomNote;
    if (dto.bookingPause !== undefined) updateData.booking_pause = dto.bookingPause;

    // ── Plan-gated fields: landing page customization (Professional only) ──
    // Fetch current plan before allowing these fields to be saved.
    if (dto.widgetHeading !== undefined || dto.widgetCtaText !== undefined) {
      const { data: org } = await supabaseAdmin
        .from('organizations')
        .select('subscription_plan')
        .eq('id', id)
        .single();
      const limits = getPlanLimits(org?.subscription_plan);
      if (limits.customizableLandingPage) {
        if (dto.widgetHeading !== undefined) updateData.widget_heading = dto.widgetHeading;
        if (dto.widgetCtaText !== undefined) updateData.widget_cta_text = dto.widgetCtaText;
      }
      // Silently ignore the fields on Starter — no error thrown (graceful degradation)
    }

    const { data, error } = await supabaseAdmin
      .from('organizations')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error || !data) {
      throw new AppError('Failed to update organization', 500);
    }

    return this.formatOrganization(data);
  }

  /**
   * Update setup wizard progress.
   */
  async updateSetup(id: string, setupStep: number, setupCompleted?: boolean) {
    const updateData: Record<string, any> = {
      setup_step: setupStep,
      updated_at: new Date().toISOString(),
    };

    if (setupCompleted !== undefined) {
      updateData.setup_completed = setupCompleted;
    }

    // If step is 4 (final step), mark as completed
    if (setupStep >= 4) {
      updateData.setup_completed = true;
    }

    const { data, error } = await supabaseAdmin
      .from('organizations')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error || !data) {
      throw new AppError('Failed to update setup progress', 500);
    }

    return this.formatOrganization(data);
  }

  /**
   * Get the monthly reservation usage for plan limit display.
   * Applies the on-read reset strategy: if stored reset_at is stale,
   * re-counts from the DB and updates the cache.
   */
  async getMonthlyUsage(orgId: string) {
    const { data: org } = await supabaseAdmin
      .from('organizations')
      .select('subscription_plan, subscription_status, monthly_reservation_count, monthly_reservation_reset_at')
      .eq('id', orgId)
      .single();

    if (!org) throw new AppError('Organization not found', 404);

    const plan = org.subscription_plan || 'free';
    const { getPlanLimits, hasUnlimitedReservations } = await import('../config/planLimits');
    const limits = getPlanLimits(plan);
    const monthlyLimit = hasUnlimitedReservations(plan) ? null : limits.monthlyReservations;

    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const resetAt = org.monthly_reservation_reset_at ? new Date(org.monthly_reservation_reset_at) : null;

    const isStaleMonth =
      !resetAt ||
      resetAt.getFullYear() !== now.getFullYear() ||
      resetAt.getMonth() !== now.getMonth();

    let currentCount = org.monthly_reservation_count ?? 0;

    if (isStaleMonth) {
      const { count: realCount } = await supabaseAdmin
        .from('reservations')
        .select('id', { count: 'exact', head: true })
        .eq('restaurant_id', orgId)
        .neq('status', 'cancelled')
        .gte('created_at', currentMonthStart.toISOString());

      currentCount = realCount ?? 0;
      // Update cache (fire-and-forget)
      supabaseAdmin
        .from('organizations')
        .update({
          monthly_reservation_count: currentCount,
          monthly_reservation_reset_at: currentMonthStart.toISOString(),
        })
        .eq('id', orgId)
        .then(() => {});
    }

    const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    return {
      plan,
      subscriptionStatus: org.subscription_status || 'none',
      monthlyCount: currentCount,
      monthlyLimit,         // null = unlimited
      resetDate: nextMonthStart.toISOString().split('T')[0],
      isUnlimited: monthlyLimit === null,
      percentUsed: monthlyLimit ? Math.min(100, Math.round((currentCount / monthlyLimit) * 100)) : 0,
    };
  }


  /**
   * Upload a logo image and update the organization record.
   */
  async uploadLogo(orgId: string, file: Express.Multer.File) {
    // Clean up old logo if present
    const { data: currentOrg } = await supabaseAdmin
      .from('organizations')
      .select('logo_url')
      .eq('id', orgId)
      .single();

    if (currentOrg?.logo_url) {
      try {
        const oldPath = currentOrg.logo_url.split('/restaurant-assets/')[1];
        if (oldPath) {
          await supabaseAdmin.storage.from('restaurant-assets').remove([oldPath]);
        }
      } catch (cleanupErr) {
        console.warn('[OrgService] Failed to clean up old logo:', cleanupErr);
      }
    }

    const fileName = `logos/${orgId}/${Date.now()}-${file.originalname}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from('restaurant-assets')
      .upload(fileName, file.buffer, {
        contentType: file.mimetype,
        upsert: true,
      });

    if (uploadError) {
      console.error('[OrgService] Logo upload failed:', uploadError);
      throw new AppError('Failed to upload logo image', 500);
    }

    const { data: urlData } = supabaseAdmin.storage
      .from('restaurant-assets')
      .getPublicUrl(fileName);

    const logoUrl = urlData.publicUrl;

    // Update organization record
    const { error: updateError } = await supabaseAdmin
      .from('organizations')
      .update({ logo_url: logoUrl, updated_at: new Date().toISOString() })
      .eq('id', orgId);

    if (updateError) {
      throw new AppError('Failed to save logo URL', 500);
    }

    return { logoUrl };
  }

  /**
   * Upload a widget background image and update the organization record.
   */
  async uploadWidgetBg(orgId: string, file: Express.Multer.File) {
    // Clean up old background if present
    const { data: currentOrg } = await supabaseAdmin
      .from('organizations')
      .select('widget_bg_url')
      .eq('id', orgId)
      .single();

    if (currentOrg?.widget_bg_url) {
      try {
        const oldPath = currentOrg.widget_bg_url.split('/restaurant-assets/')[1];
        if (oldPath) {
          await supabaseAdmin.storage.from('restaurant-assets').remove([oldPath]);
        }
      } catch (cleanupErr) {
        console.warn('[OrgService] Failed to clean up old widget bg:', cleanupErr);
      }
    }

    const fileName = `widget-bg/${orgId}/${Date.now()}-${file.originalname}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from('restaurant-assets')
      .upload(fileName, file.buffer, {
        contentType: file.mimetype,
        upsert: true,
      });

    if (uploadError) {
      console.error('[OrgService] Widget bg upload failed:', uploadError);
      throw new AppError('Failed to upload widget background image', 500);
    }

    const { data: urlData } = supabaseAdmin.storage
      .from('restaurant-assets')
      .getPublicUrl(fileName);

    const widgetBgUrl = urlData.publicUrl;

    // Update organization record
    const { error: updateError } = await supabaseAdmin
      .from('organizations')
      .update({ widget_bg_url: widgetBgUrl, updated_at: new Date().toISOString() })
      .eq('id', orgId);

    if (updateError) {
      throw new AppError('Failed to save widget background URL', 500);
    }

    return { widgetBgUrl };
  }

  /**
   * Get dashboard statistics for a restaurant.
   */
  async getStats(restaurantId: string) {
    const today = getTodayDate();

    // Today's bookings count
    const { count: todaysBookings } = await supabaseAdmin
      .from('reservations')
      .select('*', { count: 'exact', head: true })
      .eq('restaurant_id', restaurantId)
      .eq('reservation_date', today)
      .neq('status', 'cancelled');

    // Currently seated
    const { count: seatedNow } = await supabaseAdmin
      .from('reservations')
      .select('*', { count: 'exact', head: true })
      .eq('restaurant_id', restaurantId)
      .eq('reservation_date', today)
      .eq('status', 'seated');

    // Total tables
    const { count: totalTables } = await supabaseAdmin
      .from('tables')
      .select('*', { count: 'exact', head: true })
      .eq('restaurant_id', restaurantId)
      .eq('is_active', true);

    // Total staff
    const { count: totalStaff } = await supabaseAdmin
      .from('staff_members')
      .select('*', { count: 'exact', head: true })
      .eq('restaurant_id', restaurantId)
      .eq('is_active', true);

    return {
      todaysBookings: todaysBookings || 0,
      seatedNow: seatedNow || 0,
      totalTables: totalTables || 0,
      totalStaff: totalStaff || 0,
    };
  }

  /**
   * List all organizations (super admin only).
   */
  async listAll(page: number = 1, limit: number = 20) {
    const offset = (page - 1) * limit;

    const { data, error, count } = await supabaseAdmin
      .from('organizations')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw new AppError('Failed to fetch organizations', 500);
    }

    return {
      organizations: (data || []).map(this.formatOrganization),
      total: count || 0,
    };
  }

  /**
   * Format DB row to API response (snake_case → camelCase).
   */
  private formatOrganization(row: any) {
    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      ownerId: row.owner_id,
      logoUrl: row.logo_url,
      country: row.country,
      timezone: resolveIanaTimezone(row.timezone),
      address: row.address,
      phone: row.phone,
      email: row.email,
      widgetHeading: row.widget_heading || null,
      widgetCtaText: row.widget_cta_text || null,
      autologinSecret: row.autologin_secret || null,
      openingTime: row.opening_time,
      closingTime: row.closing_time,
      currency: row.currency,
      allowMergeableTables: row.allow_mergeable_tables,
      allowWalkIns: row.allow_walk_ins,
      defaultReservationDurationMin: row.default_reservation_duration_min,
      minAdvanceBookingHours: row.min_advance_booking_hours,
      maxAdvanceBookingDays: row.max_advance_booking_days,
      maxPartySize: row.max_party_size,
      requirePayment: row.require_payment,
      cancellationPolicy: row.cancellation_policy,
      setupCompleted: row.setup_completed,
      setupStep: row.setup_step,
      stripeAccountId: row.stripe_account_id,
      stripeOnboardingComplete: row.stripe_onboarding_complete,
      vipMembershipFee: row.vip_membership_fee,
      weeklyHours: row.weekly_hours || null,
      widgetBgUrl: row.widget_bg_url || null,
      brandingColor: row.branding_color || '#0B1517',
      emailCustomNote: row.email_custom_note || null,
      bookingPause: row.booking_pause || { guestEnabled: false, loggedInEnabled: false, dates: [] },
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      // Subscription info — used by the frontend for plan-aware feature gating
      subscriptionPlan: row.subscription_plan || 'free',
      subscriptionStatus: row.subscription_status || 'none',
      monthlyReservationCount: row.monthly_reservation_count ?? 0,
      monthlyReservationResetAt: row.monthly_reservation_reset_at || null,
    };
  }
}

export const organizationService = new OrganizationService();
