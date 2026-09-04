/** Central error handler: maps typed errors to safe JSON responses. */
import { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../errors';
import { IntegrationError } from '../services/integrations/http';
import { logger } from '../logger';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'Request validation failed', details: err.flatten() },
    });
  }
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: { code: err.code, message: err.message, details: err.details },
    });
  }
  if (err instanceof IntegrationError) {
    // Upstream/integration failures surface as 502 Bad Gateway.
    return res.status(502).json({
      error: { code: 'INTEGRATION_ERROR', message: err.message, platform: err.platform },
    });
  }
  logger.error({ err }, 'Unhandled error');
  return res.status(500).json({
    error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' },
  });
}

export function notFoundHandler(_req: Request, res: Response) {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Route not found' } });
}
