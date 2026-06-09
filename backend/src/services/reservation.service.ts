import { supabaseAdmin } from '../config/database';
import { AppError, NotFoundError } from '../middleware/errorHandler';
import { CreateReservationDto, UpdateReservationDto, ReservationFilterQuery } from '../types/api.types';
import { ReservationStatus } from '../types/enums';
import { addMinutesToTime, timeRangesOverlap, getTodayDate } from '../utils/time';
import { parsePagination, buildPaginationMeta } from '../utils/pagination';
import { sanitizeSearch } from '../utils/sanitize';
import { buildLayoutTableRows } from '../utils/tableMergeLayout';
import { emailService } from './email.service';
import { tableService } from './table.service';
import { getPlanLimits, hasUnlimitedReservations } from '../config/planLimits';

// Valid status transitions
const VALID_TRANSITIONS: Record<string, string[]> = {
  [ReservationStatus.PENDING]: [ReservationStatus.CONFIRMED, ReservationStatus.CANCELLED],
  [ReservationStatus.CONFIRMED]: [ReservationStatus.ARRIVING, ReservationStatus.SEATED, ReservationStatus.CANCELLED, ReservationStatus.NO_SHOW],
  [ReservationStatus.ARRIVING]: [ReservationStatus.SEATED, ReservationStatus.CANCELLED, ReservationStatus.NO_SHOW, ReservationStatus.CONFIRMED],
  [ReservationStatus.SEATED]: [ReservationStatus.COMPLETED],
  [ReservationStatus.COMPLETED]: [],
  [ReservationStatus.CANCELLED]: [],
  [ReservationStatus.NO_SHOW]: [],
};

type AvailableTableRow = {
  id: string;
  table_number?: string | null;
  name?: string | null;
  capacity?: number | null;
  min_capacity?: number | null;
  area_id?: string | null;
  position_x?: number | null;
  position_y?: number | null;
  type?: string | null;
  shape?: string | null;
  is_premium?: boolean | null;
  premium_price?: number | null;
  is_mergeable?: boolean | null;
  is_merged?: boolean | null;
  merged_table_ids?: string[] | null;
  floor_areas?: { id: string; name: string } | null;
};

export class ReservationService {
  private tableDisplayName(table: AvailableTableRow) {
    return table.name || table.table_number || `Table ${table.id.slice(0, 8)}`;
  }

  private formatAvailableTable(table: AvailableTableRow) {
    return {
      id: table.id,
      tableNumber: table.table_number,
      name: table.name,
      capacity: table.capacity,
      minCapacity: table.min_capacity,
      area: table.floor_areas ? { id: table.floor_areas.id, name: table.floor_areas.name } : null,
      type: table.type,
      shape: table.shape,
      positionX: table.position_x,
      positionY: table.position_y,
      isPremium: table.is_premium || false,
      premiumPrice: table.premium_price || 0,
      isMergeable: table.is_mergeable || false,
      isMerged: table.is_merged || false,
    };
  }

  private relatedTableIdsForConflict(tableId: string, tableRows?: AvailableTableRow[]) {
    const related = new Set<string>([tableId]);
    if (!tableRows?.length) return related;

    for (const row of tableRows) {
      const childIds = row.is_merged && Array.isArray(row.merged_table_ids)
        ? row.merged_table_ids
        : [];

      if (!childIds.length) continue;

      if (row.id === tableId) {
        childIds.forEach((id) => related.add(id));
      } else if (childIds.includes(tableId)) {
        related.add(row.id);
      }
    }

    return related;
  }

  private isTableFreeForReservations(
    tableId: string,
    reservations: any[],
    startTime: string,
    endTime: string,
    tableRows?: AvailableTableRow[]
  ) {
    const relatedTableIds = this.relatedTableIdsForConflict(tableId, tableRows);
    return !reservations.some(
      (r) => r.table_id && relatedTableIds.has(r.table_id) && timeRangesOverlap(startTime, endTime, r.start_time, r.end_time)
    );
  }

  private async ensureTableFreeForReservation(
    restaurantId: string,
    tableId: string,
    date: string,
    startTime: string,
    endTime: string
  ) {
    const { data: tableRows } = await supabaseAdmin
      .from('tables')
      .select('id, is_merged, merged_table_ids')
      .eq('restaurant_id', restaurantId)
      .or('is_active.eq.true,is_merged.eq.true');

    const relatedTableIds = Array.from(this.relatedTableIdsForConflict(tableId, tableRows || []));

    const { data: reservations } = await supabaseAdmin
      .from('reservations')
      .select('table_id, start_time, end_time, status')
      .eq('restaurant_id', restaurantId)
      .eq('reservation_date', date)
      .in('table_id', relatedTableIds)
      .not('status', 'in', `(${ReservationStatus.CANCELLED},${ReservationStatus.NO_SHOW},${ReservationStatus.COMPLETED})`);

    if (!this.isTableFreeForReservations(tableId, reservations || [], startTime, endTime, tableRows || [])) {
      throw new AppError('Table is no longer available for this time slot (booked by another user)', 409);
    }
  }

  private bestCombination(tables: AvailableTableRow[], partySize: number): AvailableTableRow[] | null {
    const usable = tables
      .filter((t) => (Number(t.capacity) || 0) > 0)
      .sort((a, b) => (Number(b.capacity) || 0) - (Number(a.capacity) || 0));

    const maxCap = Math.max(0, ...usable.map((t) => Number(t.capacity) || 0));
    const capLimit = partySize + maxCap;
    const states = new Map<number, AvailableTableRow[]>();
    states.set(0, []);

    const isBetter = (next: AvailableTableRow[], current?: AvailableTableRow[]) => {
      if (!current) return true;
      const nextCap = next.reduce((sum, t) => sum + (Number(t.capacity) || 0), 0);
      const currentCap = current.reduce((sum, t) => sum + (Number(t.capacity) || 0), 0);
      if (next.length !== current.length) return next.length < current.length;
      return nextCap < currentCap;
    };

    for (const table of usable) {
      const snapshot = Array.from(states.entries());
      for (const [cap, selected] of snapshot) {
        if (selected.length >= 12) continue;
        const next = [...selected, table];
        const nextCap = Math.min(cap + (Number(table.capacity) || 0), capLimit);
        if (isBetter(next, states.get(nextCap))) states.set(nextCap, next);
      }
    }

    let best: AvailableTableRow[] | null = null;
    for (const [cap, selected] of states.entries()) {
      if (cap < partySize || selected.length < 2) continue;
      if (isBetter(selected, best || undefined)) best = selected;
    }
    return best;
  }

  private findAutoMergeOption(tables: AvailableTableRow[], partySize: number) {
    const standardTables = tables.filter((t) => t.is_mergeable === true && !t.is_premium && !t.is_merged);
    const byArea = new Map<string, AvailableTableRow[]>();

    for (const table of standardTables) {
      const areaKey = table.area_id || table.floor_areas?.id || 'unassigned';
      byArea.set(areaKey, [...(byArea.get(areaKey) || []), table]);
    }

    let adjacent: AvailableTableRow[] | null = null;
    for (const areaTables of byArea.values()) {
      const combo = this.bestAdjacentCombination(areaTables, partySize);
      if (!combo) continue;
      if (!adjacent || this.adjacentScore(combo, partySize) < this.adjacentScore(adjacent, partySize)) {
        adjacent = combo;
      }
    }

    if (adjacent && this.tablesAreVisuallyConnected(adjacent)) {
      return this.formatAutoMergeOption(adjacent, partySize, false);
    }

    const fallback = this.bestCombination(standardTables, partySize);
    return fallback ? this.formatAutoMergeOption(fallback, partySize, true) : null;
  }

  private bestAdjacentCombination(tables: AvailableTableRow[], partySize: number): AvailableTableRow[] | null {
    const positioned = tables.filter((t) => t.position_x != null && t.position_y != null);
    if (positioned.length < 2) return this.bestCombination(tables, partySize);

    let best: AvailableTableRow[] | null = null;
    for (const seed of positioned) {
      const cluster = positioned
        .filter((t) => t.id !== seed.id)
        .sort((a, b) => this.distance(seed, a) - this.distance(seed, b));

      const selected = [seed];
      let capacity = Number(seed.capacity) || 0;
      for (const table of cluster) {
        if (capacity >= partySize) break;
        selected.push(table);
        capacity += Number(table.capacity) || 0;
      }
      if (capacity < partySize) continue;
      if (!best || this.adjacentScore(selected, partySize) < this.adjacentScore(best, partySize)) {
        best = selected;
      }
    }

    return best || this.bestCombination(tables, partySize);
  }

  private distance(a: AvailableTableRow, b: AvailableTableRow) {
    const dx = Number(a.position_x || 0) - Number(b.position_x || 0);
    const dy = Number(a.position_y || 0) - Number(b.position_y || 0);
    return Math.sqrt(dx * dx + dy * dy);
  }

  private tableSize(table: AvailableTableRow) {
    const shape = String(table.shape || 'rectangle').toLowerCase();
    if (shape === 'circle' || shape === 'round' || shape === 'square') return { width: 80, height: 80 };
    return { width: String(table.type || '').toLowerCase().includes('vip') ? 140 : 120, height: 80 };
  }

  private tablesAreVisuallyConnected(tables: AvailableTableRow[]) {
    if (tables.length < 2) return true;
    if (tables.some((t) => t.position_x == null || t.position_y == null)) return false;

    const linked = new Set<string>([tables[0].id]);
    let changed = true;
    while (changed) {
      changed = false;
      for (const a of tables) {
        if (!linked.has(a.id)) continue;
        for (const b of tables) {
          if (linked.has(b.id)) continue;
          if (this.tablesAreNearEnoughToMerge(a, b)) {
            linked.add(b.id);
            changed = true;
          }
        }
      }
    }
    return linked.size === tables.length;
  }

  private tablesAreNearEnoughToMerge(a: AvailableTableRow, b: AvailableTableRow) {
    const aSize = this.tableSize(a);
    const bSize = this.tableSize(b);
    const aLeft = Number(a.position_x);
    const aTop = Number(a.position_y);
    const bLeft = Number(b.position_x);
    const bTop = Number(b.position_y);
    const aRight = aLeft + aSize.width;
    const aBottom = aTop + aSize.height;
    const bRight = bLeft + bSize.width;
    const bBottom = bTop + bSize.height;

    const gapX = Math.max(0, Math.max(aLeft, bLeft) - Math.min(aRight, bRight));
    const gapY = Math.max(0, Math.max(aTop, bTop) - Math.min(aBottom, bBottom));
    const overlapX = Math.max(0, Math.min(aRight, bRight) - Math.max(aLeft, bLeft));
    const overlapY = Math.max(0, Math.min(aBottom, bBottom) - Math.max(aTop, bTop));
    const nearGap = 40;

    return (
      (gapX <= nearGap && overlapY >= Math.min(aSize.height, bSize.height) * 0.35) ||
      (gapY <= nearGap && overlapX >= Math.min(aSize.width, bSize.width) * 0.35)
    );
  }

  private adjacentScore(tables: AvailableTableRow[], partySize: number) {
    const cap = tables.reduce((sum, t) => sum + (Number(t.capacity) || 0), 0);
    const xs = tables.map((t) => Number(t.position_x || 0));
    const ys = tables.map((t) => Number(t.position_y || 0));
    const spread = (Math.max(...xs) - Math.min(...xs)) + (Math.max(...ys) - Math.min(...ys));
    return tables.length * 1000000 + Math.max(0, cap - partySize) * 10000 + spread;
  }

  private bestCombinationScore(tables: AvailableTableRow[], partySize: number) {
    const cap = tables.reduce((sum, t) => sum + (Number(t.capacity) || 0), 0);
    return tables.length * 10000 + Math.max(0, cap - partySize);
  }

  private formatAutoMergeOption(tables: AvailableTableRow[], partySize: number, requiresStaffReview: boolean) {
    const capacity = tables.reduce((sum, t) => sum + (Number(t.capacity) || 0), 0);
    const premiumPrice = tables.reduce((sum, t) => sum + (Number(t.premium_price) || 0), 0);
    const names = tables.map((t) => this.tableDisplayName(t));
    const sameArea = tables.every((t) => (t.area_id || t.floor_areas?.id || null) === (tables[0].area_id || tables[0].floor_areas?.id || null));

    return {
      id: `auto-merge:${tables.map((t) => t.id).join(',')}`,
      tableNumber: 'AUTO',
      name: `Combined ${names.join(' + ')}`,
      capacity,
      area: sameArea && tables[0].floor_areas ? { id: tables[0].floor_areas.id, name: tables[0].floor_areas.name } : null,
      type: requiresStaffReview ? 'staff_review_required' : null,
      shape: 'rectangle',
      isPremium: tables.some((t) => t.is_premium),
      premiumPrice,
      isMergeable: true,
      isAutoMerge: true,
      autoMergeTableIds: tables.map((t) => t.id),
      sourceTableNames: names,
      requiresStaffReview,
      staffReviewReason: requiresStaffReview
        ? 'The assigned tables are not adjacent on the floor map. Staff should review the seating layout before arrival.'
        : null,
      requestedPartySize: partySize,
    };
  }

  private sameIdSet(a: string[], b: string[]) {
    if (a.length !== b.length) return false;
    const left = [...a].sort();
    const right = [...b].sort();
    return left.every((id, idx) => id === right[idx]);
  }

  private async getStaffSelectedMergeOption(
    restaurantId: string,
    date: string,
    startTime: string,
    endTime: string,
    duration: number,
    partySize: number,
    sourceIds: string[]
  ) {
    const uniqueIds = Array.from(new Set(sourceIds));
    if (uniqueIds.length !== sourceIds.length || uniqueIds.length < 2) return null;

    const { data: dayReservations } = await supabaseAdmin
      .from('reservations')
      .select('table_id, start_time, end_time, status')
      .eq('restaurant_id', restaurantId)
      .eq('reservation_date', date)
      .not('status', 'in', `(${ReservationStatus.CANCELLED},${ReservationStatus.NO_SHOW},${ReservationStatus.COMPLETED})`);
    const reservations = dayReservations || [];

    const { data: tableRows } = await supabaseAdmin
      .from('tables')
      .select('*, floor_areas(id, name)')
      .eq('restaurant_id', restaurantId)
      .or('is_active.eq.true,is_merged.eq.true');

    const laidOutTables = buildLayoutTableRows(tableRows || [], date, {
      layoutTime: startTime,
      reservations,
      defaultDurationMins: duration,
    }) as AvailableTableRow[];

    const selectedTables = laidOutTables.filter((table) => uniqueIds.includes(table.id));
    if (selectedTables.length !== uniqueIds.length) return null;
    if (selectedTables.some((table) => table.is_merged || table.is_mergeable !== true)) return null;
    if (selectedTables.some((table) => !this.isTableFreeForReservations(table.id, reservations, startTime, endTime, tableRows || []))) return null;

    const sameArea = selectedTables.every(
      (table) => (table.area_id || table.floor_areas?.id || null) === (selectedTables[0].area_id || selectedTables[0].floor_areas?.id || null)
    );
    const requiresStaffReview = !sameArea || !this.tablesAreVisuallyConnected(selectedTables);

    return this.formatAutoMergeOption(selectedTables, partySize, requiresStaffReview);
  }

  /**
   * List reservations with filtering and pagination.
   */
  async list(restaurantId: string, filters: ReservationFilterQuery) {
    const { page, limit, offset } = parsePagination(filters);

    let query = supabaseAdmin
      .from('reservations')
      .select('*, tables(id, table_number, name, type, floor_areas(name))', { count: 'exact' })
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
      .select('*, tables(id, table_number, name, type, floor_areas(name))')
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
    // Get restaurant settings for default duration, booking window, and plan limits
    const { data: org } = await supabaseAdmin
      .from('organizations')
      .select(
        'default_reservation_duration_min, max_party_size, min_advance_booking_hours, max_advance_booking_days, subscription_plan, subscription_status, monthly_reservation_count, monthly_reservation_reset_at'
      )
      .eq('id', restaurantId)
      .single();

    const duration = org?.default_reservation_duration_min || 90;
    const maxParty = org?.max_party_size || 20;

    // Staff-created bookings (POS / walk-in / phone) bypass max party size and advance windows
    const isStaffCreated = !!createdBy || dto.source === 'pos' || dto.source === 'walk_in';

    if (!isStaffCreated && dto.partySize > maxParty) {
      throw new AppError(`Party size cannot exceed ${maxParty}`, 400);
    }

    // ── Monthly Reservation Limit (Starter Plan: 100/month) ──────────────────
    // Uses on-read reset: if the stored reset date is from a prior month,
    // re-count from DB and update the cache before checking.
    const plan = org?.subscription_plan || 'free';
    const planLimits = getPlanLimits(plan);
    const subscriptionStatus = org?.subscription_status || 'none';

    // Skip limit check if: unlimited plan, or active trial
    if (!hasUnlimitedReservations(plan) && subscriptionStatus !== 'trialing') {
      const monthlyLimit = planLimits.monthlyReservations;

      if (monthlyLimit > 0) {
        const now = new Date();
        const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const resetAt = org?.monthly_reservation_reset_at
          ? new Date(org.monthly_reservation_reset_at)
          : null;

        let currentCount = org?.monthly_reservation_count ?? 0;

        // On-read reset: if reset_at is from a prior month, recount from DB
        const isStaleMonth =
          !resetAt ||
          resetAt.getFullYear() !== now.getFullYear() ||
          resetAt.getMonth() !== now.getMonth();

        if (isStaleMonth) {
          // Count non-cancelled reservations created this calendar month
          const { count: realCount } = await supabaseAdmin
            .from('reservations')
            .select('id', { count: 'exact', head: true })
            .eq('restaurant_id', restaurantId)
            .neq('status', ReservationStatus.CANCELLED)
            .gte('created_at', currentMonthStart.toISOString());

          currentCount = realCount ?? 0;

          // Update the cached counter and reset date (fire-and-forget)
          supabaseAdmin
            .from('organizations')
            .update({
              monthly_reservation_count: currentCount,
              monthly_reservation_reset_at: currentMonthStart.toISOString(),
            })
            .eq('id', restaurantId)
            .then(() => {/* intentionally fire-and-forget */});
        }

        if (currentCount >= monthlyLimit) {
          throw new AppError(
            `Monthly reservation limit reached (${monthlyLimit}/month on the ${plan} plan). ` +
            `Upgrade to Professional for unlimited bookings.`,
            403
          );
        }
      }
    }

    // Enforce booking window — only for public/customer bookings.
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
    
    const normalizedGuestEmail = dto.guestEmail && dto.guestEmail.trim() ? dto.guestEmail.trim() : null;
    if (normalizedGuestEmail) {
      const { data: existingCustomer } = await supabaseAdmin
        .from('customers')
        .select('id, is_vip')
        .eq('email', normalizedGuestEmail)
        .single();

      if (existingCustomer) {
        customerId = existingCustomer.id;
        isPremium = existingCustomer.is_vip;
      } else {
        const { data: newCustomer } = await supabaseAdmin
          .from('customers')
          .insert({
            first_name: (dto.guestFirstName && dto.guestFirstName.trim()) || 'Guest',
            last_name: dto.guestLastName?.trim() || null,
            email: normalizedGuestEmail,
            phone: dto.guestPhone || null,
          })
          .select()
          .single();

        if (newCustomer) customerId = newCustomer.id;
      }
    }

    let effectiveTableId = dto.tableId || null;
    let autoMergeTableId: string | null = null;

    if (!effectiveTableId && dto.autoMergeTableIds?.length) {
      const available = await this.getAvailableTables(restaurantId, dto.reservationDate, dto.startTime, dto.partySize);
      let requestedAutoMerge = available.find(
        (t: any) => t.isAutoMerge && this.sameIdSet(t.autoMergeTableIds || [], dto.autoMergeTableIds || [])
      ) as any;

      if (!requestedAutoMerge && isStaffCreated) {
        requestedAutoMerge = await this.getStaffSelectedMergeOption(
          restaurantId,
          dto.reservationDate,
          dto.startTime,
          endTime,
          duration,
          dto.partySize,
          dto.autoMergeTableIds
        );
      }

      if (!requestedAutoMerge) {
        throw new AppError('Selected table combination is no longer available for this time slot', 409);
      }

      const sourceIds = requestedAutoMerge.autoMergeTableIds as string[];
      const { data: sourceTables } = await supabaseAdmin
        .from('tables')
        .select('position_x, position_y')
        .in('id', sourceIds)
        .eq('restaurant_id', restaurantId);
      const positionedTables = (sourceTables || []).filter((t) => t.position_x != null && t.position_y != null);
      const avgX = positionedTables.length
        ? positionedTables.reduce((sum, t) => sum + Number(t.position_x), 0) / positionedTables.length
        : null;
      const avgY = positionedTables.length
        ? positionedTables.reduce((sum, t) => sum + Number(t.position_y), 0) / positionedTables.length
        : null;
      const { data: mergedTable, error: mergeErr } = await supabaseAdmin
        .from('tables')
        .insert({
          restaurant_id: restaurantId,
          table_number: `AUTO-${Date.now().toString().slice(-6)}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`,
          name: requestedAutoMerge.name,
          capacity: requestedAutoMerge.capacity,
          min_capacity: dto.partySize,
          area_id: requestedAutoMerge.area?.id || null,
          position_x: avgX,
          position_y: avgY,
          shape: 'rectangle',
          type: requestedAutoMerge.requiresStaffReview ? 'staff_review_required' : null,
          is_premium: requestedAutoMerge.isPremium || false,
          premium_price: requestedAutoMerge.premiumPrice || 0,
          is_merged: true,
          merged_table_ids: sourceIds,
          merge_effective_from: dto.reservationDate,
          is_active: false,
          start_time: dto.startTime,
          end_time: endTime,
        })
        .select('id')
        .single();

      if (mergeErr || !mergedTable) {
        throw new AppError(`Failed to prepare combined table: ${mergeErr?.message || 'unknown error'}`, 500);
      }

      effectiveTableId = mergedTable.id;
      autoMergeTableId = mergedTable.id;
    }

    if (effectiveTableId && !autoMergeTableId) {
      await this.ensureTableFreeForReservation(restaurantId, effectiveTableId, dto.reservationDate, dto.startTime, endTime);
    }

    // Use SQL RPC to securely lock table row and insert atomically
    const { data: rpcData, error } = await supabaseAdmin.rpc('create_reservation_atomic', {
      p_restaurant_id: restaurantId,
      p_table_id: effectiveTableId,
      p_customer_id: customerId,
      p_reservation_date: dto.reservationDate,
      p_start_time: dto.startTime,
      p_end_time: endTime,
      p_party_size: dto.partySize,
      p_guest_first_name: dto.guestFirstName?.trim() || null,
      p_guest_last_name: dto.guestLastName?.trim() || null,
      p_guest_email: normalizedGuestEmail,
      p_guest_phone: dto.guestPhone || null,
      p_source: dto.source || 'app',
      p_special_requests: dto.specialRequests || null,
      p_created_by: createdBy || null,
      p_is_premium: isPremium
    });

    if (error) {
      if (autoMergeTableId) {
        await supabaseAdmin.from('tables').delete().eq('id', autoMergeTableId).eq('restaurant_id', restaurantId);
      }
      if (error.message.includes('Table is no longer available')) {
        throw new AppError('Table is no longer available for this time slot (booked by another user)', 409);
      }
      throw new AppError(`Failed to create reservation: ${error.message}`, 500);
    }
    
    // Fetch the newly created reservation with relation data
    let { data: createdRes, error: fetchErr } = await supabaseAdmin
      .from('reservations')
      .select('*, tables(id, table_number, name, type, floor_areas(name))')
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
    const guestEmail = normalizedGuestEmail || createdRes.guest_email;
    if (guestEmail) {
      try {
        // Get restaurant name, phone and cancellation policy for the email
        const { data: orgData } = await supabaseAdmin
          .from('organizations')
          .select('name, phone, cancellation_policy, logo_url, branding_color, email_custom_note')
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
          logoUrl: orgData?.logo_url || undefined,
          brandingColor: orgData?.branding_color || undefined,
          customNote: orgData?.email_custom_note || undefined,
          cancellationUrl: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/cancel/${rpcData.id}`,
        });
      } catch (emailErr: any) {
        console.error('[ReservationService] Confirmation email failed:', emailErr.message);
      }
    }

    // Increment monthly counter (fire-and-forget, non-blocking)
    if (!hasUnlimitedReservations(plan)) {
      this.incrementMonthlyCount(restaurantId).catch(() => {/* non-critical */});
    }

    return this.formatReservation(createdRes);

  }

  /**
   * Increment the monthly reservation counter for an org (fire-and-forget).
   * Called internally after a successful reservation creation.
   * Only meaningful for plans with finite monthly limits.
   */
  private async incrementMonthlyCount(restaurantId: string): Promise<void> {
    try {
      await supabaseAdmin.rpc('increment_monthly_reservation_count', {
        p_restaurant_id: restaurantId,
      });
    } catch {
      // Non-critical — counter will self-correct on next on-read reset
    }
  }


  /**
   * Update a reservation with conflict detection.
   * If table_id, date, or time is being changed, we check for conflicts first.
   */
  async update(reservationId: string, restaurantId: string, dto: UpdateReservationDto) {
    const dtoRecord = dto as Record<string, unknown>;
    const wantsClearTable =
      Object.prototype.hasOwnProperty.call(dtoRecord, 'tableId') && dto.tableId === null;

    const buildGuestPayload = () => {
      const updatePayload: Record<string, any> = {
        updated_at: new Date().toISOString(),
      };
      if (dto.reservationDate !== undefined) updatePayload.reservation_date = dto.reservationDate;
      if (dto.startTime !== undefined) updatePayload.start_time = dto.startTime;
      if (dto.endTime !== undefined) updatePayload.end_time = dto.endTime;
      if (dto.partySize !== undefined) updatePayload.party_size = dto.partySize;
      if (dto.guestFirstName !== undefined) updatePayload.guest_first_name = dto.guestFirstName;
      if (dto.guestLastName !== undefined) updatePayload.guest_last_name = dto.guestLastName;
      if (dto.guestEmail !== undefined) updatePayload.guest_email = dto.guestEmail;
      if (dto.guestPhone !== undefined) updatePayload.guest_phone = dto.guestPhone;
      if (dto.specialRequests !== undefined) updatePayload.special_requests = dto.specialRequests;
      if (dto.internalNotes !== undefined) updatePayload.internal_notes = dto.internalNotes;
      return updatePayload;
    };

    // Clearing table_id: Postgres RPC uses COALESCE(p_table_id, current) so NULL cannot unassign — use direct update.
    if (wantsClearTable) {
      const updatePayload = buildGuestPayload();
      updatePayload.table_id = null;

      const { error: updateErr } = await supabaseAdmin
        .from('reservations')
        .update(updatePayload)
        .eq('id', reservationId)
        .eq('restaurant_id', restaurantId);

      if (updateErr) {
        throw new AppError('Failed to update reservation: ' + updateErr.message, 500);
      }

      const { data: updatedRes, error: fetchErr } = await supabaseAdmin
        .from('reservations')
        .select('*, tables(id, table_number, name, type, floor_areas(name))')
        .eq('id', reservationId)
        .eq('restaurant_id', restaurantId)
        .single();

      if (fetchErr || !updatedRes) throw new NotFoundError('Reservation');
      return this.formatReservation(updatedRes);
    }

    // 1. Rely on atomic DB-level locking via an RPC instead of JS memory checks
    let rpcSuccess = false;

    const rpcParams: Record<string, unknown> = {
      p_reservation_id: reservationId,
      p_restaurant_id: restaurantId,
      p_reservation_date: dto.reservationDate ?? null,
      p_start_time: dto.startTime ?? null,
      p_end_time: dto.endTime ?? null,
      p_party_size: dto.partySize ?? null,
      p_guest_first_name: dto.guestFirstName ?? null,
      p_guest_last_name: dto.guestLastName ?? null,
      p_guest_email: dto.guestEmail ?? null,
      p_guest_phone: dto.guestPhone ?? null,
      p_special_requests: dto.specialRequests ?? null,
      p_internal_notes: dto.internalNotes ?? null,
    };
    if (dto.tableId !== undefined && dto.tableId !== null) {
      rpcParams.p_table_id = dto.tableId;
    }

    try {
      const { data, error } = await supabaseAdmin.rpc('update_reservation_atomic', rpcParams);

      if (error) {
        if (error.message.includes('overlap') || error.message.includes('booked')) {
          throw new AppError('Table is already booked for the selected time slot.', 409);
        }
        console.warn('[ReservationService] RPC update failed, using fallback:', error.message);
      } else {
        rpcSuccess = true;
      }
    } catch (err: any) {
      if (err instanceof AppError) throw err;
      console.warn('[ReservationService] RPC update unavailable, using fallback:', err.message);
    }

    if (!rpcSuccess) {
      const updatePayload: Record<string, any> = {};
      if (dto.tableId !== undefined) updatePayload.table_id = dto.tableId;
      if (dto.reservationDate !== undefined) updatePayload.reservation_date = dto.reservationDate;
      if (dto.startTime !== undefined) updatePayload.start_time = dto.startTime;
      if (dto.endTime !== undefined) updatePayload.end_time = dto.endTime;
      if (dto.partySize !== undefined) updatePayload.party_size = dto.partySize;
      if (dto.guestFirstName !== undefined) updatePayload.guest_first_name = dto.guestFirstName;
      if (dto.guestLastName !== undefined) updatePayload.guest_last_name = dto.guestLastName;
      if (dto.guestEmail !== undefined) updatePayload.guest_email = dto.guestEmail;
      if (dto.guestPhone !== undefined) updatePayload.guest_phone = dto.guestPhone;
      if (dto.specialRequests !== undefined) updatePayload.special_requests = dto.specialRequests;
      if (dto.internalNotes !== undefined) updatePayload.internal_notes = dto.internalNotes;

      if (Object.keys(updatePayload).length > 0) {
        updatePayload.updated_at = new Date().toISOString();
        const { error: updateErr } = await supabaseAdmin
          .from('reservations')
          .update(updatePayload)
          .eq('id', reservationId)
          .eq('restaurant_id', restaurantId);

        if (updateErr) {
          throw new AppError('Failed to update reservation: ' + updateErr.message, 500);
        }
      }
    }

    // 2. Fetch the newly structured reservation payload for the response
    const { data: updatedRes, error: fetchErr } = await supabaseAdmin
      .from('reservations')
      .select('*, tables(id, table_number, name, type, floor_areas(name))')
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
      .select('*, tables(id, table_number, name, type, floor_areas(name))')
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
      .select('*, tables(id, table_number, name, type, capacity, floor_areas(name))')
      .eq('restaurant_id', restaurantId)
      .eq('reservation_date', date)
      .neq('status', 'cancelled')
      .order('start_time', { ascending: true });

    if (error) throw new AppError('Failed to fetch calendar data', 500);

    const tables = await tableService.listTables(restaurantId, { forDate: date });

    const tableMap: Record<string, any[]> = {};
    for (const table of tables) {
      tableMap[table.id] = [];
    }

    for (const res of (reservations || [])) {
      if (res.table_id && tableMap[res.table_id]) {
        tableMap[res.table_id].push(this.formatReservation(res));
      }
    }

    const areaMap: Record<string, any[]> = {};
    for (const table of tables) {
      const areaName = table.area?.name || 'Unassigned';
      if (!areaMap[areaName]) areaMap[areaName] = [];
      areaMap[areaName].push({
        id: table.id,
        tableNumber: table.tableNumber,
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
      .not('status', 'in', `(${ReservationStatus.CANCELLED},${ReservationStatus.NO_SHOW},${ReservationStatus.COMPLETED})`);

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
  async getAvailableTables(
    restaurantId: string,
    date: string,
    startTime: string,
    partySize: number,
    options?: { includeAllAvailable?: boolean }
  ) {
    await tableService.dematerializeScheduledMerges(restaurantId);

    const { data: org } = await supabaseAdmin
      .from('organizations')
      .select('default_reservation_duration_min')
      .eq('id', restaurantId)
      .single();

    const duration = org?.default_reservation_duration_min || 90;
    const endTime = addMinutesToTime(startTime, duration);

    const { data: dayReservations } = await supabaseAdmin
      .from('reservations')
      .select('table_id, start_time, end_time, status')
      .eq('restaurant_id', restaurantId)
      .eq('reservation_date', date)
      .not('status', 'in', `(${ReservationStatus.CANCELLED},${ReservationStatus.NO_SHOW},${ReservationStatus.COMPLETED})`);
    const reservations = dayReservations || [];

    const { data: tableRows } = await supabaseAdmin
      .from('tables')
      .select('*, floor_areas(id, name)')
      .eq('restaurant_id', restaurantId)
      .or('is_active.eq.true,is_merged.eq.true');

    const laidOutTables = buildLayoutTableRows(tableRows || [], date, {
      layoutTime: startTime,
      reservations,
      defaultDurationMins: duration,
    });
    const candidates = options?.includeAllAvailable
      ? laidOutTables
      : laidOutTables.filter((t: any) => (Number(t.capacity) || 0) >= partySize);

    const available: any[] = [];
    for (const table of candidates) {
      if (this.isTableFreeForReservations(table.id, reservations, startTime, endTime, tableRows || [])) {
        available.push(this.formatAvailableTable(table));
      }
    }

    if (!options?.includeAllAvailable && !available.some((t) => !t.isPremium)) {
      const availableStandardTables = (laidOutTables as AvailableTableRow[]).filter(
        (table) =>
          table.is_mergeable === true &&
          !table.is_merged &&
          !table.is_premium &&
          this.isTableFreeForReservations(table.id, reservations, startTime, endTime, tableRows || [])
      );
      const autoMerge = this.findAutoMergeOption(availableStandardTables, partySize);
      if (autoMerge) available.push(autoMerge);
    }

    // Best-fit: smallest table that can accommodate the party is assigned first
    available.sort((a, b) => {
      if (a.isAutoMerge !== b.isAutoMerge) return a.isAutoMerge ? 1 : -1;
      if (options?.includeAllAvailable) {
        if (a.positionY != null && b.positionY != null && a.positionY !== b.positionY) return a.positionY - b.positionY;
        if (a.positionX != null && b.positionX != null && a.positionX !== b.positionX) return a.positionX - b.positionX;
      }
      return a.capacity - b.capacity;
    });
    return available;
  }

  /**
   * Get available time slots.
   */
  async getAvailableTimeSlots(restaurantId: string, date: string, partySize: number) {
    const { data: org } = await supabaseAdmin
      .from('organizations')
      .select('opening_time, closing_time, weekly_hours')
      .eq('id', restaurantId)
      .single();

    if (!org) return { allSlots: [], availableSlots: [] };

    let startH = 0, startM = 0, endH = 0, endM = 0;
    let isClosed = false;

    if (org.weekly_hours) {
      let weeklyHours = org.weekly_hours;
      if (typeof weeklyHours === 'string') {
        try {
          weeklyHours = JSON.parse(weeklyHours);
        } catch (e) {
          console.error('Failed to parse weekly_hours', e);
        }
      }

      const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      
      let parsedDate = date;
      if (date.includes('/')) {
        const parts = date.split('/');
        if (parts[0].length === 2) {
          parsedDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
        }
      }
      
      const dayOfWeek = days[new Date(parsedDate).getUTCDay()];
      const dayHours = weeklyHours[dayOfWeek];

      if (dayHours && (dayHours.closed === true || dayHours.closed === 'true')) {
        isClosed = true;
        return { allSlots: [], availableSlots: [], isClosed: true };
      }

      const openTime = dayHours?.open || org.opening_time;
      const closeTime = dayHours?.close || org.closing_time;

      if (!openTime || !closeTime) return { allSlots: [], availableSlots: [], isClosed: true };

      startH = parseInt(openTime.split(':')[0], 10);
      startM = parseInt(openTime.split(':')[1], 10);
      endH = parseInt(closeTime.split(':')[0], 10);
      endM = parseInt(closeTime.split(':')[1], 10);
    } else {
      if (!org.opening_time || !org.closing_time) return { allSlots: [], availableSlots: [], isClosed: true };
      startH = parseInt(org.opening_time.split(':')[0], 10);
      startM = parseInt(org.opening_time.split(':')[1], 10);
      endH = parseInt(org.closing_time.split(':')[0], 10);
      endM = parseInt(org.closing_time.split(':')[1], 10);
    }

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

    // Batch optimization: date-aware merge + reservation overlap in-memory per slot
    await tableService.dematerializeScheduledMerges(restaurantId);

    const { data: wideRows } = await supabaseAdmin
      .from('tables')
      .select('*, floor_areas(id, name)')
      .eq('restaurant_id', restaurantId)
      .or('is_active.eq.true,is_merged.eq.true');

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
      .not('status', 'in', `(${ReservationStatus.CANCELLED},${ReservationStatus.NO_SHOW},${ReservationStatus.COMPLETED})`);

    const reservations = dayReservations || [];

    // Check each slot in-memory
    for (const slot of allSlots) {
      const slotEnd = addMinutesToTime(slot, duration);
      const laidOut = buildLayoutTableRows(wideRows || [], date, {
        layoutTime: slot,
        reservations,
        defaultDurationMins: duration,
      }) as AvailableTableRow[];
      const candidates = laidOut.filter((t) => (Number(t.capacity) || 0) >= partySize);

      const hasSingle = candidates.some((table) => this.isTableFreeForReservations(table.id, reservations, slot, slotEnd, wideRows || []));
      const hasAutoMerge = !hasSingle && Boolean(
        this.findAutoMergeOption(
          laidOut.filter(
            (table) =>
              table.is_mergeable === true &&
              !table.is_merged &&
              !table.is_premium &&
              this.isTableFreeForReservations(table.id, reservations, slot, slotEnd, wideRows || [])
          ),
          partySize
        )
      );
      const hasAvailable = hasSingle || hasAutoMerge;
      if (hasAvailable) availableSlots.push(slot);
    }

    return { allSlots, availableSlots, isClosed: false };
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

    const legacyReviewNote =
      typeof row.internal_notes === 'string' && row.internal_notes.startsWith('Auto-assigned non-adjacent tables')
        ? row.internal_notes
        : null;
    const staffReviewReason =
      row.tables?.type === 'staff_review_required'
        ? 'The assigned tables are not adjacent on the floor map. Staff should review the seating layout before arrival.'
        : legacyReviewNote;

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
      internalNotes: legacyReviewNote ? null : row.internal_notes,
      staffReviewReason,
      paymentMethod: row.payment_method,
      paymentStatus: row.payment_status,
      totalAmount: row.total_amount ?? null,
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
            type: row.tables.type,
            area: row.tables.floor_areas?.name || null,
          }
        : null,
    };
  }

  // ─── Total Amount (ePOS Sale Push) ───────────────────

  /**
   * Update the total sale amount for a reservation.
   * Called by the ePOS system when a table is closed, or manually by staff.
   */
  async updateTotalAmount(reservationId: string, restaurantId: string, totalAmount: number) {
    const { data, error } = await supabaseAdmin
      .from('reservations')
      .update({
        total_amount: totalAmount,
        updated_at: new Date().toISOString(),
      })
      .eq('id', reservationId)
      .eq('restaurant_id', restaurantId)
      .select('*, tables(id, table_number, name, type, floor_areas(name))')
      .single();

    if (error || !data) throw new NotFoundError('Reservation');
    return this.formatReservation(data);
  }

  // ─── Table Revenue Report ────────────────────────────

  /**
   * Generate a per-table revenue report for a date range.
   * Returns booking count (online vs walk-in split), total revenue,
   * and grand totals. Sorted by revenue descending (busiest first).
   */
  async getTableRevenueReport(
    restaurantId: string,
    startDate: string,
    endDate: string,
    tableId?: string
  ) {
    // 1. Fetch all completed/active reservations in the date range
    let query = supabaseAdmin
      .from('reservations')
      .select('id, table_id, reservation_date, start_time, end_time, party_size, status, source, total_amount, seated_at, completed_at, created_at, tables(id, table_number, name, type, floor_areas(name))')
      .eq('restaurant_id', restaurantId)
      .gte('reservation_date', startDate)
      .lte('reservation_date', endDate)
      .not('status', 'in', '(cancelled,no_show)');

    if (tableId) {
      query = query.eq('table_id', tableId);
    }

    const { data: reservations, error } = await query.order('reservation_date', { ascending: true });

    if (error) throw new AppError('Failed to fetch report data', 500);

    // 2. Group by table
    const tableMap: Record<string, {
      tableId: string;
      tableNumber: string;
      tableName: string;
      area: string | null;
      totalBookings: number;
      onlineBookings: number;
      walkInBookings: number;
      posBookings: number;
      totalRevenue: number;
      totalCovers: number;
      reservations: any[];
    }> = {};

    let grandTotalBookings = 0;
    let grandTotalRevenue = 0;
    let grandTotalCovers = 0;
    let grandOnline = 0;
    let grandWalkIn = 0;
    let grandPos = 0;

    for (const r of (reservations || []) as any[]) {
      const tid = r.table_id || 'unassigned';
      if (!tableMap[tid]) {
        tableMap[tid] = {
          tableId: tid,
          tableNumber: (r.tables as any)?.table_number || 'N/A',
          tableName: (r.tables as any)?.name || 'Unassigned',
          area: (r.tables as any)?.floor_areas?.name || null,
          totalBookings: 0,
          onlineBookings: 0,
          walkInBookings: 0,
          posBookings: 0,
          totalRevenue: 0,
          totalCovers: 0,
          reservations: [],
        };
      }

      const entry = tableMap[tid];
      entry.totalBookings++;
      entry.totalCovers += r.party_size || 0;
      entry.totalRevenue += parseFloat(r.total_amount) || 0;

      // Classify source
      const src = (r.source || 'app').toLowerCase();
      if (src === 'walk_in') {
        entry.walkInBookings++;
        grandWalkIn++;
      } else if (src === 'pos') {
        entry.posBookings++;
        grandPos++;
      } else {
        entry.onlineBookings++;
        grandOnline++;
      }

      entry.reservations.push({
        id: r.id,
        date: r.reservation_date,
        startTime: r.start_time,
        endTime: r.end_time,
        partySize: r.party_size,
        status: r.status,
        source: r.source,
        totalAmount: parseFloat(r.total_amount) || null,
        bookedAt: r.created_at,
        seatedAt: r.seated_at,
        closedAt: r.completed_at,
      });

      grandTotalBookings++;
      grandTotalRevenue += parseFloat(r.total_amount) || 0;
      grandTotalCovers += r.party_size || 0;
    }

    // 3. Convert map to sorted array (busiest/highest revenue first)
    const tables = Object.values(tableMap)
      .sort((a, b) => b.totalRevenue - a.totalRevenue || b.totalBookings - a.totalBookings);

    return {
      dateRange: { startDate, endDate },
      tables,
      grandTotals: {
        totalBookings: grandTotalBookings,
        onlineBookings: grandOnline,
        walkInBookings: grandWalkIn,
        posBookings: grandPos,
        totalRevenue: Math.round(grandTotalRevenue * 100) / 100,
        totalCovers: grandTotalCovers,
      },
    };
  }

  // ─── Analytics Report ────────────────────────────────────────────────────

  /**
   * Generate a period-based analytics report (daily / weekly / bi-weekly / monthly).
   * Covers all reservation sources and statuses for complete management insight.
   */
  async getAnalyticsReport(
    restaurantId: string,
    period: string = 'weekly',
    referenceDate?: string
  ) {
    const today = referenceDate || new Date().toISOString().split('T')[0];
    const ref = new Date(today + 'T00:00:00Z');

    let dateFrom: string;
    let dateTo: string = today;

    if (period === 'daily') {
      dateFrom = today;
    } else if (period === 'weekly') {
      const from = new Date(ref);
      from.setUTCDate(from.getUTCDate() - 6);
      dateFrom = from.toISOString().split('T')[0];
    } else if (period === 'bi-weekly') {
      const from = new Date(ref);
      from.setUTCDate(from.getUTCDate() - 13);
      dateFrom = from.toISOString().split('T')[0];
    } else {
      // monthly — calendar month
      dateFrom = `${today.substring(0, 7)}-01`;
      const lastDay = new Date(ref.getUTCFullYear(), ref.getUTCMonth() + 1, 0).getUTCDate();
      dateTo = `${today.substring(0, 7)}-${String(lastDay).padStart(2, '0')}`;
    }

    // Fetch org name
    const { data: org } = await supabaseAdmin
      .from('organizations')
      .select('name')
      .eq('id', restaurantId)
      .single();

    // Fetch all reservations in range (all statuses)
    const { data: rows, error } = await supabaseAdmin
      .from('reservations')
      .select(`
        id, reservation_date, start_time, end_time, party_size,
        guest_first_name, guest_last_name, guest_email, guest_phone,
        status, source, special_requests, created_at,
        tables ( name, table_number )
      `)
      .eq('restaurant_id', restaurantId)
      .gte('reservation_date', dateFrom)
      .lte('reservation_date', dateTo)
      .order('reservation_date', { ascending: true })
      .order('start_time', { ascending: true });

    if (error) throw new AppError('Failed to fetch analytics data', 500);

    const reservations = rows || [];

    // ── Aggregation ──────────────────────────────────────────────────────────
    const bySource = { walkIn: 0, online: 0, staff: 0, phone: 0 };
    const byStatus: Record<string, number> = {
      completed: 0, seated: 0, confirmed: 0, pending: 0, cancelled: 0, noShow: 0, arriving: 0,
    };
    const dailyMap: Map<string, { total: number; covers: number; walkIn: number; online: number; staff: number; phone: number }> = new Map();

    let totalCovers = 0;

    for (const r of reservations) {
      const src = (r.source || 'app').toLowerCase();
      if (src === 'walk_in') bySource.walkIn++;
      else if (src === 'pos') bySource.staff++;
      else if (src === 'phone') bySource.phone++;
      else bySource.online++;

      const st = (r.status || 'pending').toLowerCase();
      if (st === 'no_show') byStatus.noShow = (byStatus.noShow || 0) + 1;
      else if (byStatus[st] !== undefined) byStatus[st]++;

      totalCovers += r.party_size || 0;

      const d: string = typeof r.reservation_date === 'string'
        ? r.reservation_date.split('T')[0]
        : r.reservation_date;

      if (!dailyMap.has(d)) dailyMap.set(d, { total: 0, covers: 0, walkIn: 0, online: 0, staff: 0, phone: 0 });
      const day = dailyMap.get(d)!;
      day.total++;
      day.covers += r.party_size || 0;
      if (src === 'walk_in') day.walkIn++;
      else if (src === 'pos') day.staff++;
      else if (src === 'phone') day.phone++;
      else day.online++;
    }

    const total = reservations.length;
    const avgPartySize = total > 0 ? Math.round((totalCovers / total) * 10) / 10 : 0;

    // Peak day
    let peakDay: { date: string; count: number } | null = null;
    for (const [date, day] of dailyMap.entries()) {
      if (!peakDay || day.total > peakDay.count) peakDay = { date, count: day.total };
    }

    const dailyBreakdown = Array.from(dailyMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, v]) => ({ date, ...v }));

    const reservationList = reservations.map(r => ({
      date: typeof r.reservation_date === 'string' ? r.reservation_date.split('T')[0] : r.reservation_date,
      startTime: r.start_time,
      endTime: r.end_time,
      guestFirstName: r.guest_first_name || '',
      guestLastName: r.guest_last_name || '',
      phone: r.guest_phone || '',
      email: r.guest_email || '',
      partySize: r.party_size,
      table: (r.tables as any)?.name || (r.tables as any)?.table_number || '—',
      status: r.status,
      source: r.source || 'app',
      specialRequests: r.special_requests || '',
      createdAt: r.created_at,
    }));

    return {
      meta: {
        period,
        dateFrom,
        dateTo,
        generatedAt: new Date().toISOString(),
        restaurantName: org?.name || 'Restaurant',
      },
      summary: {
        totalReservations: total,
        totalCovers,
        bySource,
        byStatus,
        avgPartySize,
        peakDay,
      },
      dailyBreakdown,
      reservations: reservationList,
    };
  }

  /**
   * Get reservation counts per day for a given month.
   * Returns { "2026-04-01": 3, "2026-04-02": 5, ... }
   */
  async getMonthlyReservationCounts(restaurantId: string, year: number, month: number) {
    // Build date range for the month
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = new Date(year, month, 0); // last day of the month
    const endDateStr = `${year}-${String(month).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`;

    const { data, error } = await supabaseAdmin
      .from('reservations')
      .select('reservation_date')
      .eq('restaurant_id', restaurantId)
      .gte('reservation_date', startDate)
      .lte('reservation_date', endDateStr)
      .not('status', 'in', `(${ReservationStatus.CANCELLED},${ReservationStatus.NO_SHOW},${ReservationStatus.COMPLETED})`);

    if (error) throw new AppError('Failed to fetch monthly reservation counts', 500);

    // Count per day
    const counts: Record<string, number> = {};
    for (const row of (data || [])) {
      let d = row.reservation_date;
      if (typeof d === 'string' && d.includes('T')) d = d.split('T')[0];
      counts[d] = (counts[d] || 0) + 1;
    }

    return counts;
  }

  /**
   * Cancel a reservation and send notifications.
   */
  async cancelReservation(reservationId: string, restaurantId: string, reason?: string) {
    // Get reservation details first
    const { data: reservation, error: fetchError } = await supabaseAdmin
      .from('reservations')
      .select('*, tables(id, table_number, name), organizations(name, email, phone, logo_url, branding_color, email_custom_note)')
      .eq('id', reservationId)
      .eq('restaurant_id', restaurantId)
      .single();

    if (fetchError || !reservation) {
      throw new NotFoundError('Reservation');
    }

    // Update status to cancelled
    const { data: updatedReservation, error: updateError } = await supabaseAdmin
      .from('reservations')
      .update({ 
        status: ReservationStatus.CANCELLED,
        cancelled_at: new Date().toISOString(),
        cancellation_reason: reason || null
      })
      .eq('id', reservationId)
      .eq('restaurant_id', restaurantId)
      .select()
      .single();

    if (updateError) {
      throw new AppError('Failed to cancel reservation', 500);
    }

    // Send cancellation email to guest
    if (reservation.guest_email) {
      try {
        await emailService.sendReservationCancellation({
          to: reservation.guest_email,
          guestName: `${reservation.guest_first_name || ''} ${reservation.guest_last_name || ''}`.trim() || 'Guest',
          restaurantName: reservation.organizations?.name || 'Restaurant',
          date: reservation.reservation_date,
          time: reservation.start_time,
          reason: reason
        });
      } catch (emailErr: any) {
        console.error('[ReservationService] Cancellation email failed:', emailErr.message);
      }
    }

    // Send notification to admin
    if (reservation.organizations?.email) {
      try {
        await emailService.sendReservationChangeNotification({
          to: reservation.organizations.email,
          adminName: 'Restaurant Admin',
          restaurantName: reservation.organizations.name,
          guestName: `${reservation.guest_first_name || ''} ${reservation.guest_last_name || ''}`.trim() || 'Guest',
          guestEmail: reservation.guest_email || '',
          date: reservation.reservation_date,
          time: reservation.start_time,
          partySize: reservation.party_size,
          changeType: 'cancelled',
          reason: reason,
          confirmationId: reservationId
        });
      } catch (emailErr: any) {
        console.error('[ReservationService] Admin notification failed:', emailErr.message);
      }
    }

    return this.formatReservation(updatedReservation);
  }

  /**
   * Get public reservation details (no authentication required).
   */
  async getPublicReservation(reservationId: string) {
    const { data, error } = await supabaseAdmin
      .from('reservations')
      .select(`
        *,
        tables(id, table_number, name),
        organizations(name, logo_url)
      `)
      .eq('id', reservationId)
      .single();

    if (error || !data) {
      throw new NotFoundError('Reservation');
    }

    // Return limited public information
    return {
      id: data.id,
      reservation_date: data.reservation_date,
      start_time: data.start_time,
      party_size: data.party_size,
      status: data.status,
      guest_first_name: data.guest_first_name,
      guest_last_name: data.guest_last_name,
      tables: data.tables ? {
        id: data.tables.id,
        name: data.tables.name,
        table_number: data.tables.table_number
      } : null,
      restaurant: data.organizations ? {
        id: data.restaurant_id,
        name: data.organizations.name,
        logo_url: data.organizations.logo_url
      } : null
    };
  }
}

export const reservationService = new ReservationService();
