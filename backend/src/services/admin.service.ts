import { supabaseAdmin } from '../config/database';
import { AppError, NotFoundError } from '../middleware/errorHandler';
import { parsePagination, buildPaginationMeta } from '../utils/pagination';
import { sanitizeSearch } from '../utils/sanitize';
import { auditService } from './audit.service';

export class AdminService {
  /**
   * List all restaurants on the platform.
   */
  async listOrganizations(page = 1, limit = 20, search?: string) {
    const { offset } = parsePagination({ page, limit });

    let query = supabaseAdmin
      .from('organizations')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (search) {
      const safe = sanitizeSearch(search);
      query = query.or(`name.ilike.%${safe}%,slug.ilike.%${safe}%,email.ilike.%${safe}%`);
    }

    const { data, error, count } = await query;
    if (error) throw new AppError('Failed to fetch organizations', 500);

    return {
      organizations: (data || []).map(this.formatOrganization),
      meta: buildPaginationMeta(page, limit, count || 0),
    };
  }

  /**
   * Get detailed organization info (admin view).
   */
  async getOrganization(orgId: string) {
    const { data, error } = await supabaseAdmin
      .from('organizations')
      .select('*')
      .eq('id', orgId)
      .single();

    if (error || !data) throw new NotFoundError('Organization');

    // Get counts
    const [staffCount, tableCount, reservationCount] = await Promise.all([
      supabaseAdmin.from('staff_members').select('*', { count: 'exact', head: true }).eq('restaurant_id', orgId).eq('is_active', true),
      supabaseAdmin.from('tables').select('*', { count: 'exact', head: true }).eq('restaurant_id', orgId).eq('is_active', true),
      supabaseAdmin.from('reservations').select('*', { count: 'exact', head: true }).eq('restaurant_id', orgId),
    ]);

    return {
      ...this.formatOrganization(data),
      counts: {
        staff: staffCount.count || 0,
        tables: tableCount.count || 0,
        totalReservations: reservationCount.count || 0,
      },
    };
  }

  /**
   * Update organization settings (super admin can edit any org).
   */
  async updateOrganization(orgId: string, updates: Record<string, any>, userId?: string) {
    const { data: before } = await supabaseAdmin
      .from('organizations')
      .select('*')
      .eq('id', orgId)
      .single();

    const { data, error } = await supabaseAdmin
      .from('organizations')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', orgId)
      .select()
      .single();

    if (error || !data) throw new NotFoundError('Organization');

    await auditService.log({
      restaurantId: orgId,
      userId,
      action: 'organization.updated_by_admin',
      entityType: 'organization',
      entityId: orgId,
      changes: { before, after: data },
    });

    return this.formatOrganization(data);
  }

  /**
   * Toggle organization active/inactive status.
   */
  async toggleOrganizationStatus(orgId: string, isActive: boolean, userId?: string) {
    const { data, error } = await supabaseAdmin
      .from('organizations')
      .update({ is_active: isActive, updated_at: new Date().toISOString() })
      .eq('id', orgId)
      .select()
      .single();

    if (error || !data) throw new NotFoundError('Organization');

    await auditService.log({
      userId,
      action: isActive ? 'organization.activated' : 'organization.deactivated',
      entityType: 'organization',
      entityId: orgId,
    });

    return this.formatOrganization(data);
  }

  /**
   * Platform-wide statistics.
   */
  async getPlatformStats() {
    const [orgCount, userCount, reservationCount, activeOrgCount] = await Promise.all([
      supabaseAdmin.from('organizations').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('staff_members').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('reservations').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('organizations').select('*', { count: 'exact', head: true }).eq('is_active', true),
    ]);

    // Top restaurants by reservation count
    const { data: topRestaurants } = await supabaseAdmin
      .from('organizations')
      .select('id, name, slug')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(10);

    return {
      totalRestaurants: orgCount.count || 0,
      activeRestaurants: activeOrgCount.count || 0,
      totalUsers: userCount.count || 0,
      totalReservations: reservationCount.count || 0,
      topRestaurants: topRestaurants || [],
    };
  }

  /**
   * List all platform users.
   */
  async listUsers(page = 1, limit = 20, search?: string) {
    const { offset } = parsePagination({ page, limit });

    let query = supabaseAdmin
      .from('staff_members')
      .select('*, organizations(id, name, slug)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (search) {
      const safe = sanitizeSearch(search);
      query = query.or(`name.ilike.%${safe}%,email.ilike.%${safe}%`);
    }

    const { data, error, count } = await query;
    if (error) throw new AppError('Failed to fetch users', 500);

    const users = (data || []).map((row: any) => ({
      id: row.id,
      userId: row.user_id,
      name: row.name,
      email: row.email,
      role: row.role,
      isActive: row.is_active,
      restaurant: row.organizations ? {
        id: row.organizations.id,
        name: row.organizations.name,
        slug: row.organizations.slug,
      } : null,
      lastActiveAt: row.last_active_at,
      createdAt: row.created_at,
    }));

    return {
      users,
      meta: buildPaginationMeta(page, limit, count || 0),
    };
  }

  /**
   * Get platform settings.
   */
  async getSettings() {
    const { data, error } = await supabaseAdmin
      .from('platform_settings')
      .select('*')
      .order('key', { ascending: true });

    if (error) throw new AppError('Failed to fetch settings', 500);

    const settings: Record<string, any> = {};
    for (const row of (data || [])) {
      settings[row.key] = row.value;
    }

    return settings;
  }

  /**
   * Update a platform setting.
   */
  async updateSetting(key: string, value: any, userId?: string) {
    const { data, error } = await supabaseAdmin
      .from('platform_settings')
      .upsert(
        {
          key,
          value,
          updated_by: userId || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'key' }
      )
      .select()
      .single();

    if (error) throw new AppError('Failed to update setting', 500);

    await auditService.log({
      userId,
      action: 'platform_settings.updated',
      entityType: 'platform_settings',
      changes: { key, value },
    });

    return data;
  }

  /**
   * Get audit log entries (platform-wide).
   */
  async getAuditLog(page = 1, limit = 50, filters?: Record<string, string>) {
    return auditService.query({
      restaurantId: filters?.restaurantId,
      entityType: filters?.entityType,
      action: filters?.action,
      userId: filters?.userId,
      page,
      limit,
    });
  }

  // ─── Subscription Details (Read-Only) ───────────────────

  /**
   * Get detailed subscription for a specific organization.
   */
  async getSubscriptionDetails(orgId: string) {
    const { data: org, error: orgError } = await supabaseAdmin
      .from('organizations')
      .select('id, name, slug, subscription_plan, subscription_status, stripe_customer_id')
      .eq('id', orgId)
      .single();

    if (orgError || !org) throw new NotFoundError('Organization');

    // Fetch the latest subscription record
    const { data: sub } = await supabaseAdmin
      .from('subscriptions')
      .select('*')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    return {
      organization: {
        id: org.id,
        name: org.name,
        slug: org.slug,
      },
      plan: org.subscription_plan || 'free',
      status: org.subscription_status || 'none',
      stripeCustomerId: org.stripe_customer_id || null,
      subscription: sub ? {
        id: sub.id,
        stripeSubscriptionId: sub.stripe_subscription_id,
        plan: sub.plan,
        status: sub.status,
        currentPeriodStart: sub.current_period_start,
        currentPeriodEnd: sub.current_period_end,
        cancelAtPeriodEnd: sub.cancel_at_period_end,
        createdAt: sub.created_at,
        updatedAt: sub.updated_at,
      } : null,
    };
  }

  // ─── Formatter ────────────────────────────────────────

  private formatOrganization(row: any) {
    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      ownerId: row.owner_id,
      logoUrl: row.logo_url,
      country: row.country,
      timezone: row.timezone,
      address: row.address,
      phone: row.phone,
      email: row.email,
      openingTime: row.opening_time,
      closingTime: row.closing_time,
      currency: row.currency,
      isActive: row.is_active,
      subscriptionPlan: row.subscription_plan || 'free',
      subscriptionStatus: row.subscription_status || 'none',
      setupCompleted: row.setup_completed,
      setupStep: row.setup_step,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

export const adminService = new AdminService();
