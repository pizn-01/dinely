import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validator';
import { signupSchema, loginSchema, staffLoginSchema, forgotPasswordSchema, resetPasswordSchema, refreshTokenSchema, acceptInviteSchema, customerSignupSchema, customerLoginSchema } from '../validators/auth.validator';
import { staffService } from '../services/staff.service';
import { authLimiter, inviteLimiter } from '../middleware/rateLimiter';

const router = Router();

// Public routes — signup
router.post('/signup', authLimiter, validate(signupSchema), (req, res, next) => authController.signup(req, res, next));

// Login routes
router.post('/login', authLimiter, validate(loginSchema), (req, res, next) => authController.login(req, res, next));
router.post('/staff-login', authLimiter, validate(staffLoginSchema), (req, res, next) => authController.staffLogin(req, res, next));
router.post('/customer-login', authLimiter, validate(customerLoginSchema), (req, res, next) => authController.customerLogin(req, res, next));
router.post('/customer-signup', authLimiter, validate(customerSignupSchema), (req, res, next) => authController.customerSignup(req, res, next));

// Password reset
router.post('/forgot-password', validate(forgotPasswordSchema), (req, res, next) => authController.forgotPassword(req, res, next));
router.post('/reset-password', validate(resetPasswordSchema), (req, res, next) => authController.resetPassword(req, res, next));
router.post('/refresh', validate(refreshTokenSchema), (req, res, next) => authController.refreshToken(req, res, next));

// Accept staff invitation
router.post('/accept-invite', inviteLimiter, validate(acceptInviteSchema), async (req, res, next) => {
  try {
    const { token, password, name } = req.body;
    const result = await staffService.acceptInvite(token, password, name);
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

// Protected routes
router.get('/me', authenticate, (req, res, next) => authController.getProfile(req, res, next));
router.post('/logout', authenticate, (req, res) => authController.logout(req, res));

export default router;
