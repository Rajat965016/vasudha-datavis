import mongoose from 'mongoose';

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

  if (error instanceof mongoose.Error.ValidationError) {
    normalised = ApiError.unprocessable('Please correct the highlighted fields.', {
      errors: Object.values(error.errors).map((issue) => ({
        field: issue.path,
        message: issue.message,
      })),
    });
  } else if (error instanceof mongoose.Error.CastError) {
    normalised = ApiError.badRequest(`Invalid identifier: ${error.value}`);
  } else if (error?.code === 11000) {
    const field = Object.keys(error.keyValue ?? {})[0] ?? 'field';
    normalised = ApiError.conflict(`A record with this ${field} already exists.`);
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
