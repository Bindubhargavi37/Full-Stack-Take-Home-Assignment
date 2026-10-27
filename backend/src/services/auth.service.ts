import type { Prisma } from '@prisma/client';
import type { AuthUser, LoginInput } from 'shared';
import { logger } from '../config/logger';
import {
  createRefreshToken,
  findRefreshTokenByHash,
  revokeAllRefreshTokens,
  revokeRefreshToken,
} from '../repositories/refreshToken.repository';
import {
  findActiveUserById,
  findUserForLogin,
  publicUserSelect,
  recordFailedLogin,
  recordSuccessfulLogin,
} from '../repositories/user.repository';
import { AppError } from '../utils/AppError';
import { burnPasswordCheck, verifyPassword } from '../utils/password';
import {
  generateRefreshToken,
  hashToken,
  refreshTokenExpiry,
  signAccessToken,
} from '../utils/tokens';

const MAX_FAILED_LOGINS = 5;
const LOCK_MINUTES = 15;
// Two browser tabs can refresh at the same moment; a token revoked this recently is treated
// as that harmless race, not as theft.
const REUSE_GRACE_MS = 30_000;

export type ClientMeta = { userAgent?: string; ipAddress?: string };
export type IssuedTokens = { accessToken: string; refreshToken: string; refreshExpiresAt: Date };

type PublicUser = Prisma.UserGetPayload<{ select: typeof publicUserSelect }>;

export function toAuthUser(user: PublicUser): AuthUser {
  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    role: user.role,
    phone: user.phone,
    themePreference: user.themePreference,
    lastLoginAt: user.lastLoginAt ? user.lastLoginAt.toISOString() : null,
  };
}

const invalidCredentials = () =>
  new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');

/** Creates a new session: an access token plus a refresh token stored (hashed) in the database. */
export async function issueTokens(
  user: { id: string; role: AuthUser['role'] },
  meta: ClientMeta,
): Promise<IssuedTokens> {
  const refreshToken = generateRefreshToken();
  const refreshExpiresAt = refreshTokenExpiry();
  await createRefreshToken({
    userId: user.id,
    tokenHash: hashToken(refreshToken),
    expiresAt: refreshExpiresAt,
    userAgent: meta.userAgent?.slice(0, 255),
    ipAddress: meta.ipAddress?.slice(0, 45),
  });
  return { accessToken: signAccessToken(user.id, user.role), refreshToken, refreshExpiresAt };
}

export async function login(input: LoginInput, meta: ClientMeta) {
  const user = await findUserForLogin(input.email);

  if (!user) {
    await burnPasswordCheck(input.password);
    throw invalidCredentials();
  }

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    const minutes = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60_000);
    throw new AppError(
      423,
      'ACCOUNT_LOCKED',
      `Account temporarily locked. Try again in ${minutes} minute${minutes === 1 ? '' : 's'}.`,
    );
  }

  if (!(await verifyPassword(input.password, user.passwordHash))) {
    const attempts = user.failedLoginAttempts + 1;
    if (attempts >= MAX_FAILED_LOGINS) {
      await recordFailedLogin(user.id, 0, new Date(Date.now() + LOCK_MINUTES * 60_000));
      logger.warn({ userId: user.id }, 'Account locked after repeated failed logins');
    } else {
      await recordFailedLogin(user.id, attempts, null);
    }
    throw invalidCredentials();
  }

  // Checked only after a correct password, so this message can't be used to discover accounts.
  if (!user.isActive) {
    throw new AppError(403, 'ACCOUNT_INACTIVE', 'Your account is deactivated. Contact your admin.');
  }

  const safeUser = await recordSuccessfulLogin(user.id);
  const tokens = await issueTokens(user, meta);
  return { user: toAuthUser(safeUser), tokens };
}

const sessionExpired = () =>
  new AppError(401, 'SESSION_EXPIRED', 'Your session has expired. Please sign in again.');

/** Swaps a valid refresh token for a new pair (rotation). The old token stops working. */
export async function refreshSession(rawToken: string | undefined, meta: ClientMeta) {
  if (!rawToken) throw sessionExpired();

  const stored = await findRefreshTokenByHash(hashToken(rawToken));
  if (!stored) throw sessionExpired();

  if (stored.revokedAt) {
    if (Date.now() - stored.revokedAt.getTime() > REUSE_GRACE_MS) {
      // A token that was already rotated is being used again: it was probably stolen.
      await revokeAllRefreshTokens(stored.userId);
      logger.warn({ userId: stored.userId }, 'Refresh token reuse detected; all sessions revoked');
    }
    throw sessionExpired();
  }

  if (stored.expiresAt <= new Date()) throw sessionExpired();

  const user = await findActiveUserById(stored.userId);
  if (!user) {
    await revokeAllRefreshTokens(stored.userId);
    throw sessionExpired();
  }

  // updateMany with revokedAt: null makes the swap safe if two requests race.
  if ((await revokeRefreshToken(stored.id)) === 0) throw sessionExpired();

  const tokens = await issueTokens(user, meta);
  return { user: toAuthUser(user), tokens };
}

export async function logout(rawToken: string | undefined): Promise<void> {
  if (!rawToken) return;
  const stored = await findRefreshTokenByHash(hashToken(rawToken));
  if (stored) await revokeRefreshToken(stored.id);
}

export async function getCurrentUser(userId: string): Promise<AuthUser> {
  const user = await findActiveUserById(userId);
  if (!user) throw new AppError(401, 'UNAUTHENTICATED', 'Please sign in to continue');
  return toAuthUser(user);
}
