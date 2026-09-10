import compression from 'compression';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';

import env from './config/env.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import routes from './routes/index.js';

const createApp = () => {
  const app = express();

  // Render/Vercel sit behind a proxy; needed for correct client IPs (rate limiting).
  app.set('trust proxy', 1);

  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(compression());

  const allowAllOrigins = env.corsOrigins.includes('*');
  app.use(
    cors({
      origin: allowAllOrigins
        ? true
        : (origin, callback) => {
            // Allow same-origin/server-to-server requests, which send no Origin.
            if (!origin || env.corsOrigins.includes(origin)) return callback(null, true);
            return callback(new Error(`Origin ${origin} is not allowed by CORS`));
          },
      credentials: true,
    }),
  );

  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  if (!env.isProduction) app.use(morgan('dev'));

  app.get('/', (_req, res) => {
    res.json({
      success: true,
      service: 'Vasudha Climate, Energy & Power data platform API',
      docs: '/api/health',
    });
  });

  app.use('/api', routes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};

export default createApp;
