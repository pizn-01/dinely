import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validator';
import { signupSchema, loginSchema, staffLoginSchema, forgotPasswordSchema, resetPasswordSchema, refreshTokenSchema, acceptInviteSchema, customerSignupSchema, customerLoginSchema } from '../validators/auth.validator';
import { staffService } from '../services/staff.service';
import { authLimiter, loginLimiter } from '../middleware/rateLimiter';

const router = Router();

// Apply general auth rate limiting to all auth routes (signup, forgot-password, etc.)
router.use(authLimiter);

// Public routes — signup
router.post('/signup', validate(signupSchema), (req, res, next) => authController.signup(req, res, next));

// Login routes — use stricter loginLimiter (10 attempts / 2 minutes)
router.post('/login', loginLimiter, validate(loginSchema), (req, res, next) => authController.login(req, res, next));
router.post('/staff-login', loginLimiter, validate(staffLoginSchema), (req, res, next) => authController.staffLogin(req, res, next));
router.post('/customer-login', loginLimiter, validate(customerLoginSchema), (req, res, next) => authController.customerLogin(req, res, next));
router.post('/customer-signup', validate(customerSignupSchema), (req, res, next) => authController.customerSignup(req, res, next));

// Password reset
router.post('/forgot-password', validate(forgotPasswordSchema), (req, res, next) => authController.forgotPassword(req, res, next));
router.post('/reset-password', validate(resetPasswordSchema), (req, res, next) => authController.resetPassword(req, res, next));
router.post('/refresh', validate(refreshTokenSchema), (req, res, next) => authController.refreshToken(req, res, next));

// Accept staff invitation (public — invited user has no account yet)
router.post('/accept-invite', validate(acceptInviteSchema), async (req, res, next) => {
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
