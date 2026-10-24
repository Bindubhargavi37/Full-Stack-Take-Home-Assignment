import type {
  ChangePasswordInput,
  Role,
  UpdatePreferencesInput,
  UpdateProfileValues,
} from 'shared';
import { revokeAllRefreshTokens } from '../repositories/refreshToken.repository';
import {
  findUserWithPasswordById,
  updateOwnProfile,
  updatePasswordHash,
  updateThemePreference,
} from '../repositories/user.repository';
import { AppError } from '../utils/AppError';
import { hashPassword, verifyPassword } from '../utils/password';
import { withUniqueEmail } from '../utils/uniqueEmail';
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

/**
 * The user edits their own name and phone. Changing the email (the sign-in name) is allowed for
 * admins only and needs their current password; an agent asks their admin instead.
 */
export async function updateProfile(
  user: { id: string; role: Role; email: string },
  input: UpdateProfileValues,
) {
  const emailChanged = input.email !== undefined && input.email !== user.email;

  if (emailChanged) {
    if (user.role !== 'ADMIN') {
      throw new AppError(403, 'EMAIL_CHANGE_NOT_ALLOWED', 'Ask your admin to change your email', [
        { field: 'email', message: 'Ask your admin to change your email' },
      ]);
    }
    const account = await findUserWithPasswordById(user.id);
    const passwordOk =
      account !== null &&
      input.currentPassword !== undefined &&
      (await verifyPassword(input.currentPassword, account.passwordHash));
    if (!passwordOk) {
      throw new AppError(400, 'WRONG_CURRENT_PASSWORD', 'Current password is incorrect', [
        {
          field: 'currentPassword',
          message: input.currentPassword
            ? 'Current password is incorrect'
            : 'Enter your current password to change your email',
        },
      ]);
    }
  }

  const updated = await withUniqueEmail(() =>
    updateOwnProfile(user.id, {
      fullName: input.fullName,
      phone: input.phone,
      ...(emailChanged && { email: input.email }),
    }),
  );
  return toAuthUser(updated);
}
