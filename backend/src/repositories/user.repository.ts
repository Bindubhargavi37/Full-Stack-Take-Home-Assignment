import type { ThemePreference } from '@prisma/client';
import { prisma } from '../config/db';

/** Fields that are safe to send to the browser. Never includes password_hash. */
export const publicUserSelect = {
  id: true,
  fullName: true,
  email: true,
  role: true,
  phone: true,
  adminId: true,
  isActive: true,
  themePreference: true,
  lastLoginAt: true,
} as const;

/** Includes the password hash: only for checking a password inside a service. */
export function findUserForLogin(email: string) {
  return prisma.user.findUnique({ where: { email } });
}

export function findUserWithPasswordById(id: string) {
  return prisma.user.findUnique({ where: { id } });
}

export function findActiveUserById(id: string) {
  return prisma.user.findFirst({ where: { id, isActive: true }, select: publicUserSelect });
}

export function recordFailedLogin(
  id: string,
  failedLoginAttempts: number,
  lockedUntil: Date | null,
) {
  return prisma.user.update({ where: { id }, data: { failedLoginAttempts, lockedUntil } });
}

export function recordSuccessfulLogin(id: string) {
  return prisma.user.update({
    where: { id },
    data: { failedLoginAttempts: 0, lockedUntil: null, lastLoginAt: new Date() },
    select: publicUserSelect,
  });
}

export function updatePasswordHash(id: string, passwordHash: string) {
  return prisma.user.update({ where: { id }, data: { passwordHash } });
}

export function updateThemePreference(id: string, themePreference: ThemePreference) {
  return prisma.user.update({ where: { id }, data: { themePreference }, select: publicUserSelect });
}
