/** Structured logger. JSON in production, pretty in development. */
import pino from 'pino';
import { config } from './config';

export const logger = pino({
  level: config.NODE_ENV === 'production' ? 'info' : 'debug',
  redact: {
    // Never log credentials or tokens.
    paths: ['req.headers.authorization', 'password', '*.password', '*.passwordHash'],
    remove: true,
  },
});
