import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Keep the cache out of the project folder: cloud-synced folders (e.g. OneDrive) can lock it.
  cacheDir: join(tmpdir(), 'forms-dashboard', 'vitest'),
  test: {
    environment: 'node',
    // The first test also loads the Prisma engine, which can be slow on a cold start.
    testTimeout: 15_000,
    include: ['tests/**/*.test.ts'],
    env: {
      NODE_ENV: 'test',
      LOG_LEVEL: 'silent',
      DATABASE_URL:
        process.env.DATABASE_URL ?? 'postgresql://test:test@localhost:5432/test?schema=public',
    },
  },
});
