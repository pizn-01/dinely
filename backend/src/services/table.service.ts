import { supabaseAdmin } from '../config/database';
import { AppError, NotFoundError } from '../middleware/errorHandler';
import { CreateTableDto, UpdateTableDto, CreateAreaDto, UpdateAreaDto } from '../types/api.types';

export class TableService {
  // ─── Floor Areas ──────────────────────────────────────

  async listAreas(restaurantId: string) {
    const { data, error } = await supabaseAdmin
      .from('floor_areas')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (error) throw new AppError('Failed to fetch areas', 500);
    return (data || []).map(this.formatArea);
  }

  async createArea(restaurantId: string, dto: CreateAreaDto) {
    const { data, error } = await supabaseAdmin
      .from('floor_areas')
      .insert({
        restaurant_id: restaurantId,
        name: dto.name,
        display_order: dto.displayOrder || 0,
      })
      .select()
      .single();

    if (error) throw new AppError('Failed to create area', 500);
    return this.formatArea(data);
  }

  async updateArea(areaId: string, restaurantId: string, dto: UpdateAreaDto) {
    const updateData: Record<string, any> = {};
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.displayOrder !== undefined) updateData.display_order = dto.displayOrder;
    if (dto.isActive !== undefined) updateData.is_active = dto.isActive;

    const { data, error } = await supabaseAdmin
      .from('floor_areas')
      .update(updateData)
      .eq('id', areaId)
      .eq('restaurant_id', restaurantId)
      .select()
      .single();

    if (error || !data) throw new NotFoundError('Area');
    return this.formatArea(data);
  }

  async deleteArea(areaId: string, restaurantId: string) {
    const { error } = await supabaseAdmin
      .from('floor_areas')
      .update({ is_active: false })
      .eq('id', areaId)
      .eq('restaurant_id', restaurantId);

    if (error) throw new AppError('Failed to delete area', 500);
    return { success: true };
  }

  // ─── Tables ───────────────────────────────────────────

  async listTables(restaurantId: string) {
    const { data, error } = await supabaseAdmin
      .from('tables')
      .select('*, floor_areas(id, name)')
      .eq('restaurant_id', restaurantId)
      .eq('is_active', true)
      .order('table_number', { ascending: true });

    if (error) throw new AppError('Failed to fetch tables', 500);
    return (data || []).map(this.formatTable);
  }

  /**
   * Public-safe table listing — exposes only non-sensitive fields.
   * Used by the public reservation widget; hides premium pricing,
   * floor plan positions, and merge status.
   */
  async listPublicTables(restaurantId: string) {
    const { data, error } = await supabaseAdmin
      .from('tables')
      .select('id, name, capacity, floor_areas(id, name)')
      .eq('restaurant_id', restaurantId)
      .eq('is_active', true)
      .order('table_number', { ascending: true });

    if (error) throw new AppError('Failed to fetch tables', 500);
    return (data || []).map((t: any) => ({
      id: t.id,
      name: t.name,
      capacity: t.capacity,
      area: t.floor_areas ? { id: t.floor_areas.id, name: t.floor_areas.name } : null,
    }));
  }

  async getTable(tableId: string, restaurantId: string) {
    const { data, error } = await supabaseAdmin
      .from('tables')
      .select('*, floor_areas(id, name)')
      .eq('id', tableId)
      .eq('restaurant_id', restaurantId)
      .single();

    if (error || !data) throw new NotFoundError('Table');
    return this.formatTable(data);
  }

  async createTable(restaurantId: string, dto: CreateTableDto) {
    // ── Check for soft-deleted record with same table_number ──
    // DB-level constraint covers ALL records (active + inactive), so we must
    // reactivate the old record instead of inserting a new one.
    const { data: deletedByNumber } = await supabaseAdmin
      .from('tables')
      .select('id')
      .eq('restaurant_id', restaurantId)
      .eq('table_number', dto.tableNumber)
      .eq('is_active', false)
      .maybeSingle();

    if (deletedByNumber) {
      // Reactivate the soft-deleted record with the new data
      const tableName = dto.name || `Table ${dto.tableNumber}`;
      const { data: reactivated, error: reactivateErr } = await supabaseAdmin
        .from('tables')
        .update({
          name: tableName,
          capacity: dto.capacity,
          min_capacity: dto.minCapacity || 1,
          area_id: dto.areaId || null,
          shape: dto.shape || 'rectangle',
          type: dto.type || null,
          is_mergeable: dto.isMergeable || false,
          is_premium: dto.isPremium || false,
          premium_price: dto.premiumPrice || null,
          position_x: dto.positionX || null,
          position_y: dto.positionY || null,
          is_active: true,
          is_merged: false,
          parent_table_id: null,
          merged_table_ids: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', deletedByNumber.id)
        .select('*, floor_areas(id, name)')
        .single();

      if (reactivateErr) throw new AppError(`Failed to reactivate table: ${reactivateErr.message}`, 500);
      return this.formatTable(reactivated);
    }

    // ── Uniqueness check: table_number (active only) ──────────────────
    const { data: existingByNumber } = await supabaseAdmin
      .from('tables')
      .select('id, name')
      .eq('restaurant_id', restaurantId)
      .eq('table_number', dto.tableNumber)
      .eq('is_active', true)
      .maybeSingle();

    if (existingByNumber) {
      throw new AppError(
        `A table with number "${dto.tableNumber}" already exists. Please use a different table number.`,
        409
      );
    }

    // ── Uniqueness check: name (if provided) ────────────
    const tableName = dto.name || `Table ${dto.tableNumber}`;
    const { data: existingByName } = await supabaseAdmin
      .from('tables')
      .select('id, table_number')
      .eq('restaurant_id', restaurantId)
      .ilike('name', tableName)
      .eq('is_active', true)
      .maybeSingle();

    if (existingByName) {
      throw new AppError(
        `A table with the name "${tableName}" already exists. Please choose a different name.`,
        409
      );
    }

    const { data, error } = await supabaseAdmin
      .from('tables')
      .insert({
        restaurant_id: restaurantId,
        table_number: dto.tableNumber,
        name: tableName,
        capacity: dto.capacity,
        min_capacity: dto.minCapacity || 1,
        area_id: dto.areaId || null,
        shape: dto.shape || 'rectangle',
        type: dto.type || null,
        is_mergeable: dto.isMergeable || false,
        is_premium: dto.isPremium || false,
        premium_price: dto.premiumPrice || null,
        position_x: dto.positionX || null,
        position_y: dto.positionY || null,
      })
      .select('*, floor_areas(id, name)')
      .single();

    if (error) throw new AppError(`Failed to create table: ${error.message}`, 500);
    return this.formatTable(data);
  }

  async updateTable(tableId: string, restaurantId: string, dto: UpdateTableDto) {
    const updateData: Record<string, any> = { updated_at: new Date().toISOString() };

    if (dto.tableNumber !== undefined) updateData.table_number = dto.tableNumber;
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.capacity !== undefined) updateData.capacity = dto.capacity;
    if (dto.minCapacity !== undefined) updateData.min_capacity = dto.minCapacity;
    if (dto.areaId !== undefined) updateData.area_id = dto.areaId;
    if (dto.shape !== undefined) updateData.shape = dto.shape;
    if (dto.type !== undefined) updateData.type = dto.type;
    if (dto.isMergeable !== undefined) updateData.is_mergeable = dto.isMergeable;
    if (dto.isPremium !== undefined) updateData.is_premium = dto.isPremium;
    if (dto.premiumPrice !== undefined) updateData.premium_price = dto.premiumPrice;
    if (dto.positionX !== undefined) updateData.position_x = dto.positionX;
    if (dto.positionY !== undefined) updateData.position_y = dto.positionY;
    if (dto.isActive !== undefined) updateData.is_active = dto.isActive;

    const { data, error } = await supabaseAdmin
      .from('tables')
      .update(updateData)
      .eq('id', tableId)
      .eq('restaurant_id', restaurantId)
      .select('*, floor_areas(id, name)')
      .single();

    if (error || !data) throw new NotFoundError('Table');
    return this.formatTable(data);
  }

  async deleteTable(tableId: string, restaurantId: string) {
    const { error } = await supabaseAdmin
      .from('tables')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', tableId)
      .eq('restaurant_id', restaurantId);

    if (error) throw new AppError('Failed to delete table', 500);
    return { success: true };
  }

  /**
   * Bulk update table coordinates for the floor plan editor
   */
  async bulkUpdatePositions(
    restaurantId: string,
    updates: { id: string; positionX: number; positionY: number }[]
  ) {
    if (!updates.length) return [];

    // Map into upsert payload. We must include all required fields or rely on
    // partial updates. Supabase upsert will completely replace the row if the id matches
    // unless we use specific constraints. Wait, upserting partial records requires
    // avoiding NOT NULL constraint failures or overwriting other fields.
    // Instead, let's just do a bulk update using raw SQL via RPC or parallel promises.
    // Since parallel updates are safer for partials and we have a ~20 table limit:
    
    const promises = updates.map(update => 
      supabaseAdmin
        .from('tables')
        .update({ 
          position_x: update.positionX, 
          position_y: update.positionY,
          updated_at: new Date().toISOString()
        })
        .eq('id', update.id)
        .eq('restaurant_id', restaurantId)
    );

    const results = await Promise.all(promises);
    
    const errors = results.filter(r => r.error);
    if (errors.length > 0) {
      console.error('Errors updating positions:', errors.map(e => e.error));
      throw new AppError('Failed to save some table positions', 500);
    }

    return { success: true, updatedCount: updates.length };
  }

  /**
   * Bulk import tables from parsed CSV data.
   */
  async importTables(
    restaurantId: string,
    tables: { tableNumber: string; capacity: number; area: string; type: string }[]
  ) {
    // First, ensure all areas exist
    const areaNames = [...new Set(tables.map((t) => t.area))];
    const areaMap: Record<string, string> = {};

    for (const areaName of areaNames) {
      if (!areaName) continue;

      // Check if area exists
      const { data: existing } = await supabaseAdmin
        .from('floor_areas')
        .select('id')
        .eq('restaurant_id', restaurantId)
        .eq('name', areaName)
        .single();

      if (existing) {
        areaMap[areaName] = existing.id;
      } else {
        // Create area
        const { data: newArea } = await supabaseAdmin
          .from('floor_areas')
          .insert({ restaurant_id: restaurantId, name: areaName })
          .select()
          .single();

        if (newArea) {
          areaMap[areaName] = newArea.id;
        }
      }
    }

    // Insert tables
    const tableRecords = tables.map((t) => ({
      restaurant_id: restaurantId,
      table_number: t.tableNumber,
      name: `Table ${t.tableNumber.replace('#', '')}`,
      capacity: t.capacity,
      area_id: areaMap[t.area] || null,
      type: t.type || null,
    }));

    const { data, error } = await supabaseAdmin
      .from('tables')
      .upsert(tableRecords, { onConflict: 'restaurant_id,table_number' })
      .select('*, floor_areas(id, name)');

    if (error) throw new AppError(`Failed to import tables: ${error.message}`, 500);
    return (data || []).map(this.formatTable);
  }

  // ─── Table Merging ────────────────────────────────────

  async mergeTables(restaurantId: string, sourceTableIds: string[], mergedTableDef: { name: string, capacity: number }) {
    if (sourceTableIds.length < 2) throw new AppError('Need at least 2 tables to merge', 400);

    // 1. Fetch source tables
    const { data: sourceTables, error: fetchErr } = await supabaseAdmin
      .from('tables')
      .select('*')
      .in('id', sourceTableIds)
      .eq('restaurant_id', restaurantId);

    if (fetchErr || !sourceTables || sourceTables.length !== sourceTableIds.length) {
      throw new AppError('Could not find all source tables', 404);
    }

    // 2. Calculate average position for visual placement
    const avgX = sourceTables.reduce((sum, t) => sum + (t.position_x || 0), 0) / sourceTables.length;
    const avgY = sourceTables.reduce((sum, t) => sum + (t.position_y || 0), 0) / sourceTables.length;
    const areaId = sourceTables[0].area_id;

    // 3. Create the new Merged Table
    const { data: mergedTable, error: createErr } = await supabaseAdmin
      .from('tables')
      .insert({
        restaurant_id: restaurantId,
        table_number: `M-${Date.now().toString().slice(-5)}`,
        name: mergedTableDef.name,
        capacity: mergedTableDef.capacity,
        min_capacity: 1,
        area_id: areaId,
        position_x: avgX,
        position_y: avgY,
        shape: 'rectangle',
        is_merged: true,
        merged_table_ids: sourceTableIds
      })
      .select('*, floor_areas(id, name)')
      .single();

    if (createErr || !mergedTable) throw new AppError(`Failed to create merged table: ${createErr?.message}`, 500);

    // 4. Update source tables to be parented and inactive
    await supabaseAdmin
      .from('tables')
      .update({ is_active: false, parent_table_id: mergedTable.id })
      .in('id', sourceTableIds)
      .eq('restaurant_id', restaurantId);

    return this.formatTable(mergedTable);
  }

  async unmergeTable(mergedTableId: string, restaurantId: string) {
    const { data: mergedTable, error: fetchErr } = await supabaseAdmin
      .from('tables')
      .select('*')
      .eq('id', mergedTableId)
      .eq('restaurant_id', restaurantId)
      .single();

    if (fetchErr || !mergedTable || !mergedTable.is_merged) throw new NotFoundError('Merged Table');

    // Restore the source tables
    if (mergedTable.merged_table_ids && mergedTable.merged_table_ids.length > 0) {
      await supabaseAdmin
        .from('tables')
        .update({ is_active: true, parent_table_id: null })
        .in('id', mergedTable.merged_table_ids)
        .eq('restaurant_id', restaurantId);
    }

    // Delete the temporary merged table wrapper
    await supabaseAdmin
      .from('tables')
      .delete()
      .eq('id', mergedTableId)
      .eq('restaurant_id', restaurantId);

    return { success: true };
  }

  // ─── Formatters ───────────────────────────────────────

  private formatTable(row: any) {
    return {
      id: row.id,
      tableNumber: row.table_number,
      name: row.name,
      capacity: row.capacity,
      minCapacity: row.min_capacity,
      area: row.floor_areas ? { id: row.floor_areas.id, name: row.floor_areas.name } : null,
      shape: row.shape,
      type: row.type,
      isMergeable: row.is_mergeable,
      isPremium: row.is_premium,
      premiumPrice: row.premium_price,
      positionX: row.position_x,
      positionY: row.position_y,
      isActive: row.is_active,
      isMerged: row.is_merged,
      parentTableId: row.parent_table_id,
      mergedTableIds: row.merged_table_ids,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private formatArea(row: any) {
    return {
      id: row.id,
      name: row.name,
      displayOrder: row.display_order,
      isActive: row.is_active,
      createdAt: row.created_at,
    };
  }
}

export const tableService = new TableService();
