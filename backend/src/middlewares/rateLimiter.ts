import type { RequestHandler } from 'express';
import { ipKeyGenerator, rateLimit } from 'express-rate-limit';
import { AppError } from '../utils/AppError';

const FIFTEEN_MINUTES = 15 * 60 * 1000;

function limitReached(message: string): RequestHandler {
  return (_req, _res, next) => next(new AppError(429, 'TOO_MANY_REQUESTS', message));
}

/** Login attempts per IP address + email. Slows down password guessing. */
export const loginLimiter = rateLimit({
  windowMs: FIFTEEN_MINUTES,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  keyGenerator: (req) => {
    const email: unknown = req.body?.email;
    return `${ipKeyGenerator(req.ip ?? '')}:${typeof email === 'string' ? email.trim().toLowerCase() : ''}`;
  },
  handler: limitReached('Too many login attempts. Please wait 15 minutes and try again.'),
});

/** General limit for every API request from one IP address. */
export const apiLimiter = rateLimit({
  windowMs: FIFTEEN_MINUTES,
  limit: 1000,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: limitReached('Too many requests. Please slow down.'),
});
