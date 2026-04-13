import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/api.types';
import { reservationService } from '../services/reservation.service';
import { supabaseAdmin } from '../config/database';

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
}

export const reservationController = new ReservationController();
