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
  if (value === undefined) return fallback;
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

  mongoUri: read('MONGODB_URI', 'mongodb://127.0.0.1:27017/vasudha_datavis', {
    required: true,
  }),

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
