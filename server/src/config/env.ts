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
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const problems = parsed.error.issues.map(
    (issue) => `  - ${issue.path.join('.')}: ${issue.message}`,
  );
  throw new Error(
    `Invalid environment variables:\n${problems.join('\n')}\nSee server/.env.example.`,
  );
}

export const env = parsed.data;

export const isProduction = env.NODE_ENV === 'production';
