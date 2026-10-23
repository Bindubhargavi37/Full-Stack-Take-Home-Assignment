import type { RequestHandler } from 'express';
import { CSRF_HEADER, CSRF_HEADER_VALUE } from 'shared';
import { AppError } from '../utils/AppError';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * CSRF guard: every request that changes data must carry a custom header.
 * Browsers don't let other websites add custom headers to cross-site requests without a CORS
 * pre-flight, which our CORS allow-list rejects. Works together with SameSite cookies.
 */
export const requireCsrfHeader: RequestHandler = (req, _res, next) => {
  if (SAFE_METHODS.has(req.method) || req.get(CSRF_HEADER) === CSRF_HEADER_VALUE) {
    next();
    return;
  }
  throw new AppError(403, 'CSRF_HEADER_MISSING', 'Missing required request header');
};
