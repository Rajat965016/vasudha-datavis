import { Sequelize } from 'sequelize';

import env from './env.js';
import logger from '../utils/logger.js';

const dialectOptions = {
  // Store and read timestamps in UTC so behaviour is identical wherever the
  // database happens to be hosted.
  dateStrings: false,
  ...(env.db.ssl
    ? { ssl: { rejectUnauthorized: env.db.sslRejectUnauthorized } }
    : {}),
};

const commonOptions = {
  dialect: 'mysql',
  timezone: '+00:00',
  dialectOptions,
  logging: env.db.logging ? (sql) => logger.info(sql) : false,
  pool: {
    max: env.db.poolMax,
    min: env.db.poolMin,
    acquire: 30000,
    idle: 10000,
  },
  define: {
    // snake_case columns in MySQL, camelCase attributes in JavaScript.
    underscored: true,
    freezeTableName: false,
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci',
  },
};

/**
 * A single shared Sequelize instance. `DATABASE_URL` is preferred because most
 * managed MySQL providers hand out one connection string.
 */
export const sequelize = env.db.url
  ? new Sequelize(env.db.url, commonOptions)
  : new Sequelize(env.db.name, env.db.user, env.db.password, {
      ...commonOptions,
      host: env.db.host,
      port: env.db.port,
    });

export const connectDatabase = async () => {
  await sequelize.authenticate();
  logger.info(`MySQL connected → ${sequelize.getDatabaseName()}`);
  return sequelize;
};

export const disconnectDatabase = async () => {
  await sequelize.close();
  logger.info('MySQL connection closed');
};

export default sequelize;
