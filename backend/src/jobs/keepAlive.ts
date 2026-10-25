import { logger } from '../config/logger';

/** Render's free plan sleeps a service after 15 minutes without requests; ping just before. */
export const KEEP_ALIVE_INTERVAL_MS = 14 * 60_000;

/**
 * Calls the service's own public health URL every 14 minutes. On Render that request comes in
 * through the public address, so it counts as traffic and the free service never goes to sleep
 * (which would make the next visitor wait about a minute). The health check also touches the
 * database. A sleeping service can't wake itself, but this starts on every boot, so once the
 * service is up it stays up.
 *
 * Returns a function that stops the job, or undefined when no public URL is configured
 * (local development and tests).
 */
export function startKeepAlive(publicUrl: string | undefined): (() => void) | undefined {
  if (!publicUrl) return undefined;
  const healthUrl = `${publicUrl.replace(/\/+$/, '')}/api/v1/health`;

  const ping = async () => {
    try {
      const res = await fetch(healthUrl, { signal: AbortSignal.timeout(30_000) });
      if (!res.ok) logger.warn({ status: res.status }, 'Keep-alive ping got an error response');
    } catch (err) {
      logger.warn({ err }, 'Keep-alive ping failed');
    }
  };

  const timer = setInterval(() => void ping(), KEEP_ALIVE_INTERVAL_MS);
  // Don't keep the process alive just for this timer (lets shutdown finish).
  timer.unref();
  logger.info({ healthUrl }, 'Keep-alive: pinging the health check every 14 minutes');
  return () => clearInterval(timer);
}
