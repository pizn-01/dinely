import { supabaseAdmin } from '../config/database';
import { AppError, NotFoundError } from '../middleware/errorHandler';
import { getTodayDate } from '../utils/time';
import { parsePagination, buildPaginationMeta } from '../utils/pagination';
import { sanitizeSearch } from '../utils/sanitize';

export class CustomerService {
  /**
   * Get customer profile by user ID (for logged-in customers).
   */
  async getProfileByUserId(userId: string) {
    const { data, error } = await supabaseAdmin
      .from('customers')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error || !data) throw new NotFoundError('Customer profile');
    return this.formatCustomer(data);
  }

  /**
   * Update customer profile.
   */
  async updateProfile(userId: string, dto: { firstName?: string; lastName?: string; phone?: string }) {
    const updateData: Record<string, any> = { updated_at: new Date().toISOString() };
    if (dto.firstName !== undefined) updateData.first_name = dto.firstName;
    if (dto.lastName !== undefined) updateData.last_name = dto.lastName;
    if (dto.phone !== undefined) updateData.phone = dto.phone;

    const { data, error } = await supabaseAdmin
      .from('customers')
      .update(updateData)
      .eq('user_id', userId)
      .select()
      .single();

    if (error || !data) throw new NotFoundError('Customer profile');
    return this.formatCustomer(data);
  }

  /**
   * Get a customer's upcoming reservations (across all restaurants).
   */
  async getUpcomingReservations(userId: string) {
    const today = getTodayDate();

    // Get the customer record from user_id
    const { data: customer } = await supabaseAdmin
      .from('customers')
      .select('id, email')
      .eq('user_id', userId)
      .single();

    if (!customer) return [];

    // Query by customer_id OR by guest_email (fallback for reservations
    // created via the public endpoint where customer_id may not be set)
    const { data, error } = await supabaseAdmin
      .from('reservations')
      .select('*, tables(id, table_number, name), organizations!inner(id, name, slug, address)')
      .or(`customer_id.eq.${customer.id},guest_email.eq.${customer.email}`)
      .gte('reservation_date', today)
      .not('status', 'in', '(cancelled,completed,no_show)')
      .order('reservation_date', { ascending: true })
      .order('start_time', { ascending: true })
      .limit(20);

    if (error) throw new AppError('Failed to fetch reservations', 500);

    // Deduplicate (in case both customer_id and guest_email matched the same row)
    const seen = new Set<string>();
    const unique = (data || []).filter(r => {
      if (seen.has(r.id)) return false;
      seen.add(r.id);
      return true;
    });

    return unique.map(this.formatCustomerReservation);
  }

  /**
   * Get a customer's past reservation history.
   */
  async getReservationHistory(userId: string, page = 1, limit = 10) {
    const today = getTodayDate();
    const { offset } = parsePagination({ page, limit });

    const { data: customer } = await supabaseAdmin
      .from('customers')
      .select('id, email')
      .eq('user_id', userId)
      .single();

    if (!customer) return { reservations: [], meta: buildPaginationMeta(page, limit, 0) };

    const { data, error, count } = await supabaseAdmin
      .from('reservations')
      .select('*, tables(id, table_number, name), organizations!inner(id, name, slug, address)', { count: 'exact' })
      .or(`customer_id.eq.${customer.id},guest_email.eq.${customer.email}`)
      .or(`status.in.(completed,cancelled,no_show),reservation_date.lt.${today}`)
      .order('reservation_date', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw new AppError('Failed to fetch history', 500);

    return {
      reservations: (data || []).map(this.formatCustomerReservation),
      meta: buildPaginationMeta(page, limit, count || 0),
    };
  }

  /**
   * Cancel a customer's own reservation.
   */
  async cancelOwnReservation(userId: string, reservationId: string) {
    const { data: customer } = await supabaseAdmin
      .from('customers')
      .select('id, email')
      .eq('user_id', userId)
      .single();

    if (!customer) throw new NotFoundError('Customer profile');

    // Match by customer_id OR guest_email to cover reservations made before signup
    const { data: reservation, error: fetchErr } = await supabaseAdmin
      .from('reservations')
      .select('id, status')
      .eq('id', reservationId)
      .or(`customer_id.eq.${customer.id},guest_email.eq.${customer.email}`)
      .single();

    if (fetchErr || !reservation) throw new NotFoundError('Reservation');

    if (['cancelled', 'completed', 'no_show'].includes(reservation.status)) {
      throw new AppError(`Cannot cancel a reservation with status '${reservation.status}'`, 400);
    }

    const { data, error } = await supabaseAdmin
      .from('reservations')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancellation_reason: 'Cancelled by customer',
        updated_at: new Date().toISOString(),
      })
      .eq('id', reservationId)
      .select('*, tables(id, table_number, name), organizations!inner(id, name, slug)')
      .single();

    if (error || !data) throw new AppError('Failed to cancel reservation', 500);
    return this.formatCustomerReservation(data);
  }

  /**
   * List customers for a restaurant (admin view).
   */
  async listForRestaurant(restaurantId: string, page = 1, limit = 20, search?: string) {
    const { offset } = parsePagination({ page, limit });

    let query = supabaseAdmin
      .from('customer_restaurant_link')
      .select(`
        *,
        customers!inner(id, first_name, last_name, email, phone, is_vip, total_visits, last_visit_at, created_at)
      `, { count: 'exact' })
      .eq('restaurant_id', restaurantId)
      .eq('is_blacklisted', false);

    if (search) {
      const safe = sanitizeSearch(search);
      query = query.or(
        `customers.first_name.ilike.%${safe}%,customers.last_name.ilike.%${safe}%,customers.email.ilike.%${safe}%`,
      );
    }

    query = query.order('last_visit_at', { ascending: false, nullsFirst: false })
      .range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) throw new AppError('Failed to fetch customers', 500);

    const customers = (data || []).map((link: any) => ({
      id: link.customers.id,
      firstName: link.customers.first_name,
      lastName: link.customers.last_name,
      email: link.customers.email,
      phone: link.customers.phone,
      isVip: link.customers.is_vip,
      totalVisits: link.total_visits,
      lastVisitAt: link.last_visit_at,
      notes: link.notes,
      createdAt: link.customers.created_at,
    }));

    return {
      customers,
      meta: buildPaginationMeta(page, limit, count || 0),
    };
  }

  // ─── Formatters ───────────────────────────────────────

  private formatCustomer(row: any) {
    return {
      id: row.id,
      userId: row.user_id,
      firstName: row.first_name,
      lastName: row.last_name,
      email: row.email,
      phone: row.phone,
      isVip: row.is_vip,
      totalVisits: row.total_visits,
      lastVisitAt: row.last_visit_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private formatCustomerReservation(row: any) {
    return {
      id: row.id,
      restaurant: row.organizations
        ? { id: row.organizations.id, name: row.organizations.name, slug: row.organizations.slug, address: row.organizations.address }
        : null,
      table: row.tables
        ? { id: row.tables.id, tableNumber: row.tables.table_number, name: row.tables.name }
        : null,
      reservationDate: row.reservation_date,
      startTime: row.start_time,
      endTime: row.end_time,
      partySize: row.party_size,
      status: row.status,
      specialRequests: row.special_requests,
      createdAt: row.created_at,
    };
  }
}

export const customerService = new CustomerService();
