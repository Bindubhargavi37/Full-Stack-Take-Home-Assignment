import request from 'supertest';
import { CSRF_HEADER, CSRF_HEADER_VALUE } from 'shared';
import { createApp } from '../src/app';
import { prisma } from '../src/config/db';
import { hashPassword } from '../src/utils/password';

export const app = createApp();

export const ADMIN = { email: 'admin@example.com', password: 'Admin@12345' };
export const AGENT = { email: 'agent1@example.com', password: 'Agent@12345' };
export const INACTIVE_AGENT = { email: 'agent6@example.com', password: 'Agent@12345' };
export const AGENT2 = { email: 'agent2@example.com', password: 'Agent@12345' };
/** A second admin who manages no agents: must never see the first admin's data. */
export const OTHER_ADMIN = { email: 'other-admin@example.com', password: 'Admin@12345' };

/** Creates (or resets) OTHER_ADMIN in the test database. */
export async function ensureOtherAdmin() {
  await prisma.user.upsert({
    where: { email: OTHER_ADMIN.email },
    update: { isActive: true, failedLoginAttempts: 0, lockedUntil: null },
    create: {
      fullName: 'Other Admin',
      email: OTHER_ADMIN.email,
      role: 'ADMIN',
      passwordHash: await hashPassword(OTHER_ADMIN.password),
    },
  });
}

/** A supertest agent keeps cookies between requests, like a browser. */
export function browser() {
  return request.agent(app).set(CSRF_HEADER, CSRF_HEADER_VALUE);
}

export async function loggedIn(credentials: { email: string; password: string }) {
  const client = browser();
  const res = await client.post('/api/v1/auth/login').send(credentials);
  if (res.status !== 200) throw new Error(`Login failed in test setup: ${res.status}`);
  return client;
}

/** Cookie values from a response, by name. */
export function cookies(res: request.Response): Record<string, string> {
  const header = res.headers['set-cookie'] as unknown as string[] | undefined;
  return Object.fromEntries(
    (header ?? []).map((cookie) => {
      const [pair = ''] = cookie.split(';');
      const index = pair.indexOf('=');
      return [pair.slice(0, index), pair.slice(index + 1)];
    }),
  );
}
