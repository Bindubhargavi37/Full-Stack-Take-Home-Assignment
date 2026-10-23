import bcrypt from 'bcrypt';
import { env } from '../config/env';

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, env.BCRYPT_SALT_ROUNDS);
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

// Compared against when the email doesn't exist, so a failed login takes the same time
// whether or not the account exists (attackers can't use timing to find valid emails).
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', env.BCRYPT_SALT_ROUNDS);

export async function burnPasswordCheck(plain: string): Promise<void> {
  await bcrypt.compare(plain, DUMMY_HASH);
}
