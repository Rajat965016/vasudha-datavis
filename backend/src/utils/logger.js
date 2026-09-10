/* eslint-disable no-console */

/** Minimal timestamped logger – avoids a dependency for a tiny concern. */
const stamp = () => new Date().toISOString();

const logger = {
  info: (...args) => console.log(`[${stamp()}] [info ]`, ...args),
  warn: (...args) => console.warn(`[${stamp()}] [warn ]`, ...args),
  error: (...args) => console.error(`[${stamp()}] [error]`, ...args),
};

export default logger;
