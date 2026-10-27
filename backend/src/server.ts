import { createApp } from './app';
import { prisma } from './config/db';
import { env } from './config/env';
import { logger } from './config/logger';
import { startKeepAlive } from './jobs/keepAlive';

const server = createApp().listen(env.PORT, () => {
  logger.info(`API listening on http://localhost:${env.PORT}/api/v1`);
});

const stopKeepAlive = startKeepAlive(env.KEEP_ALIVE_URL);

// Close connections cleanly when nodemon restarts or the process is stopped.
async function shutdown(signal: string) {
  logger.info(`${signal} received, shutting down`);
  stopKeepAlive?.();
  server.close();
  await prisma.$disconnect();
  process.exit(0);
}

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
