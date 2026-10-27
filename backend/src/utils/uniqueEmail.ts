import { Prisma } from '@prisma/client';
import { AppError } from './AppError';

/**
 * Runs a write and turns the database's unique-email violation into a 409 with a field error,
 * so the form can show "already in use" under the email input.
 */
export async function withUniqueEmail<T>(write: () => Promise<T>): Promise<T> {
  try {
    return await write();
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new AppError(409, 'EMAIL_TAKEN', 'This email is already in use', [
        { field: 'email', message: 'This email is already in use' },
      ]);
    }
    throw error;
  }
}
