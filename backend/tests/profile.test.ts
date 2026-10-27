import type TestAgent from 'supertest/lib/agent';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { prisma } from '../src/config/db';
import { hashPassword } from '../src/utils/password';
import { ADMIN, OTHER_ADMIN, browser, ensureOtherAdmin, loggedIn } from './helpers';

const URL = '/api/v1/users/me';
// A dedicated agent, created and removed here, so these tests never depend on (or disturb)
// the seeded accounts that other test files change. The other admin's email is put back after.
const PROFILE_AGENT = { email: 'profile-agent@example.com', password: 'Agent@12345' };
const NEW_ADMIN_EMAIL = 'renamed-admin@example.com';

let agent: TestAgent;
let otherAdmin: TestAgent;

beforeAll(async () => {
  await ensureOtherAdmin();
  const admin = await prisma.user.findUniqueOrThrow({ where: { email: ADMIN.email } });
  await prisma.user.deleteMany({ where: { email: { startsWith: 'profile-agent' } } });
  await prisma.user.create({
    data: {
      fullName: 'Arjun Mehta',
      email: PROFILE_AGENT.email,
      phone: '9876543212',
      role: 'AGENT',
      adminId: admin.id,
      passwordHash: await hashPassword(PROFILE_AGENT.password),
    },
  });
  [agent, otherAdmin] = await Promise.all([loggedIn(PROFILE_AGENT), loggedIn(OTHER_ADMIN)]);
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: { startsWith: 'profile-agent' } } });
  await prisma.user.updateMany({
    where: { email: NEW_ADMIN_EMAIL },
    data: { email: OTHER_ADMIN.email },
  });
});

const fields = (res: { body: { error: { details?: { field: string }[] } } }) =>
  (res.body.error.details ?? []).map((detail) => detail.field);

describe('PATCH /users/me', () => {
  it('requires a session', async () => {
    const res = await browser().patch(URL).send({ fullName: 'Someone', phone: '' });
    expect(res.status).toBe(401);
  });

  it('lets an agent change their name and phone', async () => {
    const res = await agent
      .patch(URL)
      .send({ fullName: '  Arjun S. Mehta ', phone: '+919800011111' });
    expect(res.status).toBe(200);
    expect(res.body.data.user).toMatchObject({
      fullName: 'Arjun S. Mehta',
      phone: '+919800011111',
      email: PROFILE_AGENT.email,
    });

    const me = await agent.get('/api/v1/auth/me');
    expect(me.body.data.user.fullName).toBe('Arjun S. Mehta');

    const cleared = await agent.patch(URL).send({ fullName: 'Arjun S. Mehta', phone: '' });
    expect(cleared.body.data.user.phone).toBeNull();
  });

  it('accepts an agent sending their unchanged email', async () => {
    const res = await agent
      .patch(URL)
      .send({ fullName: 'Arjun Mehta', phone: '', email: PROFILE_AGENT.email });
    expect(res.status).toBe(200);
  });

  it("refuses an agent's own email change", async () => {
    const res = await agent
      .patch(URL)
      .send({ fullName: 'Arjun Mehta', phone: '', email: 'profile-agent-new@example.com' });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('EMAIL_CHANGE_NOT_ALLOWED');
    expect(fields(res)).toEqual(['email']);

    const row = await prisma.user.findUniqueOrThrow({ where: { email: PROFILE_AGENT.email } });
    expect(row.email).toBe(PROFILE_AGENT.email);
  });

  it('lets an admin change their email only with the right current password', async () => {
    const base = { fullName: 'Other Admin', phone: '', email: NEW_ADMIN_EMAIL };

    const noPassword = await otherAdmin.patch(URL).send(base);
    expect(noPassword.status).toBe(400);
    expect(fields(noPassword)).toEqual(['currentPassword']);

    const wrong = await otherAdmin.patch(URL).send({ ...base, currentPassword: 'Wrong@12345' });
    expect(wrong.status).toBe(400);
    expect(fields(wrong)).toEqual(['currentPassword']);

    const ok = await otherAdmin.patch(URL).send({ ...base, currentPassword: OTHER_ADMIN.password });
    expect(ok.status).toBe(200);
    expect(ok.body.data.user.email).toBe(NEW_ADMIN_EMAIL);

    const login = await browser()
      .post('/api/v1/auth/login')
      .send({ email: NEW_ADMIN_EMAIL, password: OTHER_ADMIN.password });
    expect(login.status).toBe(200);
  });

  it('rejects an email that another user already has', async () => {
    const res = await otherAdmin.patch(URL).send({
      fullName: 'Other Admin',
      phone: '',
      email: ADMIN.email,
      currentPassword: OTHER_ADMIN.password,
    });
    expect(res.status).toBe(409);
    expect(fields(res)).toEqual(['email']);
  });

  it('validates the fields and rejects anything else', async () => {
    const invalid = await agent.patch(URL).send({ fullName: 'X', phone: '12' });
    expect(invalid.status).toBe(400);
    expect(fields(invalid)).toEqual(expect.arrayContaining(['fullName', 'phone']));

    for (const extra of [{ role: 'ADMIN' }, { adminId: null }, { isActive: false }]) {
      const res = await agent.patch(URL).send({ fullName: 'Arjun Mehta', phone: '', ...extra });
      expect(res.status).toBe(400);
    }
  });
});
