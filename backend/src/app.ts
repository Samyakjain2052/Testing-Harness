import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { getConfig } from './config/index.js';
import { errorHandler } from './middleware/error-handler.js';
import { createRoutes } from './routes/index.js';

export function createApp(): express.Application {
  const config = getConfig();
  const app = express();

  // Security
  app.use(helmet());
  app.use(
    cors({
      origin: config.CORS_ORIGIN.split(','),
      credentials: true,
    }),
  );

  // Rate limiting
  app.use(
    rateLimit({
      windowMs: 60 * 1000,
      max: 200,
      standardHeaders: true,
      legacyHeaders: false,
      message: {
        success: false,
        error: { code: 'RATE_LIMITED', message: 'Too many requests, please try again later' },
      },
    }),
  );

  // Parsing
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Logging
  if (config.NODE_ENV !== 'test') {
    app.use(morgan('short'));
  }

  // Health check
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // API routes
  app.use('/api/v1', createRoutes());

  // Error handler (must be last)
  app.use(errorHandler);

  return app;
}
