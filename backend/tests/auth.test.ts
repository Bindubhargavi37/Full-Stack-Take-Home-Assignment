import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { prisma } from '../src/config/db';
import { hashToken } from '../src/utils/tokens';
import { ADMIN, AGENT, INACTIVE_AGENT, app, browser, cookies, loggedIn } from './helpers';

const LOGIN = '/api/v1/auth/login';

describe('POST /auth/login', () => {
  it('logs in, returns the user without the password hash, and sets httpOnly cookies', async () => {
    const res = await browser().post(LOGIN).send(ADMIN);

    expect(res.status).toBe(200);
    expect(res.body.data.user).toMatchObject({ email: ADMIN.email, role: 'ADMIN' });
    expect(JSON.stringify(res.body)).not.toContain('passwordHash');

    const setCookie = (res.headers['set-cookie'] as unknown as string[]).join('\n');
    expect(setCookie).toMatch(/access_token=.*HttpOnly/);
    expect(setCookie).toMatch(/refresh_token=.*Path=\/api\/v1\/auth.*HttpOnly/);
    expect(setCookie).toMatch(/SameSite=Lax/);
  });

  it('trims and lowercases the email', async () => {
    const res = await browser()
      .post(LOGIN)
      .send({ ...AGENT, email: '  AGENT1@Example.com ' });
    expect(res.status).toBe(200);
  });

  it('gives the same answer for a wrong password and an unknown email', async () => {
    const wrongPassword = await browser()
      .post(LOGIN)
      .send({ ...AGENT, password: 'Wrong@12345' });
    const unknownEmail = await browser()
      .post(LOGIN)
      .send({ email: 'nobody@example.com', password: 'Wrong@12345' });

    expect(wrongPassword.status).toBe(401);
    expect(unknownEmail.status).toBe(401);
    expect(wrongPassword.body).toEqual(unknownEmail.body);
  });

  it('rejects invalid input with field errors', async () => {
    const res = await browser().post(LOGIN).send({ email: 'not-an-email', password: 'short' });

    expect(res.status).toBe(400);
    const fields = res.body.error.details.map((d: { field: string }) => d.field);
    expect(fields).toEqual(expect.arrayContaining(['email', 'password']));
  });

  it('rejects unknown fields such as a role sent by the client', async () => {
    const res = await browser()
      .post(LOGIN)
      .send({ ...AGENT, role: 'ADMIN' });
    expect(res.status).toBe(400);
  });

  it('blocks a deactivated agent after a correct password', async () => {
    const res = await browser().post(LOGIN).send(INACTIVE_AGENT);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('ACCOUNT_INACTIVE');
  });

  it('locks the account after 5 wrong passwords', async () => {
    const victim = { email: 'agent5@example.com', password: 'Wrong@12345' };
    for (let i = 0; i < 5; i++) {
      expect((await browser().post(LOGIN).send(victim)).status).toBe(401);
    }

    const locked = await browser()
      .post(LOGIN)
      .send({ ...victim, password: 'Agent@12345' });
    expect(locked.status).toBe(423);
    expect(locked.body.error.code).toBe('ACCOUNT_LOCKED');
  });

  it('requires the CSRF header on requests that change data', async () => {
    const res = await request(app).post(LOGIN).send(AGENT);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('CSRF_HEADER_MISSING');
  });
});

describe('GET /auth/me', () => {
  it('returns the logged-in user', async () => {
    const client = await loggedIn(AGENT);
    const res = await client.get('/api/v1/auth/me');

    expect(res.status).toBe(200);
    expect(res.body.data.user).toMatchObject({ email: AGENT.email, role: 'AGENT' });
  });

  it('rejects requests without a session', async () => {
    const res = await request(app).get('/api/v1/auth/me');
    expect(res.status).toBe(401);
  });

  it('rejects a tampered token', async () => {
    const res = await request(app)
      .get('/api/v1/auth/me')
      .set(
        'Cookie',
        'access_token=eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ4Iiwicm9sZSI6IkFETUlOIn0.forged',
      );
    expect(res.status).toBe(401);
  });
});

describe('POST /auth/refresh', () => {
  it('rotates the refresh token: the new one works, the old one is revoked', async () => {
    const client = browser();
    const login = await client.post(LOGIN).send(AGENT);
    const oldToken = cookies(login).refresh_token!;

    const refreshed = await client.post('/api/v1/auth/refresh');
    expect(refreshed.status).toBe(200);
    const newToken = cookies(refreshed).refresh_token!;
    expect(newToken).not.toBe(oldToken);

    const old = await prisma.refreshToken.findUnique({ where: { tokenHash: hashToken(oldToken) } });
    expect(old?.revokedAt).not.toBeNull();
  });

  it('fails without a refresh cookie', async () => {
    const res = await browser().post('/api/v1/auth/refresh');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('SESSION_EXPIRED');
  });
});

describe('POST /auth/logout', () => {
  it('revokes the session and clears the cookies', async () => {
    const client = await loggedIn(AGENT);

    const res = await client.post('/api/v1/auth/logout');
    expect(res.status).toBe(204);

    expect((await client.get('/api/v1/auth/me')).status).toBe(401);
    expect((await client.post('/api/v1/auth/refresh')).status).toBe(401);
  });
});

describe('account settings', () => {
  it('saves the theme preference', async () => {
    const client = await loggedIn(AGENT);
    const res = await client
      .patch('/api/v1/users/me/preferences')
      .send({ themePreference: 'DRACULA' });

    expect(res.status).toBe(200);
    expect(res.body.data.user.themePreference).toBe('DRACULA');
  });

  it('rejects an unknown theme', async () => {
    const client = await loggedIn(AGENT);
    const res = await client
      .patch('/api/v1/users/me/preferences')
      .send({ themePreference: 'PINK' });
    expect(res.status).toBe(400);
  });

  it('changes the password and signs out other devices', async () => {
    const credentials = { email: 'agent3@example.com', password: 'Agent@12345' };
    const otherDevice = await loggedIn(credentials);
    const thisDevice = await loggedIn(credentials);

    const weak = await thisDevice.patch('/api/v1/users/me/password').send({
      currentPassword: credentials.password,
      newPassword: 'weak',
      confirmPassword: 'weak',
    });
    expect(weak.status).toBe(400);

    const wrongCurrent = await thisDevice.patch('/api/v1/users/me/password').send({
      currentPassword: 'Wrong@12345',
      newPassword: 'Changed@12345',
      confirmPassword: 'Changed@12345',
    });
    expect(wrongCurrent.status).toBe(400);
    expect(wrongCurrent.body.error.code).toBe('WRONG_CURRENT_PASSWORD');

    const changed = await thisDevice.patch('/api/v1/users/me/password').send({
      currentPassword: credentials.password,
      newPassword: 'Changed@12345',
      confirmPassword: 'Changed@12345',
    });
    expect(changed.status).toBe(200);

    // The other device can no longer renew its session; this device still works.
    expect((await otherDevice.post('/api/v1/auth/refresh')).status).toBe(401);
    expect((await thisDevice.get('/api/v1/auth/me')).status).toBe(200);
    expect(
      (
        await browser()
          .post(LOGIN)
          .send({ ...credentials, password: 'Changed@12345' })
      ).status,
    ).toBe(200);
  });
});
