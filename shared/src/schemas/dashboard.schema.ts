import { z } from 'zod';
import {
  type SampleCondition,
  type SubmissionStatus,
  type TestResult,
} from '../constants/submission';
import { dateStringSchema, uuidSchema } from './common.schema';
import { statusFilterSchema } from './submission.schema';

/** GET /dashboard/summary. Same filter rules as the submissions list. */
export const dashboardQuerySchema = z
  .object({
    fromDate: dateStringSchema.optional(),
    toDate: dateStringSchema.optional(),
    status: statusFilterSchema.optional(),
    /**
     * Admin only: any number of the admin's own agents, combined. Without it, all their agents.
     * Repeated (?agentIds=a&agentIds=b) or comma-separated.
     */
    agentIds: z
      .preprocess(
        (value) => (typeof value === 'string' ? value.split(',').filter(Boolean) : value),
        z.array(uuidSchema).max(100, 'Choose at most 100 agents'),
      )
      .transform((ids) => [...new Set(ids)])
      .optional(),
  })
  .strict()
  .refine((data) => !data.fromDate || !data.toDate || data.fromDate <= data.toDate, {
    message: 'From date must be on or before the to date',
    path: ['toDate'],
  });

export type DashboardQuery = z.output<typeof dashboardQuerySchema>;

/** Order-size ranges for the amount histogram (₹, lower bound inclusive). */
export const AMOUNT_RANGES = [
  { label: '₹0–1k', min: 0, max: 1_000 },
  { label: '₹1k–5k', min: 1_000, max: 5_000 },
  { label: '₹5k–10k', min: 5_000, max: 10_000 },
  { label: '₹10k–25k', min: 10_000, max: 25_000 },
  { label: '₹25k–50k', min: 25_000, max: 50_000 },
  { label: '₹50k+', min: 50_000, max: null },
] as const;

/** How many locations the "top locations" chart shows. */
export const TOP_LOCATIONS_LIMIT = 8;

// ---------------------------------------------------------------------------
// Response shape. Every number is computed on the server for the caller's scope.
// Money: billed includes rejected submissions; collected and due leave them out, and money
// paid on a rejected submission is refunded. totalBilled = totalCollected + pendingDue +
// rejectedBilled.
// ---------------------------------------------------------------------------

export type DashboardCards = {
  totalSubmissions: number;
  completed: number;
  paymentDone: number;
  paymentPending: number;
  rejected: number;
  /** Not Filled Completely: sent back to the agent. */
  needsInfo: number;
  totalBilled: number;
  totalCollected: number;
  pendingDue: number;
  /** Non-rejected submissions that still have an amount due. */
  unpaidCount: number;
  /**
   * The part of unpaidCount sent back to the agent (Needs info) before being fully paid. The rest
   * is Payment pending, which always has money due.
   */
  unpaidNeedsInfo: number;
  /** Total amount of rejected submissions (part of totalBilled). */
  rejectedBilled: number;
  /** Amount paid on rejected submissions, to be refunded. */
  refunded: number;
  /** Collected ÷ (collected + due), 0–1; null when nothing live was billed. */
  collectionRate: number | null;
};

export type DashboardSummary = {
  generatedAt: string;
  /** Whose data this is: one agent, several chosen agents, or all of an admin's agents. */
  scope:
    | { kind: 'agent'; agentId: string; agentName: string }
    | { kind: 'agents'; agents: { agentId: string; agentName: string }[] }
    | { kind: 'all-agents' };
  cards: DashboardCards;
  /** V1. All five statuses, zero counts included. */
  byStatus: { status: SubmissionStatus; count: number }[];
  /** V2. Daily for ranges up to 92 days, monthly otherwise; empty periods are 0. */
  overTime: { granularity: 'day' | 'month'; points: { period: string; count: number }[] };
  /** V3. One row per month (YYYY-MM). Billed includes rejected; refunded is paid on rejected. */
  billingByMonth: {
    month: string;
    billed: number;
    collected: number;
    pending: number;
    refunded: number;
  }[];
  /** V4 */
  byResult: { result: TestResult; count: number }[];
  /** V5 */
  byCondition: { condition: SampleCondition; count: number }[];
  /** V6. Test results within each sample condition. */
  conditionVsResult: { condition: SampleCondition; counts: Record<TestResult, number> }[];
  /** V7. Grouped ignoring case and outer spaces; shown with the most common spelling. */
  topLocations: { location: string; count: number }[];
  /** V8. One agent: order sizes. Several or all agents: each agent's submissions by status. */
  breakdown:
    | { kind: 'amountRanges'; buckets: { label: string; count: number }[] }
    | {
        kind: 'agentsByStatus';
        agents: {
          agentId: string;
          agentName: string;
          counts: Record<SubmissionStatus, number>;
          total: number;
        }[];
      };
};
