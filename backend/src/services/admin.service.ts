import { supabaseAdmin } from '../config/database';
import { AppError, NotFoundError, ConflictError } from '../middleware/errorHandler';
import { parsePagination, buildPaginationMeta } from '../utils/pagination';
import { sanitizeSearch } from '../utils/sanitize';
import { auditService } from './audit.service';
import { generateUniqueSlug } from '../utils/slug';
import { UserRole } from '../types/enums';

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
   * Manually create an organization + admin user with a preset plan, bypassing payment gateway.
   */
  async createOrganizationManually(dto: { email: string; password: string; ownerName: string; businessName: string; plan: string }, userId?: string) {
    const { data: existingUser } = await supabaseAdmin
      .from('staff_members')
      .select('id')
      .eq('email', dto.email)
      .single();

    if (existingUser) {
      throw new ConflictError('An account with this email already exists');
    }

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: dto.email,
      password: dto.password,
      email_confirm: true,
      user_metadata: {
        name: dto.ownerName,
        role: UserRole.RESTAURANT_ADMIN,
      },
    });

    if (authError || !authData.user) {
      throw new AppError(authError?.message || 'Failed to create user', 500);
    }

    const newUserId = authData.user.id;
    const slug = await generateUniqueSlug(dto.businessName);

    const { data: org, error: orgError } = await supabaseAdmin
      .from('organizations')
      .insert({
        name: dto.businessName,
        slug,
        owner_id: newUserId,
        subscription_plan: dto.plan,
        subscription_status: 'active',
        setup_completed: true,
      })
      .select()
      .single();

    if (orgError || !org) {
      await supabaseAdmin.auth.admin.deleteUser(newUserId);
      throw new AppError(orgError?.message || 'Failed to create organization', 500);
    }

    // Insert staff member
    await supabaseAdmin.from('staff_members').insert({
      user_id: newUserId,
      restaurant_id: org.id,
      role: 'admin',
      name: dto.ownerName,
      email: dto.email,
      accepted_at: new Date().toISOString(),
    });

    // Create a dummy subscription record to make it show up in subscriptions properly
    await supabaseAdmin.from('subscriptions').insert({
      organization_id: org.id,
      stripe_subscription_id: `manual_${Date.now()}`,
      stripe_customer_id: `manual_cus_${Date.now()}`,
      status: 'active',
      plan: dto.plan,
      current_period_start: new Date().toISOString(),
      current_period_end: new Date(Date.now() + 10 * 365 * 24 * 60 * 60 * 1000).toISOString(), // 10 years
      cancel_at_period_end: false,
    });

    await auditService.log({
      userId,
      action: 'organization.manual_created_bypass',
      entityType: 'organization',
      entityId: org.id,
      changes: { dto },
    });

    return this.formatOrganization(org);
  }

  /**
   * Platform-wide statistics.
   */
  async getPlatformStats() {
    const [orgCount, userCount, reservationCount, activeOrgCount, allOrgs] = await Promise.all([
      supabaseAdmin.from('organizations').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('staff_members').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('reservations').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('organizations').select('*', { count: 'exact', head: true }).eq('is_active', true),
      supabaseAdmin.from('organizations').select('subscription_plan, subscription_status')
    ]);

    // Top restaurants by reservation count
    const { data: topRestaurants } = await supabaseAdmin
      .from('organizations')
      .select('id, name, slug')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(10);

    // Financial calculations
    const starterPrice = 49;
    const proPrice = 79;
    
    let mrr = 0;
    let activeSubs = 0;
    let canceledSubs = 0;

    (allOrgs.data || []).forEach(org => {
      // MRR calculation based on active plans
      if (org.subscription_status === 'active' || org.subscription_status === 'trialing') {
        activeSubs++;
        if (org.subscription_plan === 'professional') mrr += proPrice;
        else if (org.subscription_plan === 'starter') mrr += starterPrice;
      }
      if (org.subscription_status === 'canceled') {
        canceledSubs++;
      }
    });

    const churnRate = (canceledSubs + activeSubs) > 0 
      ? ((canceledSubs / (canceledSubs + activeSubs)) * 100).toFixed(2) 
      : '0.00';
      
    const arpu = activeSubs > 0 
      ? (mrr / activeSubs).toFixed(2)
      : '0.00';

    return {
      totalRestaurants: orgCount.count || 0,
      activeRestaurants: activeOrgCount.count || 0,
      totalUsers: userCount.count || 0,
      totalReservations: reservationCount.count || 0,
      topRestaurants: topRestaurants || [],
      financials: {
        mrr,
        arpu: parseFloat(arpu),
        churnRate: parseFloat(churnRate)
      }
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
