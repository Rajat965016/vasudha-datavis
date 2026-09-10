import {
  DatabaseError,
  ForeignKeyConstraintError,
  UniqueConstraintError,
  ValidationError,
} from 'sequelize';

import env from '../config/env.js';
import ApiError from '../utils/ApiError.js';
import logger from '../utils/logger.js';

export const notFoundHandler = (req, _res, next) => {
  next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
};

/** Translates known error shapes into a single JSON envelope. */
// eslint-disable-next-line no-unused-vars
export const errorHandler = (error, req, res, _next) => {
  let normalised = error;

  if (error instanceof UniqueConstraintError) {
    const field = error.errors?.[0]?.path ?? 'value';
    normalised = ApiError.conflict(`A record with this ${field} already exists.`);
  } else if (error instanceof ValidationError) {
    normalised = ApiError.unprocessable('Please correct the highlighted fields.', {
      errors: error.errors.map((issue) => ({
        field: issue.path,
        message: issue.message,
      })),
    });
  } else if (error instanceof ForeignKeyConstraintError) {
    normalised = ApiError.conflict(
      'This record is still referenced by other data and cannot be changed.',
    );
  } else if (error instanceof DatabaseError) {
    // Never leak SQL, table names or the query itself to a client.
    logger.error('Database error:', error.message);
    normalised = ApiError.internal(
      env.isProduction ? 'A database error occurred. Please try again.' : error.message,
    );
  } else if (!(error instanceof ApiError)) {
    normalised = ApiError.internal(
      env.isProduction ? 'Something went wrong. Please try again.' : error.message,
    );
  }

  if (normalised.statusCode >= 500) {
    logger.error(`${req.method} ${req.originalUrl}`, error);
  }

  res.status(normalised.statusCode).json({
    success: false,
    message: normalised.message,
    ...(normalised.details ? { details: normalised.details } : {}),
    ...(env.isProduction ? {} : { stack: error.stack }),
  });
};

export default errorHandler;
