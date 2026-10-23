import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import { env } from './config/env';
import { logger } from './config/logger';
import { errorHandler } from './middlewares/errorHandler';
import { notFound } from './middlewares/notFound';
import { apiLimiter } from './middlewares/rateLimiter';
import { requireCsrfHeader } from './middlewares/requireCsrfHeader';
import { apiRouter } from './routes';

/** Builds the Express app without starting it, so tests can import it. */
export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  // Trust one proxy hop (the Vite dev proxy or a hosting load balancer) for the client IP.
  app.set('trust proxy', 1);
  app.use(helmet());
  app.use(cors({ origin: env.CLIENT_URL, credentials: true }));
  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());
  app.use(
    pinoHttp({
      logger,
      autoLogging: env.NODE_ENV !== 'test',
      // One short line per request: method, URL, status and time. No headers or cookies.
      serializers: {
        req: (req: { method: string; url: string }) => ({ method: req.method, url: req.url }),
        res: (res: { statusCode: number }) => ({ statusCode: res.statusCode }),
      },
    }),
  );

  app.use('/api/v1', apiLimiter, requireCsrfHeader, apiRouter);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
