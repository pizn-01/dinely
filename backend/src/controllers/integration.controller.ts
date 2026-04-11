import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/api.types';
import { reservationService } from '../services/reservation.service';
import { tableService } from '../services/table.service';

export class IntegrationController {
  /**
   * Retrieves reservations for the given restaurant, allowing for standard filters.
   * ePOS can use `?date=YYYY-MM-DD` to sync the daily manifest.
   */
  async getReservations(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const restaurantId = req.restaurantId!;
      // Allow ePOS to use the same pagination/filtering methods
      const filters = req.query;
      const result = await reservationService.list(restaurantId, filters);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Pushes a new reservation into Dinely.
   * Typical use-case: walk-in guests created directly on the ePOS.
   */
  async createReservation(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const restaurantId = req.restaurantId!;
      // The 'epos_integration' acts as the staff ID to bypass advance booking windows.
      const result = await reservationService.create(restaurantId, req.body, 'epos_integration');
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Updates an existing reservation's status.
   * Typical use-case: marking a party as 'seated' or 'completed' upon ePOS actions.
   */
  async updateReservationStatus(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const restaurantId = req.restaurantId!;
      const reservationId = req.params.id as string;
      const { status, cancellationReason } = req.body;
      
      const result = await reservationService.updateStatus(
        reservationId, 
        restaurantId, 
        status, 
        req.user?.sub, // Passing the API key ID to audit logs
        cancellationReason
      );
      
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Retrieves full table definitions for the restaurant to allow DB-level mapping.
   */
  async getTables(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const restaurantId = req.restaurantId!;
      // We use listTables instead of listPublicTables to provide full DB-level access
      const tables = await tableService.listTables(restaurantId);
      res.json({ success: true, data: tables });
    } catch (error) {
      next(error);
    }
  }
}

export const integrationController = new IntegrationController();
