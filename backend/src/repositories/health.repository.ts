import { prisma } from '../config/db';

const DB_CHECK_TIMEOUT_MS = 2000;

/** True when the database answers a trivial query within 2 seconds. */
export async function isDatabaseUp(): Promise<boolean> {
  const timeout = new Promise<false>((resolve) =>
    setTimeout(() => resolve(false), DB_CHECK_TIMEOUT_MS),
  );
  const query = prisma.$queryRaw`SELECT 1`.then(() => true).catch(() => false);
  return Promise.race([query, timeout]);
}
