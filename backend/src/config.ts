/**
 * Centralised, validated configuration. The process refuses to start if a
 * required variable is missing or malformed, so misconfiguration fails fast
 * rather than at the first request.
 */
import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 characters'),
  JWT_EXPIRES_IN: z.string().default('8h'),
  BCRYPT_ROUNDS: z.coerce.number().int().min(4).max(15).default(12),
  DMS_BASE_URL: z.string().url().default('http://localhost:5101'),
  DMS_API_KEY: z.string().default('dms-sample-key'),
  IDENTITY_BASE_URL: z.string().url().default('http://localhost:5102'),
  IDENTITY_API_KEY: z.string().default('identity-sample-key'),
});

// In test runs we don't require a real database or secret.
const testDefaults = {
  DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
  JWT_SECRET: 'test-secret-value-1234567890',
};

const raw =
  process.env.NODE_ENV === 'test'
    ? { ...testDefaults, ...process.env }
    : process.env;

const parsed = schema.safeParse(raw);
if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error('Invalid environment configuration:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const config = parsed.data;
export type AppConfig = typeof config;
