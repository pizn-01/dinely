import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/api.types';
import { reservationService } from '../services/reservation.service';
import { tableService } from '../services/table.service';
import { dashboardService } from '../services/dashboard.service';
import { waitingListService } from '../services/waitingList.service';
import { staffService } from '../services/staff.service';
import { customerService } from '../services/customer.service';
import { organizationService } from '../services/organization.service';
import { WaitingListStatus } from '../types/enums';

export class IntegrationController {
  // ─── Dashboard / Analytics ────────────────────────────────

  /**
   * Retrieves dashboard stats (today's covers, seated count, pending, etc.).
   */
  async getDashboardStats(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const restaurantId = req.restaurantId!;
      const result = await dashboardService.getStats(restaurantId);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Retrieves the weekly reservation trend data.
   */
  async getDashboardTrend(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const restaurantId = req.restaurantId!;
      const result = await dashboardService.getWeeklyTrend(restaurantId);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  // ─── Reservations ─────────────────────────────────────────

  /**
   * Retrieves reservations for the given restaurant, allowing for standard filters.
   * ePOS can use `?date=YYYY-MM-DD` to sync the daily manifest.
   */
  async getReservations(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const restaurantId = req.restaurantId!;
      const filters = req.query;
      const result = await reservationService.list(restaurantId, filters);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Retrieves a single reservation by ID.
   */
  async getReservationById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const restaurantId = req.restaurantId!;
      const reservationId = req.params.id as string;
      const result = await reservationService.getById(reservationId, restaurantId);
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
   * Updates an existing reservation's full details (table, time, party size, etc.).
   */
  async updateReservation(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const restaurantId = req.restaurantId!;
      const reservationId = req.params.id as string;
      const result = await reservationService.update(reservationId, restaurantId, req.body);
      res.json({ success: true, data: result });
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
   * Cancels a reservation.
   */
  async cancelReservation(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const restaurantId = req.restaurantId!;
      const reservationId = req.params.id as string;
      const { reason } = req.body || {};
      const result = await reservationService.cancel(reservationId, restaurantId, req.user?.sub, reason);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Retrieves calendar view data for a given date.
   */
  async getCalendarView(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const restaurantId = req.restaurantId!;
      const date = (req.query.date as string) || new Date().toISOString().split('T')[0];
      const result = await reservationService.getCalendarView(restaurantId, date);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Exports reservations as CSV.
   */
  async exportReservationsCsv(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const restaurantId = req.restaurantId!;
      const startDate = req.query.startDate as string | undefined;
      const endDate = req.query.endDate as string | undefined;
      const csv = await reservationService.exportCsv(restaurantId, startDate, endDate);

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=reservations-${new Date().toISOString().split('T')[0]}.csv`);
      res.send(csv);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Returns available tables for a given date, time, and party size.
   */
  async getAvailableTables(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const restaurantId = req.restaurantId!;
      const { date, time, partySize } = req.query;
      const result = await reservationService.getAvailableTables(
        restaurantId,
        date as string,
        time as string,
        parseInt(partySize as string, 10)
      );
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Returns available time slots for a given date and party size.
   */
  async getAvailableTimeSlots(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const restaurantId = req.restaurantId!;
      const { date, partySize } = req.query;
      const result = await reservationService.getAvailableTimeSlots(
        restaurantId,
        date as string,
        parseInt(partySize as string, 10)
      );
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  // ─── Tables ───────────────────────────────────────────────

  /**
   * Retrieves table definitions for the restaurant.
   */
  async getTables(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const restaurantId = req.restaurantId!;
      const tables = await tableService.listTables(restaurantId);
      res.json({ success: true, data: tables });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Retrieves a single table by ID.
   */
  async getTableById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const restaurantId = req.restaurantId!;
      const tableId = req.params.id as string;
      const table = await tableService.getTable(tableId, restaurantId);
      res.json({ success: true, data: table });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Creates a new table.
   */
  async createTable(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const restaurantId = req.restaurantId!;
      const result = await tableService.createTable(restaurantId, req.body);
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Updates an existing table.
   */
  async updateTable(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const restaurantId = req.restaurantId!;
      const tableId = req.params.id as string;
      const result = await tableService.updateTable(tableId, restaurantId, req.body);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Deletes a table.
   */
  async deleteTable(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const restaurantId = req.restaurantId!;
      const tableId = req.params.id as string;
      const result = await tableService.deleteTable(tableId, restaurantId);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  /**
   * List floor areas.
   */
  async listAreas(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const restaurantId = req.restaurantId!;
      const areas = await tableService.listAreas(restaurantId);
      res.json({ success: true, data: areas });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Creates a new floor area.
   */
  async createArea(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const restaurantId = req.restaurantId!;
      const result = await tableService.createArea(restaurantId, req.body);
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Updates a floor area.
   */
  async updateArea(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const restaurantId = req.restaurantId!;
      const areaId = req.params.areaId as string;
      const result = await tableService.updateArea(areaId, restaurantId, req.body);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Deletes a floor area.
   */
  async deleteArea(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const restaurantId = req.restaurantId!;
      const areaId = req.params.areaId as string;
      const result = await tableService.deleteArea(areaId, restaurantId);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  // ─── Waiting List ─────────────────────────────────────────

  /**
   * Retrieves the waiting list for the restaurant.
   */
  async getWaitingList(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const restaurantId = req.restaurantId!;
      const date = req.query.date as string | undefined;
      const result = await waitingListService.list(restaurantId, date);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Adds a new entry to the waiting list.
   */
  async addToWaitingList(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const restaurantId = req.restaurantId!;
      const result = await waitingListService.add(restaurantId, req.body);
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Updates waiting list entry status.
   */
  async updateWaitingListStatus(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const restaurantId = req.restaurantId!;
      const entryId = req.params.id as string;
      const { status } = req.body;
      const result = await waitingListService.updateStatus(entryId, restaurantId, status as WaitingListStatus);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Removes a waiting list entry.
   */
  async removeFromWaitingList(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const restaurantId = req.restaurantId!;
      const entryId = req.params.id as string;
      const result = await waitingListService.remove(entryId, restaurantId);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  // ─── Staff Management ────────────────────────────────────

  /**
   * Lists all staff members.
   */
  async listStaff(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const restaurantId = req.restaurantId!;
      const roleFilter = req.query.role as string | undefined;
      const result = await staffService.list(restaurantId, roleFilter);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Retrieves a staff member by ID.
   */
  async getStaffById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const restaurantId = req.restaurantId!;
      const staffId = req.params.id as string;
      const result = await staffService.getById(staffId, restaurantId);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Invites a new staff member.
   */
  async inviteStaff(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const restaurantId = req.restaurantId!;
      const result = await staffService.invite(restaurantId, req.body, undefined);
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Updates a staff member.
   */
  async updateStaff(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const restaurantId = req.restaurantId!;
      const staffId = req.params.id as string;
      const result = await staffService.update(staffId, restaurantId, req.body);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Removes a staff member.
   */
  async removeStaff(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const restaurantId = req.restaurantId!;
      const staffId = req.params.id as string;
      const result = await staffService.remove(staffId, restaurantId);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  // ─── Customer Directory ───────────────────────────────────

  /**
   * Lists customers linked to the restaurant.
   */
  async listCustomers(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const restaurantId = req.restaurantId!;
      const page = parseInt(req.query.page as string || '1', 10);
      const limit = parseInt(req.query.limit as string || '20', 10);
      const search = req.query.search as string | undefined;
      const result = await customerService.listForRestaurant(restaurantId, page, limit, search);
      res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }

  // ─── Organization / Settings ──────────────────────────────

  /**
   * Retrieves the restaurant's configuration and settings.
   */
  async getSettings(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const restaurantId = req.restaurantId!;
      const result = await organizationService.getById(restaurantId);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Updates the restaurant's configuration and settings.
   */
  async updateSettings(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const restaurantId = req.restaurantId!;
      const result = await organizationService.update(restaurantId, req.body);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
}

export const integrationController = new IntegrationController();
