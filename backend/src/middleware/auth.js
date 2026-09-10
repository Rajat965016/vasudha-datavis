import { ROLES } from '../config/constants.js';
import { User } from '../models/index.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { verifyAccessToken } from '../utils/jwt.js';

const extractToken = (req) => {
  const header = req.headers.authorization ?? '';
  if (header.startsWith('Bearer ')) return header.slice(7).trim();
  return null;
};

/**
 * Verifies the bearer token and attaches the live user record to `req.user`.
 *
 * The account is re-read on every request rather than trusted from the token,
 * so disabling or deleting an account takes effect immediately even though the
 * JWT itself is still cryptographically valid.
 */
export const requireAuth = asyncHandler(async (req, _res, next) => {
  const token = extractToken(req);
  if (!token) throw ApiError.unauthorized('Authentication required.');

  const payload = verifyAccessToken(token);
  const user = await User.findByPk(payload.sub);

  if (!user) throw ApiError.unauthorized('This account no longer exists.');
  if (!user.isActive) {
    throw ApiError.forbidden('This account has been disabled by the Super Admin.');
  }

  req.user = user;
  next();
});

/** Restricts a route to the listed roles. Must run after `requireAuth`. */
export const requireRole =
  (...roles) =>
  (req, _res, next) => {
    if (!req.user) return next(ApiError.unauthorized());
    if (!roles.includes(req.user.role)) {
      return next(ApiError.forbidden());
    }
    return next();
  };

export const requireSuperAdmin = requireRole(ROLES.SUPER_ADMIN);
