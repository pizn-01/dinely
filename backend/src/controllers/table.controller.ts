import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/api.types';
import { tableService } from '../services/table.service';
import { parse } from 'csv-parse/sync';

// Helper to safely extract string param from Express v5
const param = (req: AuthenticatedRequest, key: string): string => req.params[key] as string;

export class TableController {
  // ─── Areas ────────────────────────────────────────────

  async listAreas(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = await tableService.listAreas(param(req, 'orgId'));
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async createArea(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = await tableService.createArea(param(req, 'orgId'), req.body);
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async updateArea(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = await tableService.updateArea(param(req, 'areaId'), param(req, 'orgId'), req.body);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async deleteArea(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = await tableService.deleteArea(param(req, 'areaId'), param(req, 'orgId'));
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  // ─── Tables ───────────────────────────────────────────

  async listTables(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = await tableService.listTables(param(req, 'orgId'));
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async getTable(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = await tableService.getTable(param(req, 'id'), param(req, 'orgId'));
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async createTable(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = await tableService.createTable(param(req, 'orgId'), req.body);
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async updateTable(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = await tableService.updateTable(param(req, 'id'), param(req, 'orgId'), req.body);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async deleteTable(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = await tableService.deleteTable(param(req, 'id'), param(req, 'orgId'));
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async importTables(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const file = (req as any).file;
      if (!file) {
        res.status(400).json({ success: false, error: 'CSV file is required' });
        return;
      }

      const csvContent = file.buffer.toString('utf-8');
      const records = parse(csvContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      });

      const tables = (records as any[]).map((row: any) => ({
        tableNumber: row['Table'] || row['table'] || row['table_number'] || '',
        capacity: parseInt(row['Capacity'] || row['capacity'] || '2', 10),
        area: row['Area'] || row['area'] || '',
        type: row['Type'] || row['type'] || '',
      }));

      const result = await tableService.importTables(param(req, 'orgId'), tables);
      res.status(201).json({ success: true, data: result, message: `${result.length} tables imported` });
    } catch (error) {
      next(error);
    }
  }

  async checkAvailability(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const date = req.query.date as string;
      const time = req.query.time as string;
      const partySize = req.query.partySize as string;

      if (!date || !time || !partySize) {
        res.status(400).json({
          success: false,
          error: 'date, time, and partySize query parameters are required',
        });
        return;
      }

      const { reservationService } = await import('../services/reservation.service');
      const result = await reservationService.getAvailableTables(
        param(req, 'orgId'),
        date,
        time,
        parseInt(partySize, 10)
      );

      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async bulkUpdatePositions(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { tables } = req.body;
      const result = await tableService.bulkUpdatePositions(param(req, 'orgId'), tables);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async mergeTables(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { sourceTableIds, mergedTable } = req.body;
      const result = await tableService.mergeTables(param(req, 'orgId'), sourceTableIds, mergedTable);
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async unmergeTable(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      await tableService.unmergeTable(param(req, 'id'), param(req, 'orgId'));
      res.json({ success: true, message: 'Table successfully unmerged' });
    } catch (error) {
      next(error);
    }
  }
}

export const tableController = new TableController();
