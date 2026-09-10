import mongoose from 'mongoose';

import env from './env.js';
import logger from '../utils/logger.js';

mongoose.set('strictQuery', true);

/** Opens the shared MongoDB connection. Safe to call once at boot. */
export const connectDatabase = async (uri = env.mongoUri) => {
  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 15000,
    autoIndex: !env.isProduction,
  });
  logger.info(`MongoDB connected → ${mongoose.connection.name}`);
  return mongoose.connection;
};

export const disconnectDatabase = async () => {
  await mongoose.connection.close();
  logger.info('MongoDB connection closed');
};

export default connectDatabase;
