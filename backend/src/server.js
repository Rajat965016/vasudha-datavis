import createApp from './app.js';
import env from './config/env.js';
import { connectDatabase } from './config/db.js';
import { syncDatabase } from './models/index.js';
import { ensureSuperAdmin } from './seed/ensureSuperAdmin.js';
import logger from './utils/logger.js';

const start = async () => {
  try {
    await connectDatabase();

    // Creates any missing tables. Disable with DB_SYNC=false once the schema
    // is managed elsewhere (database/schema.sql or a migration tool).
    if (env.db.sync) {
      await syncDatabase();
      logger.info('Database schema verified');
    }

    // Guarantees the default Super Admin exists on every deployment.
    await ensureSuperAdmin();

    const app = createApp();
    const server = app.listen(env.port, () => {
      logger.info(`API listening on port ${env.port} (${env.nodeEnv})`);
    });

    const shutdown = (signal) => {
      logger.info(`${signal} received — shutting down`);
      server.close(() => process.exit(0));
      setTimeout(() => process.exit(1), 10000).unref();
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

start();
