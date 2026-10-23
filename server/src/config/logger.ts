import { pino } from 'pino';
import { env } from './env';

export const logger = pino({
  level: env.LOG_LEVEL,
  // Never write secrets to the logs.
  redact: {
    paths: [
      'req.headers.cookie',
      'req.headers.authorization',
      '*.password',
      '*.passwordHash',
      '*.token',
    ],
    censor: '[redacted]',
  },
  transport:
    env.NODE_ENV === 'development'
      ? { target: 'pino-pretty', options: { colorize: true, translateTime: 'HH:MM:ss' } }
      : undefined,
});
