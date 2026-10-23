import { execSync } from 'node:child_process';

// Runs once before all tests. Nothing here deletes the database:
// `migrate deploy` creates the test database if needed and applies any new migrations,
// then the seed resets the test users (passwords, lockouts, active flag) and their submissions.
export default function setup() {
  if (!process.env.DATABASE_URL?.includes('_test')) {
    throw new Error('Tests must use a separate database whose name ends in _test.');
  }
  const options = { stdio: 'pipe', env: process.env } as const;
  execSync('npx prisma migrate deploy', options);
  execSync('npx tsx prisma/seed.ts', options);
}
