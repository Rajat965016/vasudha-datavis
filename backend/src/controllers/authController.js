import env from '../config/env.js';
import User from '../models/User.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { signAccessToken } from '../utils/jwt.js';
import { isMailEnabled, sendPasswordResetEmail } from '../utils/mailer.js';

/** POST /api/auth/login */
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select('+passwordHash');
  // Same message for "no such user" and "wrong password" – avoids account enumeration.
  const invalid = ApiError.unauthorized('Incorrect email or password.');
  if (!user) throw invalid;

  const passwordMatches = await user.verifyPassword(password);
  if (!passwordMatches) throw invalid;

  if (!user.isActive) {
    throw ApiError.forbidden(
      'This account has been disabled. Please contact the Super Admin.',
    );
  }

  user.lastLoginAt = new Date();
  await user.save({ validateBeforeSave: false });

  res.json({
    success: true,
    data: {
      token: signAccessToken(user),
      user: user.toJSON(),
    },
  });
});

/** GET /api/auth/me */
export const getProfile = asyncHandler(async (req, res) => {
  res.json({ success: true, data: { user: req.user.toJSON() } });
});

/** POST /api/auth/change-password */
export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const user = await User.findById(req.user._id).select('+passwordHash');
  const matches = await user.verifyPassword(currentPassword);
  if (!matches) throw ApiError.badRequest('Your current password is incorrect.');

  if (currentPassword === newPassword) {
    throw ApiError.badRequest('The new password must be different from the current one.');
  }

  await user.setPassword(newPassword);
  user.mustChangePassword = false;
  await user.save();

  res.json({ success: true, message: 'Your password has been updated.' });
});

/**
 * POST /api/auth/forgot-password
 * Always answers 200 so the endpoint cannot be used to discover which
 * addresses have accounts.
 */
export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const genericResponse = {
    success: true,
    message:
      'If an account exists for that email address, a password reset link has been sent.',
  };

  const user = await User.findOne({ email }).select(
    '+resetPasswordTokenHash +resetPasswordExpiresAt',
  );

  if (!user || !user.isActive) {
    res.json(genericResponse);
    return;
  }

  const rawToken = user.createPasswordResetToken(env.passwordResetTtlMinutes);
  await user.save({ validateBeforeSave: false });

  const resetUrl = `${env.frontendUrl}/reset-password?token=${rawToken}`;
  await sendPasswordResetEmail({
    name: user.name,
    email: user.email,
    resetUrl,
    ttlMinutes: env.passwordResetTtlMinutes,
  });

  res.json({
    ...genericResponse,
    // Without SMTP configured the link is returned so the flow stays testable
    // on a free deployment. Never exposed once email is switched on.
    ...(isMailEnabled() || env.isProduction ? {} : { data: { resetUrl } }),
  });
});

/** POST /api/auth/reset-password */
export const resetPassword = asyncHandler(async (req, res) => {
  const { token, password } = req.body;

  const user = await User.findOne({
    resetPasswordTokenHash: User.hashResetToken(token),
    resetPasswordExpiresAt: { $gt: new Date() },
  }).select('+passwordHash +resetPasswordTokenHash +resetPasswordExpiresAt');

  if (!user) {
    throw ApiError.badRequest('This password reset link is invalid or has expired.');
  }
  if (!user.isActive) {
    throw ApiError.forbidden('This account has been disabled.');
  }

  await user.setPassword(password);
  user.mustChangePassword = false;
  await user.save();

  res.json({
    success: true,
    message: 'Your password has been reset. You can now sign in.',
  });
});
