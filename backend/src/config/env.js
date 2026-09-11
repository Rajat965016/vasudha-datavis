import dotenv from 'dotenv';

dotenv.config();

/**
 * Reads an environment variable, falling back to `fallback`.
 * Throws when a variable is required in production but missing.
 */
const read = (key, fallback, { required = false } = {}) => {
  const value = process.env[key];
  if (value !== undefined && value !== '') return value;
  if (required && process.env.NODE_ENV === 'production') {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return fallback;
};

const toNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toBoolean = (value, fallback = false) => {
  if (value === undefined || value === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
};

const nodeEnv = read('NODE_ENV', 'development');

export const env = {
  nodeEnv,
  isProduction: nodeEnv === 'production',
  port: toNumber(read('PORT', 5000), 5000),

  corsOrigins: read('CORS_ORIGINS', 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),

  /**
   * PostgreSQL connection. `DATABASE_URL` wins when present, because most hosting
   * providers hand out a single connection string.
   */
  db: {
    url: read('DATABASE_URL', ''),
    host: read('DB_HOST', '127.0.0.1'),
    port: toNumber(read('DB_PORT', 5432), 5432),
    name: read('DB_NAME', 'vasudha_datavis'),
    user: read('DB_USER', 'postgres'),
    password: read('DB_PASSWORD', ''),
    ssl: toBoolean(read('DB_SSL', 'false')),
    sslRejectUnauthorized: toBoolean(read('DB_SSL_REJECT_UNAUTHORIZED', 'true'), true),
    // PEM contents of the provider's CA certificate. Providers such as Aiven
    // sign with their own CA, so supplying it here keeps certificate
    // verification switched on.
    sslCa: read('DB_SSL_CA', '').replace(/\\n/g, '\n'),
    poolMax: toNumber(read('DB_POOL_MAX', 10), 10),
    poolMin: toNumber(read('DB_POOL_MIN', 0), 0),
    logging: toBoolean(read('DB_LOGGING', 'false')),
    sync: toBoolean(read('DB_SYNC', 'true'), true),
  },

  jwtSecret: read('JWT_SECRET', 'insecure-development-secret', { required: true }),
  jwtExpiresIn: read('JWT_EXPIRES_IN', '7d'),
  passwordResetTtlMinutes: toNumber(read('PASSWORD_RESET_TTL_MINUTES', 30), 30),

  superAdmin: {
    name: read('SUPER_ADMIN_NAME', 'Vasudha Super Admin'),
    email: read('SUPER_ADMIN_EMAIL', 'superadmin@vasudhaindia.org').toLowerCase(),
    password: read('SUPER_ADMIN_PASSWORD', 'Admin@123'),
  },

  maxUploadBytes: toNumber(read('MAX_UPLOAD_BYTES', 5 * 1024 * 1024), 5 * 1024 * 1024),
  maxDatasetRows: toNumber(read('MAX_DATASET_ROWS', 20000), 20000),

  /** Throttling for the credential endpoints (login, forgot/reset password). */
  authRateLimit: {
    windowMinutes: toNumber(read('AUTH_RATE_LIMIT_WINDOW_MINUTES', 15), 15),
    max: toNumber(read('AUTH_RATE_LIMIT_MAX', 20), 20),
  },

  frontendUrl: read('FRONTEND_URL', 'http://localhost:5173').replace(/\/$/, ''),

  smtp: {
    host: read('SMTP_HOST', ''),
    port: toNumber(read('SMTP_PORT', 587), 587),
    secure: toBoolean(read('SMTP_SECURE', 'false')),
    user: read('SMTP_USER', ''),
    password: read('SMTP_PASSWORD', ''),
    from: read('MAIL_FROM', 'Vasudha Data Platform <no-reply@vasudhaindia.org>'),
  },
};

export default env;
