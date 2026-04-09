import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/api.types';
import { authService } from '../services/auth.service';
import { revokeToken } from '../middleware/auth';

export class AuthController {
  async signup(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = await authService.signup(req.body);
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async customerSignup(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = await authService.customerSignup(req.body);
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async customerLogin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = await authService.customerLogin(req.body);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async login(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = await authService.login(req.body);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async staffLogin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = await authService.staffLogin(req.body);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async getProfile(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'Not authenticated' });
        return;
      }
      const result = await authService.getProfile(req.user.sub);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async logout(req: AuthenticatedRequest, res: Response) {
    // Server-side token invalidation: add the token's unique ID to the blocklist
    if (req.user?.jti) {
      revokeToken(req.user.jti);
    }
    res.json({ success: true, message: 'Logged out successfully' });
  }

  async forgotPassword(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const origin = req.body.origin || req.headers.origin as string;
      const result = await authService.forgotPassword(req.body.email, req.body.slug, origin);
      res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }

  async resetPassword(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { accessToken, newPassword } = req.body;
      const result = await authService.resetPassword(accessToken, newPassword);
      res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }

  async refreshToken(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { refreshToken } = req.body;
      if (!refreshToken) {
        res.status(400).json({ success: false, error: 'Refresh token is required' });
        return;
      }
      const result = await authService.refreshToken(refreshToken);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
}

export const authController = new AuthController();
