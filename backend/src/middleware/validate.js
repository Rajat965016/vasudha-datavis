import ApiError from '../utils/ApiError.js';

/**
 * Validates `req[source]` against a Zod schema and replaces it with the parsed
 * result, so controllers always receive clean, typed input.
 */
const validate =
  (schema, source = 'body') =>
  (req, _res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      const errors = result.error.issues.map((issue) => ({
        field: issue.path.join('.') || source,
        message: issue.message,
      }));
      return next(ApiError.unprocessable('Please correct the highlighted fields.', { errors }));
    }
    req[source] = result.data;
    return next();
  };

export default validate;
