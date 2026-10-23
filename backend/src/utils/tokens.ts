import { createHash, randomBytes } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { ROLES, type Role } from 'shared';
import { env } from '../config/env';

const ALGORITHM = 'HS256';

export type AccessTokenPayload = { sub: string; role: Role };

/** Short-lived JWT proving who the user is. Contains only the user id and role. */
export function signAccessToken(userId: string, role: Role): string {
  return jwt.sign({ role }, env.JWT_ACCESS_SECRET, {
    subject: userId,
    algorithm: ALGORITHM,
    expiresIn: `${env.ACCESS_TOKEN_TTL_MINUTES}m`,
  });
}

/** Returns the payload, or null if the token is missing, tampered with or expired. */
export function verifyAccessToken(token: string): AccessTokenPayload | null {
  try {
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET, { algorithms: [ALGORITHM] });
    if (typeof payload === 'string' || !payload.sub) return null;
    const role = (payload as { role?: unknown }).role;
    if (!ROLES.includes(role as Role)) return null;
    return { sub: payload.sub, role: role as Role };
  } catch {
    return null;
  }
}

/** Long random refresh token. Only its hash is stored in the database. */
export function generateRefreshToken(): string {
  return randomBytes(64).toString('base64url');
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function refreshTokenExpiry(): Date {
  return new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
}
