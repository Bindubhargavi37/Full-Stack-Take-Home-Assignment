import { z } from 'zod';
import { ROLES } from '../constants/roles';
import { THEMES } from '../constants/themes';
import { emailSchema, optionalPhoneSchema, personNameSchema } from './common.schema';

// bcrypt only reads the first 72 bytes of a password, so longer ones are rejected.
const PASSWORD_MAX = 72;

/** Rules for a NEW password (create agent, reset, change password). */
export const passwordSchema = z
  .string({ message: 'Password is required' })
  .min(8, 'Password must be at least 8 characters')
  .max(PASSWORD_MAX, `Password must be at most ${PASSWORD_MAX} characters`)
  .regex(/[A-Z]/, 'Password must contain an uppercase letter')
  .regex(/[a-z]/, 'Password must contain a lowercase letter')
  .regex(/[0-9]/, 'Password must contain a number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain a special character');

/** Login only checks presence and length; strength rules apply when a password is set. */
export const loginSchema = z
  .object({
    email: emailSchema,
    password: z
      .string({ message: 'Password is required' })
      .min(1, 'Password is required')
      .min(8, 'Password must be at least 8 characters')
      .max(PASSWORD_MAX, `Password must be at most ${PASSWORD_MAX} characters`),
  })
  .strict();

export const changePasswordSchema = z
  .object({
    currentPassword: z
      .string({ message: 'Current password is required' })
      .min(1, 'Current password is required')
      .max(PASSWORD_MAX),
    newPassword: passwordSchema,
    confirmPassword: z
      .string({ message: 'Please confirm the new password' })
      .min(1, 'Please confirm the new password'),
  })
  .strict()
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })
  .refine((data) => data.newPassword !== data.currentPassword, {
    message: 'New password must be different from the current one',
    path: ['newPassword'],
  });

export const updatePreferencesSchema = z
  .object({ themePreference: z.enum(THEMES, { message: 'Choose a valid theme' }) })
  .strict();

/**
 * PATCH /users/me: a user edits their own profile. Name and phone for everyone. Changing the
 * email (the sign-in name) is for admins only and needs the current password; the server checks
 * both rules (agents ask their admin, who changes it from agent management).
 */
export const updateProfileSchema = z
  .object({
    fullName: personNameSchema('Full name'),
    phone: optionalPhoneSchema,
    email: emailSchema.optional(),
    currentPassword: z.string().max(PASSWORD_MAX).optional(),
  })
  .strict();

export type LoginInput = z.input<typeof loginSchema>;
export type ChangePasswordInput = z.input<typeof changePasswordSchema>;
export type UpdatePreferencesInput = z.infer<typeof updatePreferencesSchema>;
export type UpdateProfileInput = z.input<typeof updateProfileSchema>;
export type UpdateProfileValues = z.output<typeof updateProfileSchema>;

/** The user object the API returns. Never includes the password hash. */
export const authUserSchema = z.object({
  id: z.string(),
  fullName: z.string(),
  email: z.string(),
  role: z.enum(ROLES),
  phone: z.string().nullable(),
  themePreference: z.enum(THEMES),
  lastLoginAt: z.string().nullable(),
});

export type AuthUser = z.infer<typeof authUserSchema>;
