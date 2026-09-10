/**
 * Creates the database schema, then exits.
 *
 *   npm run db:sync            # create any missing tables
 *   npm run db:sync -- --force # DROP every table and recreate (destructive)
 */
import { connectDatabase, disconnectDatabase } from '../config/db.js';
import { syncDatabase } from '../models/index.js';
import logger from '../utils/logger.js';

const force = process.argv.includes('--force');

const run = async () => {
  await connectDatabase();

  if (force) {
    logger.warn('--force given: dropping and recreating every table.');
  }
  await syncDatabase({ force });

  logger.info('Schema is up to date.');
  await disconnectDatabase();
  process.exit(0);
};

run().catch(async (error) => {
  logger.error('Schema sync failed:', error);
  await disconnectDatabase().catch(() => {});
  process.exit(1);
});
