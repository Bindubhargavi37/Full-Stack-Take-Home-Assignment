import type { Submission, SubmissionFormInput } from 'shared';
import type TestAgent from 'supertest/lib/agent';
import { beforeAll, describe, expect, it } from 'vitest';
import { prisma } from '../src/config/db';
import { ADMIN, AGENT, AGENT2, OTHER_ADMIN, browser, ensureOtherAdmin, loggedIn } from './helpers';

const BASE = '/api/v1/submissions';
const validForm: SubmissionFormInput = {
  customerName: 'Kavya Rao',
  location: 'Hyderabad',
  customerPhone: '9876500000',
  customerEmail: 'Kavya.Rao@Example.com',
  totalAmount: 1500,
  amountPaid: 500,
  sampleCondition: 'GOOD',
  result: 'PASS',
  collectedOn: '2026-10-01',
  remarks: '',
};

let admin: TestAgent;
let agent: TestAgent;
let agent2: TestAgent;
let otherAdmin: TestAgent;
let agentId: string;

beforeAll(async () => {
  await ensureOtherAdmin();
  [admin, agent, agent2, otherAdmin] = await Promise.all([
    loggedIn(ADMIN),
    loggedIn(AGENT),
    loggedIn(AGENT2),
    loggedIn(OTHER_ADMIN),
  ]);
  agentId = (await prisma.user.findUniqueOrThrow({ where: { email: AGENT.email } })).id;
});

async function create(form: Partial<SubmissionFormInput> = {}): Promise<Submission> {
  const res = await agent.post(BASE).send({ ...validForm, ...form });
  expect(res.status).toBe(201);
  return res.body.data.submission;
}

const fields = (res: { body: { error: { details: { field: string }[] } } }) =>
  res.body.error.details.map((detail) => detail.field);

describe('POST /submissions', () => {
  it('saves a complete form; amount due > 0 starts as Payment Not Done with one history row', async () => {
    const submission = await create();

    expect(submission).toMatchObject({
      agent: { id: agentId },
      status: 'BILLING_PAYMENT_NOT_DONE',
      totalAmount: 1500,
      amountPaid: 500,
      amountDue: 1000,
      customerEmail: 'kavya.rao@example.com',
      collectedOn: '2026-10-01',
      remarks: null,
    });
    expect(submission.referenceNo).toBeGreaterThan(0);

    const history = await agent.get(`${BASE}/${submission.id}/history`);
    expect(history.body.data.history).toEqual([
      expect.objectContaining({ fromStatus: null, toStatus: 'BILLING_PAYMENT_NOT_DONE' }),
    ]);
  });

  it('starts as Payment Done when nothing is due', async () => {
    const submission = await create({ amountPaid: 1500 });
    expect(submission).toMatchObject({ status: 'BILLING_PAYMENT_DONE', amountDue: 0 });
  });

  it('rejects server-owned fields sent by the client', async () => {
    for (const extra of [{ status: 'COMPLETED' }, { agentId }, { amountDue: 0 }]) {
      const res = await agent.post(BASE).send({ ...validForm, ...extra });
      expect(res.status).toBe(400);
    }
  });

  it('returns field errors for invalid input', async () => {
    const res = await agent.post(BASE).send({
      ...validForm,
      customerName: 'R2D2',
      totalAmount: 100,
      amountPaid: 200,
      collectedOn: '2999-01-01',
    });
    expect(res.status).toBe(400);
    expect(fields(res)).toEqual(
      expect.arrayContaining(['customerName', 'amountPaid', 'collectedOn']),
    );
  });

  it('is for agents only', async () => {
    const res = await admin.post(BASE).send(validForm);
    expect(res.status).toBe(403);
  });

  it('requires a session', async () => {
    const res = await browser().post(BASE).send(validForm);
    expect(res.status).toBe(401);
  });
});

describe('GET /submissions', () => {
  it('shows an agent only their own submissions', async () => {
    const res = await agent.get(BASE).query({ pageSize: 100 });
    expect(res.status).toBe(200);
    expect(res.body.data.total).toBeGreaterThan(0);
    for (const item of res.body.data.items as Submission[]) expect(item.agent.id).toBe(agentId);
  });

  it("forbids an agent from asking for another agent's submissions", async () => {
    const other = await prisma.user.findUniqueOrThrow({ where: { email: AGENT2.email } });
    const res = await agent.get(BASE).query({ agentId: other.id });
    expect(res.status).toBe(403);
  });

  it('lets an admin filter by agent and status, with pagination totals', async () => {
    const res = await admin.get(BASE).query({ agentId, status: 'COMPLETED,REJECTED', pageSize: 5 });
    expect(res.status).toBe(200);

    const { items, total, totalPages } = res.body.data;
    const expected = await prisma.submission.count({
      where: { agentId, status: { in: ['COMPLETED', 'REJECTED'] } },
    });
    expect(total).toBe(expected);
    expect(totalPages).toBe(Math.ceil(expected / 5));
    expect(items.length).toBeLessThanOrEqual(5);
    for (const item of items as Submission[]) {
      expect(item.agent.id).toBe(agentId);
      expect(['COMPLETED', 'REJECTED']).toContain(item.status);
    }
  });

  it('finds a submission by its reference number', async () => {
    const submission = await create();
    const reference = `SUB-${String(submission.referenceNo).padStart(6, '0')}`;
    const res = await agent.get(BASE).query({ search: reference });
    expect(res.body.data.items.map((item: Submission) => item.id)).toContain(submission.id);
  });

  it('shows an admin nothing from agents they do not manage', async () => {
    const res = await otherAdmin.get(BASE);
    expect(res.status).toBe(200);
    expect(res.body.data.total).toBe(0);
  });

  it('rejects an invalid date range and unknown query keys', async () => {
    const range = await admin.get(BASE).query({ fromDate: '2026-10-10', toDate: '2026-10-01' });
    expect(range.status).toBe(400);
    const unknown = await admin.get(BASE).query({ sortBy: 'passwordHash' });
    expect(unknown.status).toBe(400);
  });
});

describe('ownership', () => {
  it("returns 404 (not 403) for another agent's submission", async () => {
    const submission = await create();

    expect((await agent2.get(`${BASE}/${submission.id}`)).status).toBe(404);
    expect((await agent2.get(`${BASE}/${submission.id}/history`)).status).toBe(404);
    expect(
      (await agent2.post(`${BASE}/${submission.id}/payments`).send({ amount: 10 })).status,
    ).toBe(404);
    expect((await otherAdmin.get(`${BASE}/${submission.id}`)).status).toBe(404);
  });

  it('returns 400 for an id that is not a UUID', async () => {
    const res = await agent.get(`${BASE}/not-a-uuid`);
    expect(res.status).toBe(400);
  });
});

describe('POST /submissions/:id/payments', () => {
  it('keeps the status on a part payment and moves to Payment Done when paid in full', async () => {
    const submission = await create(); // 1000 due

    const part = await agent.post(`${BASE}/${submission.id}/payments`).send({ amount: 400.5 });
    expect(part.status).toBe(200);
    expect(part.body.data.submission).toMatchObject({
      status: 'BILLING_PAYMENT_NOT_DONE',
      amountPaid: 900.5,
      amountDue: 599.5,
    });

    const tooMuch = await agent.post(`${BASE}/${submission.id}/payments`).send({ amount: 600 });
    expect(tooMuch.status).toBe(400);
    expect(fields(tooMuch)).toEqual(['amount']);

    // The admin can record payments too.
    const rest = await admin.post(`${BASE}/${submission.id}/payments`).send({ amount: 599.5 });
    expect(rest.body.data.submission).toMatchObject({
      status: 'BILLING_PAYMENT_DONE',
      amountDue: 0,
    });

    const again = await agent.post(`${BASE}/${submission.id}/payments`).send({ amount: 1 });
    expect(again.status).toBe(409);
    expect(again.body.error.code).toBe('INVALID_TRANSITION');

    const history = await agent.get(`${BASE}/${submission.id}/history`);
    expect(history.body.data.history.map((row: { toStatus: string }) => row.toStatus)).toEqual([
      'BILLING_PAYMENT_NOT_DONE',
      'BILLING_PAYMENT_DONE',
    ]);
  });

  it('rejects zero, negative and over-precise amounts', async () => {
    const submission = await create();
    for (const amount of [0, -5, 1.234]) {
      const res = await agent.post(`${BASE}/${submission.id}/payments`).send({ amount });
      expect(res.status).toBe(400);
    }
  });
});

describe('PATCH /submissions/:id/status (admin)', () => {
  const changeStatus = (id: string, body: object, client = admin) =>
    client.patch(`${BASE}/${id}/status`).send(body);

  it('completes only a fully paid submission, and Completed is final', async () => {
    const unpaid = await create();
    expect((await changeStatus(unpaid.id, { action: 'complete' })).status).toBe(409);

    const paid = await create({ amountPaid: 1500 });
    const res = await changeStatus(paid.id, { action: 'complete' });
    expect(res.status).toBe(200);
    expect(res.body.data.submission.status).toBe('COMPLETED');
    expect(res.body.data.submission.completedAt).not.toBeNull();

    for (const body of [
      { action: 'complete' },
      { action: 'send-back', note: 'Please add the phone number' },
      { action: 'reject', note: 'Duplicate of an earlier one' },
    ]) {
      expect((await changeStatus(paid.id, body)).status).toBe(409);
    }
  });

  it('sends back with a note; the agent fixes and resubmits it', async () => {
    const submission = await create();

    const noNote = await changeStatus(submission.id, { action: 'send-back' });
    expect(noNote.status).toBe(400);
    const shortNote = await changeStatus(submission.id, { action: 'send-back', note: 'Fix it' });
    expect(fields(shortNote)).toEqual(['note']);

    const sentBack = await changeStatus(submission.id, {
      action: 'send-back',
      note: 'Customer phone number is missing.',
    });
    expect(sentBack.body.data.submission.status).toBe('NOT_FILLED_COMPLETELY');

    // While sent back, payments are not accepted.
    const payment = await agent.post(`${BASE}/${submission.id}/payments`).send({ amount: 1 });
    expect(payment.status).toBe(409);

    const resubmitted = await agent
      .patch(`${BASE}/${submission.id}`)
      .send({ ...validForm, customerPhone: '9876511111', amountPaid: 1500 });
    expect(resubmitted.status).toBe(200);
    expect(resubmitted.body.data.submission).toMatchObject({
      status: 'BILLING_PAYMENT_DONE',
      customerPhone: '9876511111',
    });

    // Only a sent-back submission can be resubmitted.
    const again = await agent.patch(`${BASE}/${submission.id}`).send(validForm);
    expect(again.status).toBe(409);

    const history = await agent.get(`${BASE}/${submission.id}/history`);
    expect(history.body.data.history).toEqual([
      expect.objectContaining({ fromStatus: null, toStatus: 'BILLING_PAYMENT_NOT_DONE' }),
      expect.objectContaining({
        fromStatus: 'BILLING_PAYMENT_NOT_DONE',
        toStatus: 'NOT_FILLED_COMPLETELY',
        note: 'Customer phone number is missing.',
        changedBy: expect.objectContaining({ role: 'ADMIN' }),
      }),
      expect.objectContaining({
        fromStatus: 'NOT_FILLED_COMPLETELY',
        toStatus: 'BILLING_PAYMENT_DONE',
        changedBy: expect.objectContaining({ role: 'AGENT' }),
      }),
    ]);
  });

  it('rejects with a reason, which is saved on the submission', async () => {
    const submission = await create();
    const res = await changeStatus(submission.id, {
      action: 'reject',
      note: 'Sample could not be identified.',
    });
    expect(res.body.data.submission).toMatchObject({
      status: 'REJECTED',
      rejectionReason: 'Sample could not be identified.',
    });
  });

  it('is for admins only, and only for their own agents', async () => {
    const submission = await create({ amountPaid: 1500 });
    expect((await changeStatus(submission.id, { action: 'complete' }, agent)).status).toBe(403);
    expect((await changeStatus(submission.id, { action: 'complete' }, otherAdmin)).status).toBe(
      404,
    );
  });

  it('rejects an unknown action', async () => {
    const submission = await create();
    const res = await changeStatus(submission.id, { action: 'approve' });
    expect(res.status).toBe(400);
  });
});

describe('PATCH /submissions/:id (resubmit)', () => {
  it('is for agents only', async () => {
    const submission = await create();
    const res = await admin.patch(`${BASE}/${submission.id}`).send(validForm);
    expect(res.status).toBe(403);
  });
});
