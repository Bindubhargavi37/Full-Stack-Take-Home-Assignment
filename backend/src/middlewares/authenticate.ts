import type { RequestHandler } from 'express';
import { findActiveUserById } from '../repositories/user.repository';
import { AppError } from '../utils/AppError';
import { ACCESS_COOKIE } from '../utils/cookies';
import { verifyAccessToken } from '../utils/tokens';

/**
 * Requires a valid access token cookie. Also reloads the user from the database on every
 * request, so a deactivated or deleted user is blocked immediately, not when the token expires.
 */
export const authenticate: RequestHandler = async (req, _res, next) => {
  const token: unknown = req.cookies?.[ACCESS_COOKIE];
  const payload = typeof token === 'string' ? verifyAccessToken(token) : null;
  if (!payload) throw new AppError(401, 'UNAUTHENTICATED', 'Please sign in to continue');

  const user = await findActiveUserById(payload.sub);
  if (!user) throw new AppError(401, 'UNAUTHENTICATED', 'Please sign in to continue');

  req.user = {
    id: user.id,
    role: user.role,
    email: user.email,
    fullName: user.fullName,
    adminId: user.adminId,
  };
  next();
};
