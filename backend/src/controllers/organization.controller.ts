import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/api.types';
import { organizationService } from '../services/organization.service';
import { supportService } from '../services/support.service';

// Helper to safely extract string param from Express v5
const param = (req: AuthenticatedRequest, key: string): string => req.params[key] as string;

export class OrganizationController {
  async getById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = await organizationService.getById(param(req, 'orgId'));
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async update(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = await organizationService.update(param(req, 'orgId'), req.body);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async updateSetup(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { setupStep, setupCompleted } = req.body;
      const result = await organizationService.updateSetup(param(req, 'orgId'), setupStep, setupCompleted);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async getStats(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = await organizationService.getStats(param(req, 'orgId'));
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async uploadLogo(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const file = (req as any).file;
      if (!file) {
        res.status(400).json({ success: false, error: 'Image file is required' });
        return;
      }
      
      const paramId = (req as any).params.orgId; // safely get param in express 5
      const result = await organizationService.uploadLogo(paramId, file);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async uploadWidgetBg(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const file = (req as any).file;
      if (!file) {
        res.status(400).json({ success: false, error: 'Image file is required' });
        return;
      }
      
      const paramId = (req as any).params.orgId;
      const result = await organizationService.uploadWidgetBg(paramId, file);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async createSupportTicket(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { subject, message } = req.body;
      const paramId = (req as any).params.orgId;
      const result = await supportService.createTicket(paramId, req.user?.sub as string, subject, message);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async listSupportTickets(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string || '1', 10);
      const limit = parseInt(req.query.limit as string || '20', 10);
      const paramId = (req as any).params.orgId;
      const result = await supportService.listOrgTickets(paramId, page, limit);
      res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }
}

export const organizationController = new OrganizationController();
