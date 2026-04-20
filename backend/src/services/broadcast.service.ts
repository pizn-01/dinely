import { supabaseAdmin } from '../config/database';
import { AppError, NotFoundError } from '../middleware/errorHandler';
import { parsePagination, buildPaginationMeta } from '../utils/pagination';
import { auditService } from './audit.service';

export class BroadcastService {
  /**
   * Super Admin: Create a new system broadcast.
   */
  async createBroadcast(title: string, message: string, type: 'info' | 'warning', isActive: boolean = true, userId: string) {
    const { data, error } = await supabaseAdmin
      .from('broadcasts')
      .insert({
        title,
        message,
        type,
        is_active: isActive,
      })
      .select()
      .single();

    if (error) throw new AppError('Failed to create broadcast', 500);

    await auditService.log({
      userId,
      action: 'broadcast.created',
      entityType: 'broadcast',
      entityId: data.id,
      changes: { title, message, type, isActive },
    });

    return data;
  }

  /**
   * Super Admin: List all broadcasts.
   */
  async listAllBroadcasts(page = 1, limit = 20) {
    const { offset } = parsePagination({ page, limit });

    const { data, error, count } = await supabaseAdmin
      .from('broadcasts')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw new AppError('Failed to fetch broadcasts', 500);

    return {
      broadcasts: data || [],
      meta: buildPaginationMeta(page, limit, count || 0),
    };
  }

  /**
   * Super Admin: Toggle broadcast active status or delete.
   * We will simply allow toggling for now.
   */
  async toggleBroadcast(broadcastId: string, isActive: boolean, userId: string) {
    const { data, error } = await supabaseAdmin
      .from('broadcasts')
      .update({ is_active: isActive, updated_at: new Date().toISOString() })
      .eq('id', broadcastId)
      .select()
      .single();

    if (error || !data) throw new NotFoundError('Broadcast');

    await auditService.log({
      userId,
      action: 'broadcast.toggled',
      entityType: 'broadcast',
      entityId: broadcastId,
      changes: { isActive },
    });

    return data;
  }

  /**
   * Public/Tenant: Get currently active broadcasts.
   */
  async getActiveBroadcasts() {
    const { data, error } = await supabaseAdmin
      .from('broadcasts')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) throw new AppError('Failed to fetch active broadcasts', 500);

    return data || [];
  }
}

export const broadcastService = new BroadcastService();
