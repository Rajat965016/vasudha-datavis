import { Sequelize } from 'sequelize';

import env from './env.js';
import logger from '../utils/logger.js';

const isCloudHost =
  Boolean(env.db.url) &&
  (env.db.url.includes('render.com') || env.db.url.includes('sslmode=require'));
const useSsl = env.db.ssl || isCloudHost;

const dialectOptions = {
  ...(useSsl
    ? {
        ssl: {
          require: true,
          rejectUnauthorized: env.db.sslRejectUnauthorized,
          ...(env.db.sslCa ? { ca: env.db.sslCa } : {}),
        },
      }
    : {}),
};

const commonOptions = {
  dialect: 'postgres',
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
    // snake_case columns in the database, camelCase attributes in JavaScript.
    underscored: true,
    freezeTableName: false,
  },
};

/**
 * A single shared Sequelize instance. `DATABASE_URL` is preferred because most
 * managed PostgreSQL providers hand out one connection string.
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
  logger.info(`PostgreSQL connected → ${sequelize.getDatabaseName()}`);
  return sequelize;
};

export const disconnectDatabase = async () => {
  await sequelize.close();
  logger.info('PostgreSQL connection closed');
};

export default sequelize;
