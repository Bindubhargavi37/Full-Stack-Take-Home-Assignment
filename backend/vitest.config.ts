import 'dotenv/config';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { defineConfig } from 'vitest/config';

// Tests run against their own database (<name>_test), never the development one.
// tests/globalSetup.ts resets it, applies migrations and seeds it before the run.
function testDatabaseUrl(): string {
  const url = new URL(process.env.DATABASE_URL ?? 'postgresql://test:test@localhost:5432/forms_db');
  const name = url.pathname.replace(/^\//, '');
  url.pathname = `/${name.endsWith('_test') ? name : `${name}_test`}`;
  return url.toString();
}

const TEST_ENV = {
  NODE_ENV: 'test',
  LOG_LEVEL: 'silent',
  DATABASE_URL: testDatabaseUrl(),
  JWT_ACCESS_SECRET:
    process.env.JWT_ACCESS_SECRET ?? 'test-secret-that-is-at-least-32-characters-long',
  // Fast hashing in tests; production uses 12.
  BCRYPT_SALT_ROUNDS: '4',
};

// globalSetup runs in this process, so it needs the same variables.
Object.assign(process.env, TEST_ENV);

export default defineConfig({
  // Keep the cache out of the project folder: cloud-synced folders (e.g. OneDrive) can lock it.
  cacheDir: join(tmpdir(), 'forms-dashboard', 'vitest'),
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    globalSetup: ['tests/globalSetup.ts'],
    // Test files share one database, so run them one at a time.
    fileParallelism: false,
    // The first test also loads the Prisma engine, which can be slow on a cold start.
    testTimeout: 15_000,
    hookTimeout: 120_000,
    env: TEST_ENV,
  },
});
