import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/api.types';
import { staffService } from '../services/staff.service';

// Helper to safely extract string param from Express v5
const param = (req: AuthenticatedRequest, key: string): string => req.params[key] as string;

export class StaffController {
  async list(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const roleFilter = req.query.role as string | undefined;
      const result = await staffService.list(param(req, 'orgId'), roleFilter);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async getById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = await staffService.getById(param(req, 'id'), param(req, 'orgId'));
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async invite(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const origin = req.headers.origin || req.headers.referer?.split('/').slice(0, 3).join('/');
      const result = await staffService.invite(param(req, 'orgId'), req.body, origin);
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async update(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = await staffService.update(param(req, 'id'), param(req, 'orgId'), req.body);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async remove(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = await staffService.remove(param(req, 'id'), param(req, 'orgId'));
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
}

export const staffController = new StaffController();
