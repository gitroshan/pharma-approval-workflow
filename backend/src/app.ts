import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import { config } from './config';
import { logger } from './logger';
import { errorHandler, notFoundHandler } from './middleware/error';
import { authRouter } from './routes/auth.routes';
import { requestsRouter } from './routes/requests.routes';
import { auditRouter } from './routes/audit.routes';
import { integrationRouter } from './routes/integration.routes';

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: config.CORS_ORIGIN.split(',').map((o) => o.trim()),
      credentials: true,
    }),
  );
  app.use(express.json({ limit: '1mb' }));
  app.use(pinoHttp({ logger }));

  // Liveness/readiness probe for container orchestration.
  app.get('/health', (_req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

  app.use('/api/auth', authRouter);
  app.use('/api/requests', requestsRouter);
  app.use('/api/audit', auditRouter);
  app.use('/api/integrations', integrationRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
