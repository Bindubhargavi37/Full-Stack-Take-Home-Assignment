import type { RequestHandler } from 'express';
import { isDatabaseUp } from '../repositories/health.repository';

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
