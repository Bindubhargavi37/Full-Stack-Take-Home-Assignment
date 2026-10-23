import type { ChangePasswordInput, UpdatePreferencesInput } from 'shared';
import { revokeAllRefreshTokens } from '../repositories/refreshToken.repository';
import {
  findUserWithPasswordById,
  updatePasswordHash,
  updateThemePreference,
} from '../repositories/user.repository';
import { AppError } from '../utils/AppError';
import { hashPassword, verifyPassword } from '../utils/password';
import { type ClientMeta, issueTokens, toAuthUser } from './auth.service';

/**
 * Changes the user's own password, logs out every other device, and starts a fresh session
 * for this device so the user stays signed in here.
 */
export async function changePassword(userId: string, input: ChangePasswordInput, meta: ClientMeta) {
  const user = await findUserWithPasswordById(userId);
  if (!user || !user.isActive) {
    throw new AppError(401, 'UNAUTHENTICATED', 'Please sign in to continue');
  }

  if (!(await verifyPassword(input.currentPassword, user.passwordHash))) {
    throw new AppError(400, 'WRONG_CURRENT_PASSWORD', 'Current password is incorrect', [
      { field: 'currentPassword', message: 'Current password is incorrect' },
    ]);
  }

  await updatePasswordHash(userId, await hashPassword(input.newPassword));
  await revokeAllRefreshTokens(userId);
  return issueTokens(user, meta);
}

export async function updatePreferences(userId: string, input: UpdatePreferencesInput) {
  return toAuthUser(await updateThemePreference(userId, input.themePreference));
}
