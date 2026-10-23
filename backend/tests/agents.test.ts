import type { Agent, AgentOption, CreateAgentInput } from 'shared';
import type TestAgent from 'supertest/lib/agent';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { prisma } from '../src/config/db';
import { ADMIN, AGENT, OTHER_ADMIN, browser, ensureOtherAdmin, loggedIn } from './helpers';

const BASE = '/api/v1/agents';
// Agents created here use this domain and are removed after the run.
const TEST_DOMAIN = '@agents.test';
const PASSWORD = 'Start@12345';

let admin: TestAgent;
let otherAdmin: TestAgent;
let counter = 0;

const newAgentInput = (): CreateAgentInput => ({
  fullName: 'Test Agent',
  email: `agent-${Date.now()}-${counter++}${TEST_DOMAIN}`,
  phone: '',
  password: PASSWORD,
});

async function createAgent(): Promise<Agent & { password: string }> {
  const input = newAgentInput();
  const res = await admin.post(BASE).send(input);
  expect(res.status).toBe(201);
  return { ...res.body.data.agent, password: PASSWORD };
}

/** Only what the login endpoint accepts. */
const credentials = (agent: { email: string; password: string }) => ({
  email: agent.email,
  password: agent.password,
});

const removeTestAgents = () =>
  prisma.user.deleteMany({ where: { email: { endsWith: TEST_DOMAIN } } });

beforeAll(async () => {
  await removeTestAgents();
  await ensureOtherAdmin();
  [admin, otherAdmin] = await Promise.all([loggedIn(ADMIN), loggedIn(OTHER_ADMIN)]);
});

afterAll(removeTestAgents);

describe('access', () => {
  it('requires a session', async () => {
    expect((await browser().get(BASE)).status).toBe(401);
  });

  it('is for admins only', async () => {
    const agent = await loggedIn(AGENT);
    expect((await agent.get(BASE)).status).toBe(403);
    expect((await agent.get(`${BASE}/options`)).status).toBe(403);
    expect((await agent.post(BASE).send(newAgentInput())).status).toBe(403);
  });

  it("returns 404 for another admin's agent", async () => {
    const agent = await createAgent();
    expect((await otherAdmin.get(`${BASE}/${agent.id}`)).status).toBe(404);
    expect(
      (await otherAdmin.patch(`${BASE}/${agent.id}/status`).send({ isActive: false })).status,
    ).toBe(404);
    expect((await otherAdmin.get(BASE)).body.data.total).toBe(0);
  });

  it('returns 400 for an id that is not a UUID', async () => {
    expect((await admin.get(`${BASE}/not-a-uuid`)).status).toBe(400);
  });
});

describe('GET /agents', () => {
  it('lists the admin’s agents with their submission counts', async () => {
    const res = await admin.get(BASE).query({ pageSize: 100 });
    expect(res.status).toBe(200);

    const agent1 = (res.body.data.items as Agent[]).find((a) => a.email === AGENT.email);
    const expected = await prisma.submission.count({ where: { agent: { email: AGENT.email } } });
    expect(agent1).toMatchObject({ fullName: 'Ravi Kumar', isActive: true });
    expect(agent1?.submissionCount).toBe(expected);
    expect(JSON.stringify(res.body)).not.toContain('passwordHash');
  });

  it('filters by status and searches by name or email', async () => {
    const inactive = await admin.get(BASE).query({ status: 'inactive' });
    expect(inactive.body.data.items.map((a: Agent) => a.email)).toEqual(['agent6@example.com']);

    const search = await admin.get(BASE).query({ search: 'PRIYA' });
    expect(search.body.data.items.map((a: Agent) => a.email)).toEqual(['agent2@example.com']);
  });

  it('gives a short option list for dropdowns (not read as an id)', async () => {
    const res = await admin.get(`${BASE}/options`);
    expect(res.status).toBe(200);
    const options = res.body.data.agents as AgentOption[];
    expect(options.length).toBeGreaterThanOrEqual(6);
    expect(Object.keys(options[0]!).sort()).toEqual(['fullName', 'id', 'isActive']);
  });
});

describe('POST /agents', () => {
  it('creates an agent for this admin who can then sign in', async () => {
    const input = { ...newAgentInput(), phone: '9876512345' };
    const res = await admin.post(BASE).send({ ...input, email: input.email.toUpperCase() });
    expect(res.status).toBe(201);
    expect(res.body.data.agent).toMatchObject({
      email: input.email,
      phone: '9876512345',
      isActive: true,
      submissionCount: 0,
    });

    const saved = await prisma.user.findUniqueOrThrow({ where: { email: input.email } });
    const adminRow = await prisma.user.findUniqueOrThrow({ where: { email: ADMIN.email } });
    expect(saved).toMatchObject({ role: 'AGENT', adminId: adminRow.id });

    const login = await browser().post('/api/v1/auth/login').send(credentials(input));
    expect(login.status).toBe(200);
    expect(login.body.data.user.role).toBe('AGENT');
  });

  it('rejects a duplicate email with a field error', async () => {
    const res = await admin.post(BASE).send({ ...newAgentInput(), email: AGENT.email });
    expect(res.status).toBe(409);
    expect(res.body.error.details).toEqual([
      { field: 'email', message: 'This email is already in use' },
    ]);
  });

  it('rejects a weak password, bad phone, and server-owned fields', async () => {
    const weak = await admin.post(BASE).send({ ...newAgentInput(), password: 'password' });
    expect(weak.status).toBe(400);
    const phone = await admin.post(BASE).send({ ...newAgentInput(), phone: '12' });
    expect(phone.status).toBe(400);
    for (const extra of [{ role: 'ADMIN' }, { adminId: null }, { isActive: false }]) {
      expect((await admin.post(BASE).send({ ...newAgentInput(), ...extra })).status).toBe(400);
    }
  });
});

describe('PATCH /agents/:id', () => {
  it('updates name, email and phone', async () => {
    const agent = await createAgent();
    const email = `renamed-${Date.now()}${TEST_DOMAIN}`;
    const res = await admin
      .patch(`${BASE}/${agent.id}`)
      .send({ fullName: 'Renamed Agent', email, phone: '+919876500000' });
    expect(res.status).toBe(200);
    expect(res.body.data.agent).toMatchObject({
      fullName: 'Renamed Agent',
      email,
      phone: '+919876500000',
    });
  });

  it("can't take another user's email", async () => {
    const agent = await createAgent();
    const res = await admin
      .patch(`${BASE}/${agent.id}`)
      .send({ fullName: 'X Y', email: ADMIN.email, phone: '' });
    expect(res.status).toBe(409);
  });
});

describe('PATCH /agents/:id/status', () => {
  it('deactivating blocks the agent at once and ends their sessions; reactivating restores access', async () => {
    const agent = await createAgent();
    const session = await loggedIn(credentials(agent));

    const off = await admin.patch(`${BASE}/${agent.id}/status`).send({ isActive: false });
    expect(off.body.data.agent.isActive).toBe(false);

    expect((await session.get('/api/v1/auth/me')).status).toBe(401);
    expect((await session.post('/api/v1/auth/refresh')).status).toBe(401);
    const login = await browser().post('/api/v1/auth/login').send(credentials(agent));
    expect(login.body.error.code).toBe('ACCOUNT_INACTIVE');
    const live = await prisma.refreshToken.count({
      where: { userId: agent.id, revokedAt: null },
    });
    expect(live).toBe(0);

    await admin.patch(`${BASE}/${agent.id}/status`).send({ isActive: true });
    expect((await browser().post('/api/v1/auth/login').send(credentials(agent))).status).toBe(200);
  });

  it('requires a boolean', async () => {
    const agent = await createAgent();
    const res = await admin.patch(`${BASE}/${agent.id}/status`).send({ isActive: 'no' });
    expect(res.status).toBe(400);
  });
});

describe('POST /agents/:id/reset-password', () => {
  it('sets a new password, signs the agent out and clears a lockout', async () => {
    const agent = await createAgent();
    const session = await loggedIn(credentials(agent));
    await prisma.user.update({
      where: { id: agent.id },
      data: { failedLoginAttempts: 5, lockedUntil: new Date(Date.now() + 600_000) },
    });

    const newPassword = 'Changed@6789';
    const res = await admin
      .post(`${BASE}/${agent.id}/reset-password`)
      .send({ newPassword, confirmPassword: newPassword });
    expect(res.status).toBe(200);

    expect((await session.post('/api/v1/auth/refresh')).status).toBe(401);
    const old = await browser().post('/api/v1/auth/login').send(credentials(agent));
    expect(old.status).toBe(401);
    const fresh = await browser()
      .post('/api/v1/auth/login')
      .send({ email: agent.email, password: newPassword });
    expect(fresh.status).toBe(200);
  });

  it('checks that the passwords match', async () => {
    const agent = await createAgent();
    const res = await admin
      .post(`${BASE}/${agent.id}/reset-password`)
      .send({ newPassword: 'Changed@6789', confirmPassword: 'Changed@0000' });
    expect(res.status).toBe(400);
    expect(res.body.error.details.map((d: { field: string }) => d.field)).toEqual([
      'confirmPassword',
    ]);
  });
});
