import type { Prisma } from '@prisma/client';
import { istDate, istDayEnd, istDayStart, type DashboardSummary } from 'shared';
import type TestAgent from 'supertest/lib/agent';
import { beforeAll, describe, expect, it } from 'vitest';
import { prisma } from '../src/config/db';
import { ADMIN, AGENT, AGENT2, OTHER_ADMIN, browser, ensureOtherAdmin, loggedIn } from './helpers';

const URL = '/api/v1/dashboard/summary';

let admin: TestAgent;
let agent: TestAgent;
let otherAdmin: TestAgent;
let agentId: string;
let adminId: string;

beforeAll(async () => {
  await ensureOtherAdmin();
  [admin, agent, otherAdmin] = await Promise.all([
    loggedIn(ADMIN),
    loggedIn(AGENT),
    loggedIn(OTHER_ADMIN),
  ]);
  agentId = (await prisma.user.findUniqueOrThrow({ where: { email: AGENT.email } })).id;
  adminId = (await prisma.user.findUniqueOrThrow({ where: { email: ADMIN.email } })).id;
});

async function summary(client: TestAgent, query: Record<string, string> = {}) {
  const res = await client.get(URL).query(query);
  expect(res.status).toBe(200);
  return res.body.data as DashboardSummary;
}

/**
 * The expected numbers, computed separately with Prisma instead of the dashboard's SQL.
 * Billed counts every submission; collected and due only non-rejected ones; money paid on
 * rejected ones is refunded.
 */
async function expected(where: Prisma.SubmissionWhereInput) {
  // AND keeps any status filter in `where` while adding the rejected / not rejected split.
  const live = { AND: [where, { status: { not: 'REJECTED' as const } }] };
  const rejected = { AND: [where, { status: 'REJECTED' as const }] };
  const [total, byStatus, all, liveMoney, rejectedMoney, unpaid] = await Promise.all([
    prisma.submission.count({ where }),
    prisma.submission.groupBy({ by: ['status'], where, _count: true }),
    prisma.submission.aggregate({ where, _sum: { totalAmount: true } }),
    prisma.submission.aggregate({ where: live, _sum: { amountPaid: true, amountDue: true } }),
    prisma.submission.aggregate({
      where: rejected,
      _sum: { totalAmount: true, amountPaid: true },
    }),
    prisma.submission.count({ where: { AND: [live, { amountDue: { gt: 0 } }] } }),
  ]);
  const count = (status: string) => byStatus.find((row) => row.status === status)?._count ?? 0;
  return {
    total,
    completed: count('COMPLETED'),
    rejected: count('REJECTED'),
    needsInfo: count('NOT_FILLED_COMPLETELY'),
    billed: all._sum.totalAmount?.toNumber() ?? 0,
    collected: liveMoney._sum.amountPaid?.toNumber() ?? 0,
    due: liveMoney._sum.amountDue?.toNumber() ?? 0,
    rejectedBilled: rejectedMoney._sum.totalAmount?.toNumber() ?? 0,
    refunded: rejectedMoney._sum.amountPaid?.toNumber() ?? 0,
    unpaid,
  };
}

describe('access', () => {
  it('requires a session', async () => {
    expect((await browser().get(URL)).status).toBe(401);
  });

  it("forbids an agent from asking for another agent's dashboard", async () => {
    const other = await prisma.user.findUniqueOrThrow({ where: { email: AGENT2.email } });
    expect((await agent.get(URL).query({ agentIds: other.id })).status).toBe(403);
    expect((await agent.get(URL).query({ agentIds: `${agentId},${other.id}` })).status).toBe(403);
    expect((await agent.get(URL).query({ agentIds: agentId })).status).toBe(200);
  });

  it("returns 404 when an admin asks for another admin's agent, and no data for their own", async () => {
    expect((await otherAdmin.get(URL).query({ agentIds: agentId })).status).toBe(404);
    const empty = await summary(otherAdmin);
    expect(empty.cards.totalSubmissions).toBe(0);
    expect(empty.cards.collectionRate).toBeNull();
  });

  it('rejects invalid filters', async () => {
    for (const query of [
      { fromDate: '2026-10-10', toDate: '2026-10-01' },
      { status: 'APPROVED' },
      { agentIds: 'not-a-uuid' },
      { agentId },
      { groupBy: 'agent' },
    ]) {
      expect((await admin.get(URL).query(query)).status).toBe(400);
    }
  });
});

describe('agent dashboard', () => {
  it('matches an independent count of their own submissions', async () => {
    const data = await summary(agent);
    const want = await expected({ agentId });

    expect(data.scope).toEqual({ kind: 'agent', agentId, agentName: 'Ravi Kumar' });
    expect(data.cards).toMatchObject({
      totalSubmissions: want.total,
      completed: want.completed,
      rejected: want.rejected,
      needsInfo: want.needsInfo,
    });
    expect(data.cards.totalBilled).toBeCloseTo(want.billed, 2);
    expect(data.cards.totalCollected).toBeCloseTo(want.collected, 2);
    expect(data.cards.pendingDue).toBeCloseTo(want.due, 2);
    expect(data.cards.rejectedBilled).toBeCloseTo(want.rejectedBilled, 2);
    expect(data.cards.refunded).toBeCloseTo(want.refunded, 2);
    expect(data.cards.unpaidCount).toBe(want.unpaid);
    expect(data.cards.collectionRate).toBeCloseTo(want.collected / (want.collected + want.due), 6);
  });

  it('keeps every chart consistent with the cards', async () => {
    const data = await summary(agent);
    const sum = (values: number[]) => values.reduce((a, b) => a + b, 0);
    const total = data.cards.totalSubmissions;

    expect(sum(data.byStatus.map((row) => row.count))).toBe(total);
    expect(data.byStatus).toHaveLength(5);
    expect(sum(data.overTime.points.map((point) => point.count))).toBe(total);
    expect(sum(data.billingByMonth.map((row) => row.billed))).toBeCloseTo(
      data.cards.totalBilled,
      2,
    );
    expect(sum(data.byResult.map((row) => row.count))).toBe(total);
    expect(sum(data.byCondition.map((row) => row.count))).toBe(total);
    expect(sum(data.conditionVsResult.flatMap((row) => Object.values(row.counts)))).toBe(total);
    expect(data.breakdown.kind).toBe('amountRanges');
    if (data.breakdown.kind === 'amountRanges') {
      expect(data.breakdown.buckets).toHaveLength(6);
      expect(sum(data.breakdown.buckets.map((bucket) => bucket.count))).toBe(total);
    }
  });

  it('lists the top locations, busiest first', async () => {
    const data = await summary(agent);
    const counts = data.topLocations.map((row) => row.count);
    expect(data.topLocations.length).toBeLessThanOrEqual(8);
    expect(counts).toEqual([...counts].sort((a, b) => b - a));

    const [busiest] = await prisma.submission.groupBy({
      by: ['location'],
      where: { agentId },
      _count: true,
      orderBy: { _count: { location: 'desc' } },
      take: 1,
    });
    expect(data.topLocations[0]?.count).toBe(busiest?._count);
  });
});

describe('admin dashboard', () => {
  it('combines all their agents, with a per-agent status breakdown', async () => {
    const data = await summary(admin);
    const want = await expected({ agent: { adminId } });

    expect(data.scope).toEqual({ kind: 'all-agents' });
    expect(data.cards.totalSubmissions).toBe(want.total);
    expect(data.cards.totalBilled).toBeCloseTo(want.billed, 2);
    expect(data.breakdown.kind).toBe('agentsByStatus');
    if (data.breakdown.kind === 'agentsByStatus') {
      const agentTotals = data.breakdown.agents.map((row) => row.total);
      expect(agentTotals.reduce((a, b) => a + b, 0)).toBe(want.total);
    }
  });

  it("shows exactly the agent's own numbers when one agent is selected", async () => {
    const [forAdmin, forAgent] = await Promise.all([
      summary(admin, { agentIds: agentId }),
      summary(agent),
    ]);
    expect(forAdmin.scope).toMatchObject({ kind: 'agent', agentId });
    expect(forAdmin.cards).toEqual(forAgent.cards);
    expect(forAdmin.breakdown.kind).toBe('amountRanges');
  });
});

describe('admin: several agents', () => {
  it('combines exactly the chosen agents, with a per-agent breakdown', async () => {
    const agent2Id = (await prisma.user.findUniqueOrThrow({ where: { email: AGENT2.email } })).id;
    const data = await summary(admin, { agentIds: `${agentId},${agent2Id}` });
    const want = await expected({ agentId: { in: [agentId, agent2Id] } });

    expect(data.scope).toEqual({
      kind: 'agents',
      agents: [
        { agentId: agent2Id, agentName: 'Priya Nair' },
        { agentId, agentName: 'Ravi Kumar' },
      ],
    });
    expect(data.cards.totalSubmissions).toBe(want.total);
    expect(data.cards.totalBilled).toBeCloseTo(want.billed, 2);
    expect(data.breakdown.kind).toBe('agentsByStatus');
    if (data.breakdown.kind === 'agentsByStatus') {
      expect(data.breakdown.agents.map((row) => row.agentId).sort()).toEqual(
        [agentId, agent2Id].sort(),
      );
    }
  });

  it('accepts repeated ids and ignores duplicates', async () => {
    const res = await admin.get(`${URL}?agentIds=${agentId}&agentIds=${agentId}`);
    expect(res.status).toBe(200);
    expect(res.body.data.scope).toMatchObject({ kind: 'agent', agentId });
  });

  it('returns 404 when any chosen agent belongs to another admin', async () => {
    const otherAdminRow = await prisma.user.findUniqueOrThrow({
      where: { email: OTHER_ADMIN.email },
    });
    const res = await admin.get(URL).query({ agentIds: `${agentId},${otherAdminRow.id}` });
    expect(res.status).toBe(404);
  });
});

describe('filters', () => {
  it('bills rejected submissions but counts money paid on them as refunded', async () => {
    const data = await summary(admin, { status: 'REJECTED' });
    const want = await expected({ agent: { adminId }, status: 'REJECTED' });
    expect(want.total).toBeGreaterThan(0);
    expect(data.cards.rejected).toBe(want.total);
    expect(data.cards.totalSubmissions).toBe(want.total);
    expect(data.cards.totalBilled).toBeCloseTo(want.rejectedBilled, 2);
    expect(data.cards.rejectedBilled).toBeCloseTo(want.rejectedBilled, 2);
    expect(data.cards.refunded).toBeCloseTo(want.refunded, 2);
    expect(data.cards.totalCollected).toBe(0);
    expect(data.cards.pendingDue).toBe(0);
    expect(data.cards.unpaidCount).toBe(0);
    expect(data.cards.collectionRate).toBeNull();
  });

  it('filters by status (several at once)', async () => {
    const data = await summary(admin, { status: 'COMPLETED,BILLING_PAYMENT_DONE' });
    const want = await expected({
      agent: { adminId },
      status: { in: ['COMPLETED', 'BILLING_PAYMENT_DONE'] },
    });
    expect(data.cards.totalSubmissions).toBe(want.total);
    expect(data.cards.paymentPending).toBe(0);
  });

  it('filters by whole IST days and charts a short range per day', async () => {
    const [first] = await prisma.submission.findMany({
      where: { agentId },
      orderBy: { createdAt: 'asc' },
      take: 1,
    });
    const day = istDate(first!.createdAt);
    const data = await summary(agent, { fromDate: day, toDate: day });
    const want = await expected({
      agentId,
      createdAt: {
        gte: istDayStart(day),
        lt: istDayEnd(day),
      },
    });

    expect(data.cards.totalSubmissions).toBe(want.total);
    expect(data.overTime).toEqual({
      granularity: 'day',
      points: [{ period: day, count: want.total }],
    });
  });

  it('charts a long range per month, with empty months as 0', async () => {
    const data = await summary(agent, { fromDate: '2026-01-01' });
    expect(data.overTime.granularity).toBe('month');
    expect(data.overTime.points[0]).toEqual({ period: '2026-01', count: 0 });
    expect(data.billingByMonth[0]).toEqual({
      month: '2026-01',
      billed: 0,
      collected: 0,
      pending: 0,
      refunded: 0,
    });
  });
});

describe('money', () => {
  it('splits total billed into collected, due and rejected, matching independent sums', async () => {
    const data = await summary(admin);
    const want = await expected({ agent: { adminId } });
    const { totalBilled, totalCollected, pendingDue, rejectedBilled, refunded } = data.cards;

    expect(want.rejected).toBeGreaterThan(0);
    expect(totalBilled).toBeCloseTo(want.billed, 2);
    expect(totalCollected).toBeCloseTo(want.collected, 2);
    expect(pendingDue).toBeCloseTo(want.due, 2);
    expect(rejectedBilled).toBeCloseTo(want.rejectedBilled, 2);
    expect(refunded).toBeCloseTo(want.refunded, 2);
    expect(data.cards.unpaidCount).toBe(want.unpaid);
    expect(totalBilled).toBeCloseTo(totalCollected + pendingDue + rejectedBilled, 2);

    // The monthly chart adds up to the same figures.
    const sum = (key: 'billed' | 'collected' | 'pending' | 'refunded') =>
      data.billingByMonth.reduce((total, row) => total + row[key], 0);
    expect(sum('billed')).toBeCloseTo(totalBilled, 2);
    expect(sum('collected')).toBeCloseTo(totalCollected, 2);
    expect(sum('pending')).toBeCloseTo(pendingDue, 2);
    expect(sum('refunded')).toBeCloseTo(refunded, 2);
  });
});
