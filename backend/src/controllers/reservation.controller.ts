import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/api.types';
import { reservationService } from '../services/reservation.service';
import { supabaseAdmin } from '../config/database';
import { parse } from 'csv-parse/sync';

// Helper to safely extract string param from Express v5
const param = (req: AuthenticatedRequest, key: string): string => req.params[key] as string;

export class ReservationController {
  async list(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = await reservationService.list(param(req, 'orgId'), req.query as any);
      res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }

  async getById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = await reservationService.getById(param(req, 'id'), param(req, 'orgId'));
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async create(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = await reservationService.create(
        param(req, 'orgId'),
        req.body,
        req.user?.sub
      );
      
      // Broadcast state change
      supabaseAdmin.channel(`restaurant_${param(req, 'orgId')}`).send({
        type: 'broadcast',
        event: 'RESERVATION_CREATED',
        payload: result
      });
      
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async update(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = await reservationService.update(param(req, 'id'), param(req, 'orgId'), req.body);
      
      // Broadcast state change
      supabaseAdmin.channel(`restaurant_${param(req, 'orgId')}`).send({
        type: 'broadcast',
        event: 'RESERVATION_UPDATED',
        payload: result
      });
      
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async updateStatus(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { status, cancellationReason } = req.body;
      const result = await reservationService.updateStatus(
        param(req, 'id'),
        param(req, 'orgId'),
        status,
        req.user?.sub,
        cancellationReason
      );
      
      // Broadcast state change
      supabaseAdmin.channel(`restaurant_${param(req, 'orgId')}`).send({
        type: 'broadcast',
        event: 'RESERVATION_STATUS_UPDATED',
        payload: result
      });
      
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async cancel(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { reason } = req.body || {};
      const result = await reservationService.cancel(
        param(req, 'id'),
        param(req, 'orgId'),
        req.user?.sub,
        reason
      );
      
      // Broadcast state change
      supabaseAdmin.channel(`restaurant_${param(req, 'orgId')}`).send({
        type: 'broadcast',
        event: 'RESERVATION_CANCELLED',
        payload: result
      });
      
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async getCalendarView(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const date = (req.query.date as string) || new Date().toISOString().split('T')[0];
      const result = await reservationService.getCalendarView(param(req, 'orgId'), date);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async exportCsv(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const startDate = req.query.startDate as string | undefined;
      const endDate = req.query.endDate as string | undefined;
      const csv = await reservationService.exportCsv(param(req, 'orgId'), startDate, endDate);

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=reservations-${new Date().toISOString().split('T')[0]}.csv`);
      res.send(csv);
    } catch (error) {
      next(error);
    }
  }

  async updateTotalAmount(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { totalAmount } = req.body;
      const result = await reservationService.updateTotalAmount(
        param(req, 'id'),
        param(req, 'orgId'),
        totalAmount
      );
      
      // Broadcast state change
      supabaseAdmin.channel(`restaurant_${param(req, 'orgId')}`).send({
        type: 'broadcast',
        event: 'RESERVATION_UPDATED',
        payload: result
      });
      
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async getTableRevenueReport(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { startDate, endDate, tableId } = req.query;
      const result = await reservationService.getTableRevenueReport(
        param(req, 'orgId'),
        startDate as string,
        endDate as string,
        tableId as string | undefined
      );
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async getMonthlyReservationCounts(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const year = parseInt(req.query.year as string, 10);
      const month = parseInt(req.query.month as string, 10);
      if (!year || !month || month < 1 || month > 12) {
        return res.status(400).json({ success: false, error: 'Valid year and month (1-12) are required' });
      }
      const result = await reservationService.getMonthlyReservationCounts(param(req, 'orgId'), year, month);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
  async importCsv(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const file = (req as any).file;
      if (!file) {
        res.status(400).json({ success: false, error: 'CSV file is required' });
        return;
      }

      const orgId = param(req, 'orgId');
      const csvContent = file.buffer.toString('utf-8');
      
      let records: any[];
      try {
        records = parse(csvContent, {
          columns: true,
          skip_empty_lines: true,
          trim: true,
          relax_column_count: true,
        });
      } catch (parseErr: any) {
        res.status(400).json({ success: false, error: `Invalid CSV format: ${parseErr.message}` });
        return;
      }

      if (!records || records.length === 0) {
        res.status(400).json({ success: false, error: 'CSV file is empty or has no valid rows' });
        return;
      }

      // Fetch org tables for table matching
      const { data: orgTables } = await supabaseAdmin
        .from('tables')
        .select('id, table_number, name')
        .eq('restaurant_id', orgId)
        .eq('is_active', true);

      const tableMap = new Map<string, string>();
      for (const t of (orgTables || [])) {
        tableMap.set(String(t.table_number).toLowerCase(), t.id);
        if (t.name) tableMap.set(t.name.toLowerCase(), t.id);
      }

      const imported: any[] = [];
      const errors: Array<{ row: number; error: string }> = [];

      for (let i = 0; i < records.length; i++) {
        const row = records[i];
        try {
          // Map CSV columns (case-insensitive by supporting common header variations)
          const date = row['Date'] || row['date'] || row['reservation_date'] || row['Reservation Date'] || '';
          const time = row['Time'] || row['time'] || row['start_time'] || row['Start Time'] || '';
          const partySizeStr = row['Party Size'] || row['party_size'] || row['Guests'] || row['guests'] || row['PartySize'] || '';
          const firstName = row['First Name'] || row['first_name'] || row['FirstName'] || row['Guest Name'] || row['Name'] || row['name'] || '';
          const lastName = row['Last Name'] || row['last_name'] || row['LastName'] || '';
          const email = row['Email'] || row['email'] || row['Guest Email'] || '';
          const phone = row['Phone'] || row['phone'] || row['Guest Phone'] || '';
          const tableName = row['Table'] || row['table'] || row['Table Name'] || row['table_name'] || '';
          const specialRequests = row['Special Requests'] || row['special_requests'] || row['Notes'] || row['notes'] || '';
          const source = row['Source'] || row['source'] || 'phone';

          // Validate required fields
          if (!date) { errors.push({ row: i + 2, error: 'Missing date' }); continue; }
          if (!time) { errors.push({ row: i + 2, error: 'Missing time' }); continue; }
          if (!firstName) { errors.push({ row: i + 2, error: 'Missing guest first name' }); continue; }

          // Validate date format (YYYY-MM-DD)
          const dateMatch = date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
          let formattedDate = date;
          if (!dateMatch) {
            // Try DD/MM/YYYY
            const altMatch = date.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
            if (altMatch) {
              formattedDate = `${altMatch[3]}-${altMatch[2].padStart(2, '0')}-${altMatch[1].padStart(2, '0')}`;
            } else {
              errors.push({ row: i + 2, error: `Invalid date format: "${date}". Use YYYY-MM-DD or DD/MM/YYYY` });
              continue;
            }
          }

          // Validate time format (HH:MM)
          const timeMatch = time.match(/^(\d{1,2}):(\d{2})$/);
          if (!timeMatch) {
            errors.push({ row: i + 2, error: `Invalid time format: "${time}". Use HH:MM` });
            continue;
          }
          const formattedTime = `${timeMatch[1].padStart(2, '0')}:${timeMatch[2]}`;

          const partySize = parseInt(partySizeStr, 10) || 2;

          // Match table by name or number
          let tableId: string | undefined;
          if (tableName) {
            tableId = tableMap.get(tableName.toLowerCase());
          }

          const dto = {
            reservationDate: formattedDate,
            startTime: formattedTime,
            partySize,
            guestFirstName: firstName,
            guestLastName: lastName || undefined,
            guestEmail: email || `guest-import-${Date.now()}-${i}@placeholder.com`,
            guestPhone: phone || undefined,
            tableId: tableId || undefined,
            specialRequests: specialRequests || undefined,
            source: source as any,
          };

          const result = await reservationService.create(orgId, dto, req.user?.sub);
          imported.push(result);
        } catch (err: any) {
          errors.push({ row: i + 2, error: err.message || 'Unknown error' });
        }
      }

      res.status(201).json({
        success: true,
        data: {
          imported: imported.length,
          failed: errors.length,
          total: records.length,
          errors: errors.slice(0, 50), // Cap error details
        },
        message: `${imported.length} reservation(s) imported successfully${errors.length > 0 ? `, ${errors.length} failed` : ''}`
      });
    } catch (error) {
      next(error);
    }
  }
}

export const reservationController = new ReservationController();
