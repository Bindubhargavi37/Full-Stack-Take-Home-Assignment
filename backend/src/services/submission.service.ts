import type { Prisma } from '@prisma/client';
import {
  billingStatusFor,
  PAYABLE_STATUSES,
  RESUBMITTABLE_STATUSES,
  STATUS_TRANSITIONS,
  formatRupees,
  STATUS_LABELS,
  toPaise,
  type ChangeStatusValues,
  type ListSubmissionsQuery,
  type Paginated,
  type RecordPaymentValues,
  type StatusHistoryEntry,
  type Submission,
  type SubmissionFormValues,
  type SubmissionStatus,
} from 'shared';
import * as submissionRepository from '../repositories/submission.repository';
import type { SubmissionRecord, SubmissionScope } from '../repositories/submission.repository';
import { AppError } from '../utils/AppError';
import { assertStatusIn } from './statusRules';

type CurrentUser = NonNullable<Express.Request['user']>;

/** Agents see only their own submissions; admins see those of the agents they manage. */
function scopeOf(user: CurrentUser): SubmissionScope {
  return user.role === 'AGENT' ? { agentId: user.id } : { adminId: user.id };
}

function toSubmission(record: SubmissionRecord): Submission {
  return {
    id: record.id,
    referenceNo: record.referenceNo,
    agent: record.agent,
    customerName: record.customerName,
    location: record.location,
    customerPhone: record.customerPhone,
    customerEmail: record.customerEmail,
    totalAmount: record.totalAmount?.toNumber() ?? null,
    amountPaid: record.amountPaid.toNumber(),
    amountDue: record.amountDue?.toNumber() ?? null,
    sampleCondition: record.sampleCondition,
    result: record.result,
    collectedOn: record.collectedOn?.toISOString().slice(0, 10) ?? null,
    remarks: record.remarks,
    status: record.status,
    rejectionReason: record.rejectionReason,
    submittedAt: record.submittedAt?.toISOString() ?? null,
    completedAt: record.completedAt?.toISOString() ?? null,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

/** The form fields as database columns. Server-owned fields are added by the caller. */
function formColumns(input: SubmissionFormValues) {
  return {
    customerName: input.customerName,
    location: input.location,
    customerPhone: input.customerPhone,
    customerEmail: input.customerEmail,
    totalAmount: input.totalAmount,
    amountPaid: input.amountPaid,
    sampleCondition: input.sampleCondition,
    result: input.result,
    collectedOn: input.collectedOn ? new Date(`${input.collectedOn}T00:00:00.000Z`) : null,
    remarks: input.remarks,
  } satisfies Prisma.SubmissionUncheckedUpdateManyInput;
}

/** Another user changed the submission between our read and our write. */
function conflict(): never {
  throw new AppError(
    409,
    'CONFLICT',
    'This submission was just changed by someone else. Reload it and try again.',
  );
}

/** Loads a submission inside the user's scope. Someone else's submission is a 404, not a 403. */
async function findInScope(user: CurrentUser, id: string) {
  const submission = await submissionRepository.findSubmission(id, scopeOf(user));
  if (!submission) throw new AppError(404, 'NOT_FOUND', 'Submission not found');
  return submission;
}

export async function listSubmissions(
  user: CurrentUser,
  query: ListSubmissionsQuery,
): Promise<Paginated<Submission>> {
  if (user.role === 'AGENT' && query.agentId && query.agentId !== user.id) {
    throw new AppError(403, 'FORBIDDEN', 'You can only see your own submissions');
  }
  const { items, total } = await submissionRepository.listSubmissions(scopeOf(user), query);
  return {
    items: items.map(toSubmission),
    page: query.page,
    pageSize: query.pageSize,
    total,
    totalPages: Math.ceil(total / query.pageSize),
  };
}

export async function getSubmission(user: CurrentUser, id: string) {
  return toSubmission(await findInScope(user, id));
}

export async function getStatusHistory(
  user: CurrentUser,
  id: string,
): Promise<StatusHistoryEntry[]> {
  await findInScope(user, id);
  const rows = await submissionRepository.listStatusHistory(id);
  return rows.map((row) => ({
    id: row.id,
    fromStatus: row.fromStatus,
    toStatus: row.toStatus,
    note: row.note,
    changedAt: row.changedAt.toISOString(),
    changedBy: row.changedBy,
  }));
}

/** Agent submits a complete form. The amount due alone decides the first status. */
export async function createSubmission(user: CurrentUser, input: SubmissionFormValues) {
  const status = billingStatusFor(input.totalAmount, input.amountPaid);
  const now = new Date();
  const record = await submissionRepository.createSubmission({
    ...formColumns(input),
    agentId: user.id,
    createdById: user.id,
    status,
    submittedAt: now,
    statusHistory: {
      create: { fromStatus: null, toStatus: status, changedById: user.id, changedAt: now },
    },
  });
  return toSubmission(record);
}

/** Agent fixes a form the admin sent back. It goes back to billing, decided by the amount due. */
export async function resubmitSubmission(
  user: CurrentUser,
  id: string,
  input: SubmissionFormValues,
) {
  const current = await findInScope(user, id);
  assertStatusIn(
    current.status,
    RESUBMITTABLE_STATUSES,
    'Only a submission that was sent back for changes can be edited and resubmitted',
  );

  const status = billingStatusFor(input.totalAmount, input.amountPaid);
  const updated = await submissionRepository.updateSubmission(
    id,
    { status: current.status },
    { ...formColumns(input), status, submittedAt: new Date() },
    { fromStatus: current.status, toStatus: status, changedById: user.id, note: 'Resubmitted' },
  );
  return toSubmission(updated ?? conflict());
}

/** Agent (own) or admin records money received. Paying the full due moves it to Payment Done. */
export async function recordPayment(user: CurrentUser, id: string, input: RecordPaymentValues) {
  const current = await findInScope(user, id);
  assertStatusIn(
    current.status,
    PAYABLE_STATUSES,
    'Payments can only be recorded while the status is Billing – Payment Not Done',
  );

  const paidPaise = toPaise(current.amountPaid.toNumber());
  const duePaise = toPaise(current.totalAmount?.toNumber() ?? 0) - paidPaise;
  const paymentPaise = toPaise(input.amount);
  if (paymentPaise > duePaise) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Invalid input', [
      {
        field: 'amount',
        message: `Payment cannot be more than the amount due (${formatRupees(duePaise / 100)})`,
      },
    ]);
  }

  const paidInFull = paymentPaise === duePaise;
  const status: SubmissionStatus = paidInFull ? 'BILLING_PAYMENT_DONE' : current.status;
  const updated = await submissionRepository.updateSubmission(
    id,
    // Also match the old amount, so two payments recorded at once can't both be applied.
    { status: current.status, amountPaid: current.amountPaid },
    { amountPaid: (paidPaise + paymentPaise) / 100, status },
    paidInFull
      ? {
          fromStatus: current.status,
          toStatus: status,
          changedById: user.id,
          note: `Payment of ${formatRupees(input.amount)} recorded; paid in full`,
        }
      : undefined,
  );
  return toSubmission(updated ?? conflict());
}

/** Admin completes, sends back or rejects. Only the moves in STATUS_TRANSITIONS are allowed. */
export async function changeStatus(user: CurrentUser, id: string, input: ChangeStatusValues) {
  const current = await findInScope(user, id);
  const transition = STATUS_TRANSITIONS[input.action];
  assertStatusIn(
    current.status,
    transition.from,
    `This action is not allowed while the status is ${STATUS_LABELS[current.status]}`,
  );

  const now = new Date();
  const updated = await submissionRepository.updateSubmission(
    id,
    { status: current.status },
    {
      status: transition.to,
      ...(input.action === 'reject' && { rejectionReason: input.note }),
      ...(input.action === 'complete' && { completedAt: now }),
    },
    {
      fromStatus: current.status,
      toStatus: transition.to,
      changedById: user.id,
      note: input.note ?? null,
    },
  );
  return toSubmission(updated ?? conflict());
}
