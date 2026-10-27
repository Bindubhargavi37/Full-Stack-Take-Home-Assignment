// Values match the PostgreSQL enums in backend/prisma/schema.prisma.

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

/** Statuses that never change again. */
export const FINAL_STATUSES: readonly SubmissionStatus[] = ['COMPLETED', 'REJECTED'];

/** Admin actions on a submission. The server decides the new status (STATUS_TRANSITIONS). */
export const STATUS_ACTIONS = ['complete', 'send-back', 'reject'] as const;

export type StatusAction = (typeof STATUS_ACTIONS)[number];

// The status lifecycle (README: "Status transitions"). The server enforces it; the UI uses the
// same table to show only the actions that are allowed. The client never sends a status.

/** Admin actions: which statuses each one may start from, and where it leads. */
export const STATUS_TRANSITIONS: Record<
  StatusAction,
  { from: readonly SubmissionStatus[]; to: SubmissionStatus }
> = {
  complete: { from: ['BILLING_PAYMENT_DONE'], to: 'COMPLETED' },
  'send-back': {
    from: ['BILLING_PAYMENT_NOT_DONE', 'BILLING_PAYMENT_DONE'],
    to: 'NOT_FILLED_COMPLETELY',
  },
  reject: {
    from: ['BILLING_PAYMENT_NOT_DONE', 'BILLING_PAYMENT_DONE', 'NOT_FILLED_COMPLETELY'],
    to: 'REJECTED',
  },
};

/** Only a form the admin sent back can be edited and resubmitted by its agent. */
export const RESUBMITTABLE_STATUSES: readonly SubmissionStatus[] = ['NOT_FILLED_COMPLETELY'];

/** Payments can be recorded only while money is still due. */
export const PAYABLE_STATUSES: readonly SubmissionStatus[] = ['BILLING_PAYMENT_NOT_DONE'];

/** Shown in the UI instead of the raw number: 42 → "SUB-000042". */
export function formatReference(referenceNo: number): string {
  return `SUB-${String(referenceNo).padStart(6, '0')}`;
}

/** Money is compared in whole paise, so 0.1 + 0.2 rounding errors never decide a status. */
export function toPaise(amount: number): number {
  return Math.round(amount * 100);
}

/** The status a complete form gets when it is submitted: decided only by the amount due. */
export function billingStatusFor(totalAmount: number, amountPaid: number): SubmissionStatus {
  return toPaise(totalAmount) - toPaise(amountPaid) > 0
    ? 'BILLING_PAYMENT_NOT_DONE'
    : 'BILLING_PAYMENT_DONE';
}

const rupees = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' });

/** 12345.5 → "₹12,345.50" (Indian digit grouping). */
export function formatRupees(amount: number): string {
  return rupees.format(amount);
}
