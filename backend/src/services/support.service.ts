import { supabaseAdmin } from '../config/database';
import { AppError, NotFoundError } from '../middleware/errorHandler';
import { parsePagination, buildPaginationMeta } from '../utils/pagination';
import { auditService } from './audit.service';

export class SupportService {
  /**
   * Restaurant Admin: Submit a new support ticket.
   */
  async createTicket(restaurantId: string, userId: string, subject: string, message: string) {
    const { data, error } = await supabaseAdmin
      .from('support_tickets')
      .insert({
        restaurant_id: restaurantId,
        user_id: userId,
        subject,
        message,
        status: 'open',
      })
      .select()
      .single();

    if (error) throw new AppError('Failed to create support ticket', 500);

    await auditService.log({
      restaurantId,
      userId,
      action: 'support_ticket.created',
      entityType: 'support_ticket',
      entityId: data.id,
    });

    return data;
  }

  /**
   * Restaurant Admin: List their own tickets.
   */
  async listOrgTickets(restaurantId: string, page = 1, limit = 20) {
    const { offset } = parsePagination({ page, limit });

    const { data, error, count } = await supabaseAdmin
      .from('support_tickets')
      .select('*', { count: 'exact' })
      .eq('restaurant_id', restaurantId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw new AppError('Failed to fetch support tickets', 500);

    return {
      tickets: data || [],
      meta: buildPaginationMeta(page, limit, count || 0),
    };
  }

  /**
   * Super Admin: List all support tickets.
   */
  async listAllTickets(page = 1, limit = 20) {
    const { offset } = parsePagination({ page, limit });

    const { data, error, count } = await supabaseAdmin
      .from('support_tickets')
      .select('*, organizations(name, email, slug)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw new AppError('Failed to fetch support tickets', 500);

    const tickets = (data || []).map((row: any) => ({
      ...row,
      restaurantName: row.organizations?.name,
      restaurantEmail: row.organizations?.email,
    }));

    return {
      tickets,
      meta: buildPaginationMeta(page, limit, count || 0),
    };
  }

  /**
   * Super Admin: Update a ticket status.
   */
  async updateTicketStatus(ticketId: string, status: string, userId: string) {
    const { data, error } = await supabaseAdmin
      .from('support_tickets')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', ticketId)
      .select()
      .single();

    if (error || !data) throw new NotFoundError('Support Ticket');

    await auditService.log({
      userId,
      action: `support_ticket.status_updated`,
      entityType: 'support_ticket',
      entityId: ticketId,
      changes: { status },
    });

    return data;
  }
}

export const supportService = new SupportService();
