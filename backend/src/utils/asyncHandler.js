/**
 * Wraps an async Express handler so rejected promises reach `next()`
 * instead of becoming unhandled rejections.
 */
const asyncHandler = (handler) => (req, res, next) =>
  Promise.resolve(handler(req, res, next)).catch(next);

export default asyncHandler;
