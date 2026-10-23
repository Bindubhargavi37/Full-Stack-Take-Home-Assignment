import cookieParser from 'cookie-parser';
import express from 'express';
import request from 'supertest';
import { CSRF_HEADER, CSRF_HEADER_VALUE } from 'shared';
import { describe, expect, it } from 'vitest';
import { authenticate } from '../src/middlewares/authenticate';
import { authorize } from '../src/middlewares/authorize';
import { errorHandler } from '../src/middlewares/errorHandler';
import { prisma } from '../src/config/db';
import { ADMIN, AGENT, cookies } from './helpers';
import { createApp } from '../src/app';

// A small app with one admin-only route, to test the role middleware on its own.
const guarded = express();
guarded.use(cookieParser());
guarded.get('/admin-only', authenticate, authorize('ADMIN'), (_req, res) => {
  res.json({ ok: true });
});
guarded.use(errorHandler);

async function sessionCookie(credentials: { email: string; password: string }) {
  const res = await request(createApp())
    .post('/api/v1/auth/login')
    .set(CSRF_HEADER, CSRF_HEADER_VALUE)
    .send(credentials);
  return `access_token=${cookies(res).access_token}`;
}

describe('role-based access control', () => {
  it('lets an admin through an admin-only route', async () => {
    const res = await request(guarded)
      .get('/admin-only')
      .set('Cookie', await sessionCookie(ADMIN));
    expect(res.status).toBe(200);
  });

  it('returns 403 for an agent on an admin-only route', async () => {
    const res = await request(guarded)
      .get('/admin-only')
      .set('Cookie', await sessionCookie(AGENT));
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('returns 401 without a session', async () => {
    const res = await request(guarded).get('/admin-only');
    expect(res.status).toBe(401);
  });

  it('blocks a user on the very next request after they are deactivated', async () => {
    const cookie = await sessionCookie({ email: 'agent4@example.com', password: 'Agent@12345' });
    await prisma.user.update({ where: { email: 'agent4@example.com' }, data: { isActive: false } });

    const res = await request(guarded).get('/admin-only').set('Cookie', cookie);
    expect(res.status).toBe(401);

    await prisma.user.update({ where: { email: 'agent4@example.com' }, data: { isActive: true } });
  });
});
