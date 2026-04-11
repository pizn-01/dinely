import { supabaseAdmin } from '../config/database';
import { AppError, NotFoundError } from '../middleware/errorHandler';
import { CreateReservationDto, UpdateReservationDto, ReservationFilterQuery } from '../types/api.types';
import { ReservationStatus } from '../types/enums';
import { addMinutesToTime, timeRangesOverlap, getTodayDate } from '../utils/time';
import { parsePagination, buildPaginationMeta } from '../utils/pagination';
import { sanitizeSearch } from '../utils/sanitize';
import { emailService } from './email.service';

// Valid status transitions
const VALID_TRANSITIONS: Record<string, string[]> = {
  [ReservationStatus.PENDING]: [ReservationStatus.CONFIRMED, ReservationStatus.CANCELLED],
  [ReservationStatus.CONFIRMED]: [ReservationStatus.ARRIVING, ReservationStatus.SEATED, ReservationStatus.CANCELLED, ReservationStatus.NO_SHOW],
  [ReservationStatus.ARRIVING]: [ReservationStatus.SEATED, ReservationStatus.CANCELLED, ReservationStatus.NO_SHOW],
  [ReservationStatus.SEATED]: [ReservationStatus.COMPLETED],
  [ReservationStatus.COMPLETED]: [],
  [ReservationStatus.CANCELLED]: [],
  [ReservationStatus.NO_SHOW]: [],
};

export class ReservationService {
  /**
   * List reservations with filtering and pagination.
   */
  async list(restaurantId: string, filters: ReservationFilterQuery) {
    const { page, limit, offset } = parsePagination(filters);

    let query = supabaseAdmin
      .from('reservations')
      .select('*, tables(id, table_number, name, floor_areas(name))', { count: 'exact' })
      .eq('restaurant_id', restaurantId);

    // Apply filters
    if (filters.date) {
      query = query.eq('reservation_date', filters.date);
    }
    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    if (filters.tableId) {
      query = query.eq('table_id', filters.tableId);
    }
    if (filters.search) {
      const safe = sanitizeSearch(filters.search);
      query = query.or(
        `guest_first_name.ilike.%${safe}%,guest_last_name.ilike.%${safe}%,guest_email.ilike.%${safe}%`
      );
    }

    // Sorting - Default to date and time
    const sortBy = filters.sortBy || 'reservation_date';
    const sortOrder = filters.sortOrder === 'desc' ? false : true;
    
    if (sortBy === 'reservation_date') {
      query = query.order('reservation_date', { ascending: sortOrder })
                   .order('start_time', { ascending: true });
    } else {
      query = query.order(sortBy, { ascending: sortOrder });
    }

    // Pagination
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error('Supabase fetch reservations error:', error);
      throw new AppError('Failed to fetch reservations', 500);
    }

    return {
      reservations: (data || []).map(this.formatReservation.bind(this)),
      meta: buildPaginationMeta(page, limit, count || 0),
    };
  }

  /**
   * Get a single reservation by ID.
   */
  async getById(reservationId: string, restaurantId: string) {
    const { data, error } = await supabaseAdmin
      .from('reservations')
      .select('*, tables(id, table_number, name, floor_areas(name))')
      .eq('id', reservationId)
      .eq('restaurant_id', restaurantId)
      .single();

    if (error || !data) throw new NotFoundError('Reservation');
    return this.formatReservation(data);
  }

  /**
   * Create a new reservation.
   */
  async create(restaurantId: string, dto: CreateReservationDto, createdBy?: string) {
    // Get restaurant settings for default duration and booking window
    const { data: org } = await supabaseAdmin
      .from('organizations')
      .select('default_reservation_duration_min, max_party_size, min_advance_booking_hours, max_advance_booking_days')
      .eq('id', restaurantId)
      .single();

    const duration = org?.default_reservation_duration_min || 90;
    const maxParty = org?.max_party_size || 20;

    if (dto.partySize > maxParty) {
      throw new AppError(`Party size cannot exceed ${maxParty}`, 400);
    }

    // Enforce booking window — only for public/customer bookings.
    // Staff-created reservations (walk-ins, POS, phone) bypass these rules.
    const isStaffCreated = !!createdBy;
    const minAdvanceHours = org?.min_advance_booking_hours || 0;
    const maxAdvanceDays = org?.max_advance_booking_days || 365;
    const now = new Date();
    const reservationDateTime = new Date(`${dto.reservationDate}T${dto.startTime}:00`);
    const hoursUntilReservation = (reservationDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (!isStaffCreated && hoursUntilReservation < minAdvanceHours) {
      throw new AppError(
        `Reservations must be made at least ${minAdvanceHours} hour(s) in advance`,
        400
      );
    }

    const daysUntilReservation = hoursUntilReservation / 24;
    if (!isStaffCreated && daysUntilReservation > maxAdvanceDays) {
      throw new AppError(
        `Reservations cannot be made more than ${maxAdvanceDays} day(s) in advance`,
        400
      );
    }

    const endTime = dto.endTime || addMinutesToTime(dto.startTime, duration);

    // Create or find customer
    let customerId: string | null = null;
    let isPremium = false;
    
    if (dto.guestEmail) {
      const { data: existingCustomer } = await supabaseAdmin
        .from('customers')
        .select('id, is_vip')
        .eq('email', dto.guestEmail)
        .single();

      if (existingCustomer) {
        customerId = existingCustomer.id;
        isPremium = existingCustomer.is_vip;
      } else {
        const { data: newCustomer } = await supabaseAdmin
          .from('customers')
          .insert({
            first_name: dto.guestFirstName,
            last_name: dto.guestLastName || null,
            email: dto.guestEmail,
            phone: dto.guestPhone || null,
          })
          .select()
          .single();

        if (newCustomer) customerId = newCustomer.id;
      }
    }

    // Use SQL RPC to securely lock table row and insert atomically
    const { data: rpcData, error } = await supabaseAdmin.rpc('create_reservation_atomic', {
      p_restaurant_id: restaurantId,
      p_table_id: dto.tableId || null,
      p_customer_id: customerId,
      p_reservation_date: dto.reservationDate,
      p_start_time: dto.startTime,
      p_end_time: endTime,
      p_party_size: dto.partySize,
      p_guest_first_name: dto.guestFirstName,
      p_guest_last_name: dto.guestLastName || null,
      p_guest_email: dto.guestEmail,
      p_guest_phone: dto.guestPhone || null,
      p_source: dto.source || 'app',
      p_special_requests: dto.specialRequests || null,
      p_created_by: createdBy || null,
      p_is_premium: isPremium
    });

    if (error) {
      if (error.message.includes('Table is no longer available')) {
        throw new AppError('Table is no longer available for this time slot (booked by another user)', 409);
      }
      throw new AppError(`Failed to create reservation: ${error.message}`, 500);
    }
    
    // Fetch the newly created reservation with relation data
    const { data: createdRes, error: fetchErr } = await supabaseAdmin
      .from('reservations')
      .select('*, tables(id, table_number, name, floor_areas(name))')
      .eq('id', rpcData.id)
      .single();

    if (fetchErr) throw new AppError(`Failed to fetch created reservation: ${fetchErr.message}`, 500);

    // Update customer visit link
    if (customerId) {
      await supabaseAdmin.from('customer_restaurant_link').upsert(
        {
          customer_id: customerId,
          restaurant_id: restaurantId,
        },
        { onConflict: 'customer_id,restaurant_id' }
      );
    }

    // Send confirmation email (fire-and-forget)
    const guestEmail = dto.guestEmail || createdRes.guest_email;
    if (guestEmail) {
      try {
        // Get restaurant name, phone and cancellation policy for the email
        const { data: orgData } = await supabaseAdmin
          .from('organizations')
          .select('name, phone, cancellation_policy')
          .eq('id', restaurantId)
          .single();

        await emailService.sendReservationConfirmation({
          to: guestEmail,
          guestName: `${dto.guestFirstName || ''} ${dto.guestLastName || ''}`.trim() || 'Guest',
          restaurantName: orgData?.name || 'Restaurant',
          date: dto.reservationDate,
          time: dto.startTime,
          partySize: dto.partySize,
          confirmationId: rpcData.id,
          tableName: createdRes.tables?.name || createdRes.tables?.table_number || undefined,
          restaurantPhone: orgData?.phone || undefined,
          cancellationPolicy: orgData?.cancellation_policy || undefined,
        });
      } catch (emailErr: any) {
        console.error('[ReservationService] Confirmation email failed:', emailErr.message);
      }
    }

    return this.formatReservation(createdRes);
  }

  /**
   * Update a reservation with conflict detection.
   * If table_id, date, or time is being changed, we check for conflicts first.
   */
  async update(reservationId: string, restaurantId: string, dto: UpdateReservationDto) {
    // 1. Rely on atomic DB-level locking via an RPC instead of JS memory checks
    // This assumes you create a matching 'update_reservation_atomic' Postgres function
    const { data: rpcData, error } = await supabaseAdmin.rpc('update_reservation_atomic', {
      p_reservation_id: reservationId,
      p_restaurant_id: restaurantId,
      p_table_id: dto.tableId ?? null,
      p_reservation_date: dto.reservationDate ?? null,
      p_start_time: dto.startTime ?? null,
      p_end_time: dto.endTime ?? null,
      p_party_size: dto.partySize ?? null,
      p_guest_first_name: dto.guestFirstName ?? null,
      p_guest_last_name: dto.guestLastName ?? null,
      p_guest_email: dto.guestEmail ?? null,
      p_guest_phone: dto.guestPhone ?? null,
      p_special_requests: dto.specialRequests ?? null,
      p_internal_notes: dto.internalNotes ?? null
    });

    if (error) {
      if (error.message.includes('overlap') || error.message.includes('booked')) {
        throw new AppError('Table is already booked for the selected time slot. Please choose a different time or table.', 409);
      }
      throw new AppError(`Failed to update reservation: ${error.message}`, 500);
    }

    // 2. Fetch the newly structured reservation payload for the response
    const { data: updatedRes, error: fetchErr } = await supabaseAdmin
      .from('reservations')
      .select('*, tables(id, table_number, name, floor_areas(name))')
      .eq('id', reservationId)
      .eq('restaurant_id', restaurantId)
      .single();

    if (fetchErr || !updatedRes) throw new NotFoundError('Reservation');
    return this.formatReservation(updatedRes);
  }

  /**
   * Update reservation status.
   */
  async updateStatus(
    reservationId: string,
    restaurantId: string,
    newStatus: ReservationStatus,
    userId?: string,
    reason?: string
  ) {
    // Try the atomic RPC first, fall back to direct update if RPC is missing/broken
    let rpcSuccess = false;
    try {
      const { data: rpcData, error } = await supabaseAdmin.rpc('update_reservation_status_atomic', {
        p_reservation_id: reservationId,
        p_restaurant_id: restaurantId,
        p_new_status: newStatus,
        p_user_id: userId ?? null,
        p_reason: reason ?? null
      });

      if (error) {
        // If it's a transition error from the RPC, throw immediately
        if (error.message.includes('transition')) {
          throw new AppError(error.message, 400);
        }
        // Otherwise fall through to the fallback
        console.warn('[ReservationService] RPC failed, using fallback:', error.message);
      } else {
        rpcSuccess = true;
      }
    } catch (err: any) {
      if (err instanceof AppError) throw err;
      console.warn('[ReservationService] RPC unavailable, using fallback:', err.message);
    }

    // ─── Fallback: Direct update with validation ─────────────
    if (!rpcSuccess) {
      // 1. Fetch current reservation to validate transition
      const { data: current, error: fetchErr } = await supabaseAdmin
        .from('reservations')
        .select('id, status')
        .eq('id', reservationId)
        .eq('restaurant_id', restaurantId)
        .single();

      if (fetchErr || !current) throw new NotFoundError('Reservation');

      // 2. Validate state transition
      const allowed = VALID_TRANSITIONS[current.status] || [];
      if (!allowed.includes(newStatus)) {
        throw new AppError(
          `Cannot transition from '${current.status}' to '${newStatus}'`,
          400
        );
      }

      // 3. Build update payload
      const updatePayload: Record<string, any> = {
        status: newStatus,
        updated_at: new Date().toISOString(),
      };

      if (newStatus === ReservationStatus.ARRIVING) {
        // no special timestamp column for arriving
      } else if (newStatus === ReservationStatus.SEATED) {
        updatePayload.seated_at = new Date().toISOString();
      } else if (newStatus === ReservationStatus.COMPLETED) {
        updatePayload.completed_at = new Date().toISOString();
      } else if (newStatus === ReservationStatus.CANCELLED) {
        updatePayload.cancelled_at = new Date().toISOString();
        if (reason) updatePayload.cancellation_reason = reason;
      }
      // no_show has no special column

      // 4. Perform the update
      const { error: updateErr } = await supabaseAdmin
        .from('reservations')
        .update(updatePayload)
        .eq('id', reservationId)
        .eq('restaurant_id', restaurantId);

      if (updateErr) {
        throw new AppError('Failed to update status', 500);
      }
    }

    // Fetch the detailed payload for frontend format and email side-effects
    const { data, error: fetchError } = await supabaseAdmin
      .from('reservations')
      .select('*, tables(id, table_number, name, floor_areas(name))')
      .eq('id', reservationId)
      .eq('restaurant_id', restaurantId)
      .single();

    if (fetchError || !data) throw new NotFoundError('Reservation');

    if (newStatus === ReservationStatus.COMPLETED && data.customer_id) {
      await supabaseAdmin.rpc('increment_customer_visits', {
        p_customer_id: data.customer_id,
        p_restaurant_id: restaurantId,
      });
    }

    // Send cancellation email when status changes to cancelled
    if (newStatus === ReservationStatus.CANCELLED && data.guest_email) {
      try {
        const { data: orgData } = await supabaseAdmin
          .from('organizations')
          .select('name')
          .eq('id', restaurantId)
          .single();

        await emailService.sendReservationCancellation({
          to: data.guest_email,
          guestName: `${data.guest_first_name || ''} ${data.guest_last_name || ''}`.trim() || 'Guest',
          restaurantName: orgData?.name || 'Restaurant',
          date: data.reservation_date,
          time: data.start_time,
          reason: reason || undefined,
        });
      } catch (emailErr: any) {
        console.error('[ReservationService] Cancellation email failed:', emailErr.message);
      }
    }

    return this.formatReservation(data);
  }

  /**
   * Cancel a reservation.
   */
  async cancel(reservationId: string, restaurantId: string, userId?: string, reason?: string) {
    return this.updateStatus(reservationId, restaurantId, ReservationStatus.CANCELLED, userId, reason);
  }

  /**
   * Get calendar view data.
   */
  async getCalendarView(restaurantId: string, date: string) {
    const { data: reservations, error } = await supabaseAdmin
      .from('reservations')
      .select('*, tables(id, table_number, name, capacity, floor_areas(name))')
      .eq('restaurant_id', restaurantId)
      .eq('reservation_date', date)
      .neq('status', 'cancelled')
      .order('start_time', { ascending: true });

    if (error) throw new AppError('Failed to fetch calendar data', 500);

    const { data: tables } = await supabaseAdmin
      .from('tables')
      .select('*, floor_areas(id, name)')
      .eq('restaurant_id', restaurantId)
      .eq('is_active', true)
      .order('table_number', { ascending: true });

    const tableMap: Record<string, any[]> = {};
    for (const table of (tables || [])) {
      tableMap[table.id] = [];
    }

    for (const res of (reservations || [])) {
      if (res.table_id && tableMap[res.table_id]) {
        tableMap[res.table_id].push(this.formatReservation(res));
      }
    }

    const areaMap: Record<string, any[]> = {};
    for (const table of (tables || [])) {
      const areaName = table.floor_areas?.name || 'Unassigned';
      if (!areaMap[areaName]) areaMap[areaName] = [];
      areaMap[areaName].push({
        id: table.id,
        tableNumber: table.table_number,
        name: table.name,
        capacity: table.capacity,
        reservations: tableMap[table.id] || [],
      });
    }

    return {
      date,
      sections: Object.entries(areaMap).map(([area, tables]) => ({ area, tables })),
      totalReservations: (reservations || []).length,
    };
  }

  /**
   * Check table availability.
   */
  async checkTableAvailability(tableId: string, date: string, startTime: string, endTime: string): Promise<boolean> {
    const { data: conflicts } = await supabaseAdmin
      .from('reservations')
      .select('id, start_time, end_time')
      .eq('table_id', tableId)
      .eq('reservation_date', date)
      .not('status', 'in', `(${ReservationStatus.CANCELLED},${ReservationStatus.NO_SHOW})`);

    if (!conflicts || conflicts.length === 0) return true;

    for (const conflict of conflicts) {
      if (timeRangesOverlap(startTime, endTime, conflict.start_time, conflict.end_time)) {
        return false;
      }
    }
    return true;
  }

  /**
   * Get available tables.
   */
  async getAvailableTables(restaurantId: string, date: string, startTime: string, partySize: number) {
    const { data: org } = await supabaseAdmin
      .from('organizations')
      .select('default_reservation_duration_min')
      .eq('id', restaurantId)
      .single();

    const duration = org?.default_reservation_duration_min || 90;
    const endTime = addMinutesToTime(startTime, duration);

    const { data: tables } = await supabaseAdmin
      .from('tables')
      .select('*, floor_areas(id, name)')
      .eq('restaurant_id', restaurantId)
      .eq('is_active', true)
      .gte('capacity', partySize)
      .order('capacity', { ascending: true });

    if (!tables || tables.length === 0) return [];

    const available = [];
    for (const table of tables) {
      if (await this.checkTableAvailability(table.id, date, startTime, endTime)) {
        available.push({
          id: table.id,
          tableNumber: table.table_number,
          name: table.name,
          capacity: table.capacity,
          area: table.floor_areas ? { id: table.floor_areas.id, name: table.floor_areas.name } : null,
          type: table.type,
          shape: table.shape,
          isPremium: table.is_premium || false,
          premiumPrice: table.premium_price || 0,
        });
      }
    }
    return available;
  }

  /**
   * Get available time slots.
   */
  async getAvailableTimeSlots(restaurantId: string, date: string, partySize: number) {
    const { data: org } = await supabaseAdmin
      .from('organizations')
      .select('opening_time, closing_time')
      .eq('id', restaurantId)
      .single();

    if (!org || !org.opening_time || !org.closing_time) return { allSlots: [], availableSlots: [] };

    const startH = parseInt(org.opening_time.split(':')[0], 10);
    const startM = parseInt(org.opening_time.split(':')[1], 10);
    const endH = parseInt(org.closing_time.split(':')[0], 10);
    const endM = parseInt(org.closing_time.split(':')[1], 10);

    const baseDate = new Date('2000-01-01T00:00:00Z');
    const startTimeTime = new Date(baseDate); startTimeTime.setUTCHours(startH, startM);
    const endTimeTime = new Date(baseDate); endTimeTime.setUTCHours(endH, endM);
    if (endTimeTime < startTimeTime) endTimeTime.setUTCDate(endTimeTime.getUTCDate() + 1);

    const allSlots: string[] = [];
    const availableSlots: string[] = [];
    const current = new Date(startTimeTime);
    
    while (current <= endTimeTime) {
      const h = current.getUTCHours().toString().padStart(2, '0');
      const m = current.getUTCMinutes().toString().padStart(2, '0');
      allSlots.push(`${h}:${m}`);
      current.setUTCMinutes(current.getUTCMinutes() + 30);
    }

    // Batch optimization: fetch ALL active reservations for this date in one query
    // instead of N+1 individual queries per time slot
    const { data: allTables } = await supabaseAdmin
      .from('tables')
      .select('id, capacity')
      .eq('restaurant_id', restaurantId)
      .eq('is_active', true)
      .gte('capacity', partySize);

    if (!allTables || allTables.length === 0) {
      return { allSlots, availableSlots };
    }

    // Get org duration for end-time calculation
    const { data: orgDuration } = await supabaseAdmin
      .from('organizations')
      .select('default_reservation_duration_min')
      .eq('id', restaurantId)
      .single();
    const duration = orgDuration?.default_reservation_duration_min || 90;

    // Fetch all reservations for this date in a single query
    const { data: dayReservations } = await supabaseAdmin
      .from('reservations')
      .select('table_id, start_time, end_time')
      .eq('restaurant_id', restaurantId)
      .eq('reservation_date', date)
      .not('status', 'in', `(${ReservationStatus.CANCELLED},${ReservationStatus.NO_SHOW})`);

    const reservations = dayReservations || [];

    // Check each slot in-memory
    for (const slot of allSlots) {
      const slotEnd = addMinutesToTime(slot, duration);
      // Check if at least one table has no conflicting reservation
      const hasAvailable = allTables.some(table => {
        return !reservations.some(
          r => r.table_id === table.id && timeRangesOverlap(slot, slotEnd, r.start_time, r.end_time)
        );
      });
      if (hasAvailable) availableSlots.push(slot);
    }

    return { allSlots, availableSlots };
  }

  /**
   * Export reservations as CSV.
   */
  async exportCsv(restaurantId: string, startDate?: string, endDate?: string): Promise<string> {
    let query = supabaseAdmin
      .from('reservations')
      .select('*, tables(table_number, name)')
      .eq('restaurant_id', restaurantId)
      .order('reservation_date', { ascending: false })
      .order('start_time', { ascending: true });

    if (startDate) query = query.gte('reservation_date', startDate);
    if (endDate) query = query.lte('reservation_date', endDate);

    const { data, error } = await query;
    if (error) throw new AppError('Failed to export reservations', 500);

    const headers = ['Date', 'Start Time', 'End Time', 'Party Size', 'Guest Name', 'Email', 'Phone', 'Table', 'Status', 'Source', 'Special Requests', 'Payment Status', 'Created At'];
    const rows = (data || []).map((r: any) => [
      r.reservation_date, r.start_time, r.end_time, r.party_size,
      `${r.guest_first_name || ''} ${r.guest_last_name || ''}`.trim(),
      r.guest_email || '', r.guest_phone || '', r.tables?.name || r.tables?.table_number || '',
      r.status, r.source, (r.special_requests || '').replace(/"/g, '""'), r.payment_status || 'none', r.created_at,
    ]);

    return [headers.join(','), ...rows.map(row => row.map(v => `"${v}"`).join(','))].join('\n');
  }

  // ─── Formatter ────────────────────────────────────────

  private formatReservation(row: any) {
    // Ensure reservationDate is always YYYY-MM-DD string
    let reservationDate = row.reservation_date;
    if (reservationDate instanceof Date) {
      reservationDate = reservationDate.toISOString().split('T')[0];
    } else if (typeof reservationDate === 'string' && reservationDate.includes('T')) {
      reservationDate = reservationDate.split('T')[0];
    }

    return {
      id: row.id,
      restaurantId: row.restaurant_id,
      reservationDate,
      startTime: row.start_time,
      endTime: row.end_time,
      partySize: row.party_size,
      guestFirstName: row.guest_first_name,
      guestLastName: row.guest_last_name,
      guestEmail: row.guest_email,
      guestPhone: row.guest_phone,
      status: row.status,
      source: row.source,
      specialRequests: row.special_requests,
      internalNotes: row.internal_notes,
      paymentMethod: row.payment_method,
      paymentStatus: row.payment_status,
      confirmedAt: row.confirmed_at,
      seatedAt: row.seated_at,
      completedAt: row.completed_at,
      cancelledAt: row.cancelled_at,
      cancellationReason: row.cancellation_reason,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      table: row.tables
        ? {
            id: row.tables.id,
            tableNumber: row.tables.table_number,
            name: row.tables.name,
            area: row.tables.floor_areas?.name || null,
          }
        : null,
    };
  }
}

export const reservationService = new ReservationService();
