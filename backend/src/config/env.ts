import 'dotenv/config';
import { z } from 'zod';

// Every environment variable the server needs, validated once at startup.
// A missing or invalid value stops the app with a clear message instead of failing later.
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  CLIENT_URL: z.url().default('http://localhost:5173'),
  DATABASE_URL: z.string().startsWith('postgresql://', 'DATABASE_URL must be a PostgreSQL URL'),

  // Authentication
  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
  ACCESS_TOKEN_TTL_MINUTES: z.coerce.number().int().positive().default(15),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(7),
  BCRYPT_SALT_ROUNDS: z.coerce.number().int().min(4).max(15).default(12),
  // Cookies are sent only over HTTPS when true. Must be true in production.
  COOKIE_SECURE: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const problems = parsed.error.issues.map(
    (issue) => `  - ${issue.path.join('.')}: ${issue.message}`,
  );
  throw new Error(
    `Invalid environment variables:\n${problems.join('\n')}\nSee backend/.env.example.`,
  );
}

export const env = parsed.data;

export const isProduction = env.NODE_ENV === 'production';
