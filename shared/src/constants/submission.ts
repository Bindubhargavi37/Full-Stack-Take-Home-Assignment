// Values match the PostgreSQL enums in server/prisma/schema.prisma.

export const SUBMISSION_STATUSES = [
  'BILLING_PAYMENT_NOT_DONE',
  'BILLING_PAYMENT_DONE',
  'NOT_FILLED_COMPLETELY',
  'COMPLETED',
  'REJECTED',
] as const;

export type SubmissionStatus = (typeof SUBMISSION_STATUSES)[number];

export const STATUS_LABELS: Record<SubmissionStatus, string> = {
  BILLING_PAYMENT_NOT_DONE: 'Billing – Payment Not Done',
  BILLING_PAYMENT_DONE: 'Billing – Payment Done',
  NOT_FILLED_COMPLETELY: 'Not Filled Completely',
  COMPLETED: 'Completed',
  REJECTED: 'Rejected',
};

/** daisyUI semantic colour per status, so badges and charts suit every theme. */
export const STATUS_TONES: Record<
  SubmissionStatus,
  'warning' | 'info' | 'neutral' | 'success' | 'error'
> = {
  BILLING_PAYMENT_NOT_DONE: 'warning',
  BILLING_PAYMENT_DONE: 'info',
  NOT_FILLED_COMPLETELY: 'neutral',
  COMPLETED: 'success',
  REJECTED: 'error',
};

export const SAMPLE_CONDITIONS = ['GOOD', 'OPEN', 'DAMAGED'] as const;

export type SampleCondition = (typeof SAMPLE_CONDITIONS)[number];

export const SAMPLE_CONDITION_LABELS: Record<SampleCondition, string> = {
  GOOD: 'Good',
  OPEN: 'Open',
  DAMAGED: 'Damaged',
};

export const TEST_RESULTS = ['PASS', 'FAIL', 'CANNOT_BE_DECIDED'] as const;

export type TestResult = (typeof TEST_RESULTS)[number];

export const TEST_RESULT_LABELS: Record<TestResult, string> = {
  PASS: 'Pass',
  FAIL: 'Fail',
  CANNOT_BE_DECIDED: 'Cannot be decided',
};
