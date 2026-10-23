import type { RequestHandler } from 'express';
import type { Role } from 'shared';
import { AppError } from '../utils/AppError';

/** Allows only the given roles. Use after `authenticate`. Example: authorize('ADMIN'). */
export function authorize(...allowed: Role[]): RequestHandler {
  return (req, _res, next) => {
    if (!req.user) throw new AppError(401, 'UNAUTHENTICATED', 'Please sign in to continue');
    if (!allowed.includes(req.user.role)) {
      throw new AppError(403, 'FORBIDDEN', 'You do not have permission to do this');
    }
    next();
  };
}
