import { z } from 'zod';
import type { Role } from '../constants/roles';
import {
  SAMPLE_CONDITIONS,
  SUBMISSION_STATUSES,
  TEST_RESULTS,
  toPaise,
  type SampleCondition,
  type SubmissionStatus,
  type TestResult,
} from '../constants/submission';
import { dateStringSchema, paginationSchema, uuidSchema } from './common.schema';

export const MAX_AMOUNT = 10_000_000;

const hasAtMostTwoDecimals = (value: number) => Math.abs(value * 100 - toPaise(value)) < 1e-6;

function money(label: string) {
  return z
    .number({ message: `Enter the ${label.toLowerCase()}` })
    .max(MAX_AMOUNT, `${label} must be at most ₹${MAX_AMOUNT.toLocaleString('en-IN')}`)
    .refine(hasAtMostTwoDecimals, `${label} can have at most 2 decimal places`);
}

/** Optional text: missing, empty or blank becomes null; anything else must pass `rule`. */
function optional<T extends z.ZodType<unknown, string>>(rule: T) {
  return z
    .string()
    .trim()
    .transform((value) => (value === '' ? null : value))
    .pipe(rule.nullable())
    .nullish()
    .transform((value) => value ?? null);
}

/** Not later than tomorrow: one day of slack so a user ahead of the server's time zone isn't blocked. */
const notInFuture = (value: string) => new Date(value).getTime() <= Date.now() + 24 * 3_600_000;

/**
 * The submission form, used to create a submission and to resubmit one the admin sent back.
 * Strict: agentId, status, amountDue and other server-owned fields are rejected if sent.
 */
export const submissionFormSchema = z
  .object({
    customerName: z
      .string({ message: 'Customer name is required' })
      .trim()
      .min(1, 'Customer name is required')
      .min(2, 'Customer name must be at least 2 characters')
      .max(100, 'Customer name must be at most 100 characters')
      .regex(/^[\p{L} .'-]+$/u, "Use letters, spaces and . ' - only"),
    location: z
      .string({ message: 'Location is required' })
      .trim()
      .min(1, 'Location is required')
      .min(2, 'Location must be at least 2 characters')
      .max(150, 'Location must be at most 150 characters'),
    customerPhone: optional(
      z.string().regex(/^\+?[0-9]{10,15}$/, 'Enter 10–15 digits, optionally starting with +'),
    ),
    customerEmail: optional(
      z
        .string()
        .max(254, 'Email must be at most 254 characters')
        .pipe(z.email({ message: 'Enter a valid email address' }))
        .transform((value) => value.toLowerCase()),
    ),
    totalAmount: money('Total amount').refine((value) => value > 0, {
      message: 'Total amount must be more than 0',
    }),
    amountPaid: money('Amount paid')
      .refine((value) => value >= 0, { message: 'Amount paid cannot be negative' })
      .default(0),
    sampleCondition: z.enum(SAMPLE_CONDITIONS, { message: 'Choose the sample condition' }),
    result: z.enum(TEST_RESULTS, { message: 'Choose the test result' }),
    collectedOn: optional(
      dateStringSchema.refine(notInFuture, 'Collection date cannot be in the future'),
    ),
    remarks: optional(z.string().max(500, 'Remarks must be at most 500 characters')),
  })
  .strict()
  .refine((data) => toPaise(data.amountPaid) <= toPaise(data.totalAmount), {
    message: 'Amount paid cannot be more than the total amount',
    path: ['amountPaid'],
  });

export type SubmissionFormInput = z.input<typeof submissionFormSchema>;
export type SubmissionFormValues = z.output<typeof submissionFormSchema>;

export const SUBMISSION_SORT_FIELDS = [
  'createdAt',
  'referenceNo',
  'customerName',
  'totalAmount',
  'amountDue',
  'status',
] as const;

/** GET /submissions. `status` may repeat (?status=A&status=B) or be comma-separated. */
export const listSubmissionsQuerySchema = paginationSchema
  .extend({
    status: z
      .preprocess(
        (value) => (typeof value === 'string' ? value.split(',').filter(Boolean) : value),
        z.array(z.enum(SUBMISSION_STATUSES, { message: 'Unknown status' })),
      )
      .optional(),
    fromDate: dateStringSchema.optional(),
    toDate: dateStringSchema.optional(),
    search: z
      .string()
      .trim()
      .max(100, 'Search must be at most 100 characters')
      .transform((value) => value || undefined)
      .optional(),
    /** Admin only: one of the admin's own agents. */
    agentId: uuidSchema.optional(),
    sortBy: z.enum(SUBMISSION_SORT_FIELDS).default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
  })
  .strict()
  .refine((data) => !data.fromDate || !data.toDate || data.fromDate <= data.toDate, {
    message: 'From date must be on or before the to date',
    path: ['toDate'],
  });

export type ListSubmissionsQuery = z.output<typeof listSubmissionsQuerySchema>;

export const recordPaymentSchema = z
  .object({
    amount: money('Payment').refine((value) => value > 0, {
      message: 'Payment must be more than 0',
    }),
  })
  .strict();

export type RecordPaymentInput = z.input<typeof recordPaymentSchema>;
export type RecordPaymentValues = z.output<typeof recordPaymentSchema>;

const requiredNote = z
  .string({ message: 'A note is required' })
  .trim()
  .min(10, 'Write at least 10 characters')
  .max(500, 'Note must be at most 500 characters');

/** Admin status change. Sending back and rejecting need a reason the agent will see. */
export const changeStatusSchema = z.discriminatedUnion('action', [
  z
    .object({
      action: z.literal('complete'),
      note: z
        .string()
        .trim()
        .max(500, 'Note must be at most 500 characters')
        .transform((value) => value || undefined)
        .optional(),
    })
    .strict(),
  z.object({ action: z.literal('send-back'), note: requiredNote }).strict(),
  z.object({ action: z.literal('reject'), note: requiredNote }).strict(),
]);

export type ChangeStatusInput = z.input<typeof changeStatusSchema>;
export type ChangeStatusValues = z.output<typeof changeStatusSchema>;

// ---------------------------------------------------------------------------
// Response shapes (money as numbers, dates as ISO strings).
// ---------------------------------------------------------------------------

export type Submission = {
  id: string;
  referenceNo: number;
  agent: { id: string; fullName: string };
  customerName: string | null;
  location: string | null;
  customerPhone: string | null;
  customerEmail: string | null;
  totalAmount: number | null;
  amountPaid: number;
  amountDue: number | null;
  sampleCondition: SampleCondition | null;
  result: TestResult | null;
  /** YYYY-MM-DD */
  collectedOn: string | null;
  remarks: string | null;
  status: SubmissionStatus;
  rejectionReason: string | null;
  submittedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type StatusHistoryEntry = {
  id: string;
  fromStatus: SubmissionStatus | null;
  toStatus: SubmissionStatus;
  note: string | null;
  changedAt: string;
  changedBy: { id: string; fullName: string; role: Role };
};

export type Paginated<T> = {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};
