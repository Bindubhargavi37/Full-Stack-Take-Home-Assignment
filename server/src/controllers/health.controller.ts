import type { RequestHandler } from 'express';
import { prisma } from '../config/db';

const DB_CHECK_TIMEOUT_MS = 2000;

async function isDatabaseUp(): Promise<boolean> {
  const timeout = new Promise<false>((resolve) =>
    setTimeout(() => resolve(false), DB_CHECK_TIMEOUT_MS),
  );
  const query = prisma.$queryRaw`SELECT 1`.then(() => true).catch(() => false);
  return Promise.race([query, timeout]);
}

export const getHealth: RequestHandler = async (_req, res) => {
  const databaseUp = await isDatabaseUp();
  res.json({
    success: true,
    data: {
      status: 'ok',
      database: databaseUp ? 'up' : 'down',
      uptimeSeconds: Math.round(process.uptime()),
    },
  });
};
