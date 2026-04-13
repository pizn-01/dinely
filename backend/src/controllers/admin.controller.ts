import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/api.types';
import { adminService } from '../services/admin.service';

const param = (req: AuthenticatedRequest, key: string): string => req.params[key] as string;

export class AdminController {
  async listOrganizations(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string || '1', 10);
      const limit = parseInt(req.query.limit as string || '20', 10);
      const search = req.query.search as string | undefined;
      const result = await adminService.listOrganizations(page, limit, search);
      res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }

  async getOrganization(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = await adminService.getOrganization(param(req, 'id'));
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async updateOrganization(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = await adminService.updateOrganization(param(req, 'id'), req.body, req.user?.sub);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async toggleOrgStatus(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { isActive } = req.body;
      const result = await adminService.toggleOrganizationStatus(param(req, 'id'), isActive, req.user?.sub);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async getPlatformStats(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = await adminService.getPlatformStats();
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async listUsers(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string || '1', 10);
      const limit = parseInt(req.query.limit as string || '20', 10);
      const search = req.query.search as string | undefined;
      const result = await adminService.listUsers(page, limit, search);
      res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }

  async getSettings(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = await adminService.getSettings();
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async updateSetting(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = await adminService.updateSetting(param(req, 'key'), req.body.value, req.user?.sub);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async getAuditLog(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string || '1', 10);
      const limit = parseInt(req.query.limit as string || '50', 10);
      const result = await adminService.getAuditLog(page, limit, req.query as any);
      res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }

  async getOrganizationSubscription(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = await adminService.getSubscriptionDetails(param(req, 'id'));
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
}

export const adminController = new AdminController();
