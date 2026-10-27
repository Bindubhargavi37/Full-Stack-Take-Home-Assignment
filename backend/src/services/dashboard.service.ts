import {
  AMOUNT_RANGES,
  istDate,
  SAMPLE_CONDITIONS,
  SUBMISSION_STATUSES,
  TEST_RESULTS,
  type DashboardQuery,
  type DashboardSummary,
  type SampleCondition,
  type SubmissionStatus,
  type TestResult,
} from 'shared';
import { findAgentsByIds } from '../repositories/agent.repository';
import * as dashboardRepository from '../repositories/dashboard.repository';
import type { DashboardScope } from '../repositories/dashboard.repository';
import { AppError } from '../utils/AppError';

type CurrentUser = NonNullable<Express.Request['user']>;

const DAY = 86_400_000;
/** Ranges up to this many days are charted per day; longer ones per month. */
const MAX_DAILY_POINTS = 92;

const round2 = (value: number) => Math.round(value * 100) / 100;
// Plain calendar arithmetic on YYYY-MM-DD strings (done in UTC so no time zone can shift a day).
const toDay = (time: number) => new Date(time).toISOString().slice(0, 10);
const dayTime = (day: string) => Date.parse(`${day}T00:00:00.000Z`);

function zeroCounts<K extends string>(keys: readonly K[]): Record<K, number> {
  return Object.fromEntries(keys.map((key) => [key, 0])) as Record<K, number>;
}

/** Every month (YYYY-MM) from the first day's month to the last day's month. */
function monthsBetween(firstDay: string, lastDay: string): string[] {
  const months: string[] = [];
  const cursor = new Date(`${firstDay.slice(0, 7)}-01T00:00:00.000Z`);
  while (cursor.toISOString().slice(0, 7) <= lastDay.slice(0, 7)) {
    months.push(cursor.toISOString().slice(0, 7));
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  return months;
}

/**
 * Decides whose data the dashboard shows. Agents: always their own (asking for another agent is
 * 403). Admins: all their agents, or any chosen set of them; one id that isn't theirs is a 404.
 */
async function resolveScope(user: CurrentUser, query: DashboardQuery) {
  if (user.role === 'AGENT') {
    if (query.agentIds?.some((id) => id !== user.id)) {
      throw new AppError(403, 'FORBIDDEN', 'You can only see your own dashboard');
    }
    return {
      scope: { agentIds: [user.id] } as DashboardScope,
      summaryScope: { kind: 'agent', agentId: user.id, agentName: user.fullName } as const,
    };
  }
  if (query.agentIds?.length) {
    const agents = await findAgentsByIds(query.agentIds, user.id);
    if (agents.length !== query.agentIds.length) {
      throw new AppError(404, 'NOT_FOUND', 'Agent not found');
    }
    const [only] = agents;
    return {
      scope: { agentIds: agents.map((agent) => agent.id) } as DashboardScope,
      summaryScope:
        agents.length === 1 && only
          ? ({ kind: 'agent', agentId: only.id, agentName: only.fullName } as const)
          : ({
              kind: 'agents',
              agents: agents.map((agent) => ({ agentId: agent.id, agentName: agent.fullName })),
            } as const),
    };
  }
  return {
    scope: { adminId: user.id } as DashboardScope,
    summaryScope: { kind: 'all-agents' } as const,
  };
}

export async function getSummary(
  user: CurrentUser,
  query: DashboardQuery,
): Promise<DashboardSummary> {
  const { scope, summaryScope } = await resolveScope(user, query);
  const oneAgent = summaryScope.kind === 'agent';

  const [statusRows, money, dayRows, monthRows, pairRows, locationRows, breakdownRows] =
    await Promise.all([
      dashboardRepository.countByStatus(scope, query),
      dashboardRepository.moneyTotals(scope, query),
      dashboardRepository.countByDay(scope, query),
      dashboardRepository.billingByMonth(scope, query),
      dashboardRepository.countByConditionAndResult(scope, query),
      dashboardRepository.topLocations(scope, query),
      oneAgent
        ? dashboardRepository.countByAmountRange(scope, query)
        : dashboardRepository.countByAgentAndStatus(scope, query),
    ]);

  // --- Cards and V1 ------------------------------------------------------------------------
  const statusCounts = zeroCounts(SUBMISSION_STATUSES);
  for (const row of statusRows) statusCounts[row.status as SubmissionStatus] = row.count;
  const total = Object.values(statusCounts).reduce((sum, count) => sum + count, 0);

  const liveBilled = money.collected + money.due;

  // --- The period covered by the time charts -----------------------------------------------
  // From the "from" filter (or the first submission) to the "to" filter (or today), never
  // past today, so the line doesn't run on into empty future days.
  const today = istDate();
  const firstDay = query.fromDate ?? dayRows[0]?.day;
  const lastDay = query.toDate && query.toDate < today ? query.toDate : today;
  const hasRange = firstDay !== undefined && firstDay <= lastDay;
  const spanDays = hasRange ? (dayTime(lastDay) - dayTime(firstDay)) / DAY + 1 : 0;
  const granularity = spanDays > MAX_DAILY_POINTS ? 'month' : 'day';

  // --- V2: submissions over time, empty periods filled with 0 -------------------------------
  const perPeriod = new Map<string, number>();
  for (const row of dayRows) {
    const period = granularity === 'month' ? row.day.slice(0, 7) : row.day;
    perPeriod.set(period, (perPeriod.get(period) ?? 0) + row.count);
  }
  const periods = !hasRange
    ? []
    : granularity === 'month'
      ? monthsBetween(firstDay, lastDay)
      : Array.from({ length: spanDays }, (_, i) => toDay(dayTime(firstDay) + i * DAY));

  // --- V3: billing per month, empty months filled with 0 ------------------------------------
  const billingRows = new Map(monthRows.map((row) => [row.month, row]));
  const months = hasRange ? monthsBetween(firstDay, lastDay) : monthRows.map((row) => row.month);

  // --- V4, V5, V6 from the (condition, result) pairs ----------------------------------------
  const resultCounts = zeroCounts(TEST_RESULTS);
  const conditionCounts = zeroCounts(SAMPLE_CONDITIONS);
  const matrix = Object.fromEntries(
    SAMPLE_CONDITIONS.map((condition) => [condition, zeroCounts(TEST_RESULTS)]),
  ) as Record<SampleCondition, Record<TestResult, number>>;
  for (const { condition, result, count } of pairRows) {
    if (result) resultCounts[result as TestResult] += count;
    if (condition) conditionCounts[condition as SampleCondition] += count;
    if (condition && result) matrix[condition as SampleCondition][result as TestResult] += count;
  }

  // --- V8 --------------------------------------------------------------------------------------
  let breakdown: DashboardSummary['breakdown'];
  if (oneAgent) {
    const buckets = AMOUNT_RANGES.map((range) => ({ label: range.label, count: 0 }));
    for (const row of breakdownRows as { bucket: number; count: number }[]) {
      const bucket = buckets[row.bucket];
      if (bucket) bucket.count = row.count;
    }
    breakdown = { kind: 'amountRanges', buckets };
  } else {
    const agents = new Map<
      string,
      {
        agentId: string;
        agentName: string;
        counts: Record<SubmissionStatus, number>;
        total: number;
      }
    >();
    for (const row of breakdownRows as {
      agentId: string;
      agentName: string;
      status: string;
      count: number;
    }[]) {
      const agent = agents.get(row.agentId) ?? {
        agentId: row.agentId,
        agentName: row.agentName,
        counts: zeroCounts(SUBMISSION_STATUSES),
        total: 0,
      };
      agent.counts[row.status as SubmissionStatus] = row.count;
      agent.total += row.count;
      agents.set(row.agentId, agent);
    }
    breakdown = { kind: 'agentsByStatus', agents: [...agents.values()] };
  }

  return {
    generatedAt: new Date().toISOString(),
    scope: summaryScope,
    cards: {
      totalSubmissions: total,
      completed: statusCounts.COMPLETED,
      paymentDone: statusCounts.BILLING_PAYMENT_DONE,
      paymentPending: statusCounts.BILLING_PAYMENT_NOT_DONE,
      rejected: statusCounts.REJECTED,
      needsInfo: statusCounts.NOT_FILLED_COMPLETELY,
      totalBilled: round2(money.billed),
      totalCollected: round2(money.collected),
      pendingDue: round2(money.due),
      unpaidCount: money.unpaidCount,
      unpaidNeedsInfo: money.unpaidNeedsInfo,
      rejectedBilled: round2(money.rejectedBilled),
      refunded: round2(money.refunded),
      collectionRate: liveBilled > 0 ? money.collected / liveBilled : null,
    },
    byStatus: SUBMISSION_STATUSES.map((status) => ({ status, count: statusCounts[status] })),
    overTime: {
      granularity,
      points: periods.map((period) => ({ period, count: perPeriod.get(period) ?? 0 })),
    },
    billingByMonth: months.map((month) => {
      const row = billingRows.get(month);
      return {
        month,
        billed: round2(row?.billed ?? 0),
        collected: round2(row?.collected ?? 0),
        pending: round2(row?.pending ?? 0),
        refunded: round2(row?.refunded ?? 0),
      };
    }),
    byResult: TEST_RESULTS.map((result) => ({ result, count: resultCounts[result] })),
    byCondition: SAMPLE_CONDITIONS.map((condition) => ({
      condition,
      count: conditionCounts[condition],
    })),
    conditionVsResult: SAMPLE_CONDITIONS.map((condition) => ({
      condition,
      counts: matrix[condition],
    })),
    topLocations: locationRows,
    breakdown,
  };
}
