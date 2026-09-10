import { Router } from 'express';
import rateLimit from 'express-rate-limit';

import {
  changePassword,
  forgotPassword,
  getProfile,
  login,
  resetPassword,
} from '../controllers/authController.js';
import { requireAuth } from '../middleware/auth.js';
import validate from '../middleware/validate.js';
import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  resetPasswordSchema,
} from '../validators/authValidators.js';

const router = Router();

/** Throttles credential guessing without affecting normal use. */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { success: false, message: 'Too many attempts. Please try again in a few minutes.' },
});

router.post('/login', authLimiter, validate(loginSchema), login);
router.post('/forgot-password', authLimiter, validate(forgotPasswordSchema), forgotPassword);
router.post('/reset-password', authLimiter, validate(resetPasswordSchema), resetPassword);

router.get('/me', requireAuth, getProfile);
router.post('/change-password', requireAuth, validate(changePasswordSchema), changePassword);

export default router;
