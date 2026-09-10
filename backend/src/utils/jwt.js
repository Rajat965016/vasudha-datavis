import jwt from 'jsonwebtoken';

import env from '../config/env.js';
import ApiError from './ApiError.js';

export const signAccessToken = (user) =>
  jwt.sign(
    { sub: String(user.id), role: user.role, email: user.email },
    env.jwtSecret,
    { expiresIn: env.jwtExpiresIn },
  );

export const verifyAccessToken = (token) => {
  try {
    return jwt.verify(token, env.jwtSecret);
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw ApiError.unauthorized('Your session has expired. Please sign in again.');
    }
    throw ApiError.unauthorized('Invalid authentication token.');
  }
};
