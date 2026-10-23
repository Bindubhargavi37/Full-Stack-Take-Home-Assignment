import type { Prisma, SubmissionStatus } from '@prisma/client';
import type { ListSubmissionsQuery } from 'shared';
import { prisma } from '../config/db';

/** Whose submissions a request may touch: an agent's own, or those of one admin's agents. */
export type SubmissionScope = { agentId: string } | { adminId: string };

const submissionInclude = {
  agent: { select: { id: true, fullName: true } },
} satisfies Prisma.SubmissionInclude;

export type SubmissionRecord = Prisma.SubmissionGetPayload<{ include: typeof submissionInclude }>;

const DAY = 86_400_000;

function scopeWhere(scope: SubmissionScope): Prisma.SubmissionWhereInput {
  return 'agentId' in scope ? { agentId: scope.agentId } : { agent: { adminId: scope.adminId } };
}

function listWhere(scope: SubmissionScope, query: ListSubmissionsQuery) {
  const conditions: Prisma.SubmissionWhereInput[] = [scopeWhere(scope)];

  if (query.agentId) conditions.push({ agentId: query.agentId });
  if (query.status?.length) conditions.push({ status: { in: query.status } });
  // Whole days in UTC: toDate includes everything up to the end of that day.
  if (query.fromDate || query.toDate) {
    conditions.push({
      createdAt: {
        gte: query.fromDate ? new Date(`${query.fromDate}T00:00:00.000Z`) : undefined,
        lt: query.toDate ? new Date(Date.parse(`${query.toDate}T00:00:00.000Z`) + DAY) : undefined,
      },
    });
  }
  if (query.search) {
    // "SUB-000042", "sub42" or "42" also find the submission by its reference number.
    const reference = /^(?:SUB-?)?0*(\d{1,9})$/i.exec(query.search);
    conditions.push({
      OR: [
        { customerName: { contains: query.search, mode: 'insensitive' } },
        { location: { contains: query.search, mode: 'insensitive' } },
        ...(reference ? [{ referenceNo: Number(reference[1]) }] : []),
      ],
    });
  }

  return { AND: conditions } satisfies Prisma.SubmissionWhereInput;
}

export async function listSubmissions(scope: SubmissionScope, query: ListSubmissionsQuery) {
  const where = listWhere(scope, query);
  const [items, total] = await prisma.$transaction([
    prisma.submission.findMany({
      where,
      include: submissionInclude,
      // The id tie-breaker keeps pages stable when many rows share the sort value.
      orderBy: [{ [query.sortBy]: query.sortOrder }, { id: 'asc' }],
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
    prisma.submission.count({ where }),
  ]);
  return { items, total };
}

/** Returns null when the submission doesn't exist or is outside the scope (the caller sends 404). */
export function findSubmission(id: string, scope: SubmissionScope) {
  return prisma.submission.findFirst({
    where: { id, ...scopeWhere(scope) },
    include: submissionInclude,
  });
}

export function createSubmission(data: Prisma.SubmissionUncheckedCreateInput) {
  return prisma.submission.create({ data, include: submissionInclude });
}

type HistoryRow = {
  fromStatus: SubmissionStatus;
  toStatus: SubmissionStatus;
  changedById: string;
  note?: string | null;
};

/**
 * Updates a submission and, when the status changes, adds its history row in the same transaction.
 * The row is updated only if it still matches `expected` (e.g. the status the service checked), so
 * if two people act at the same moment only the first succeeds; the second gets null (409).
 */
export function updateSubmission(
  id: string,
  expected: Prisma.SubmissionWhereInput,
  data: Prisma.SubmissionUncheckedUpdateManyInput,
  history?: HistoryRow,
) {
  return prisma.$transaction(async (tx) => {
    const { count } = await tx.submission.updateMany({ where: { ...expected, id }, data });
    if (count === 0) return null;
    if (history)
      await tx.submissionStatusHistory.create({ data: { ...history, submissionId: id } });
    return tx.submission.findUniqueOrThrow({ where: { id }, include: submissionInclude });
  });
}

export function listStatusHistory(submissionId: string) {
  return prisma.submissionStatusHistory.findMany({
    where: { submissionId },
    include: { changedBy: { select: { id: true, fullName: true, role: true } } },
    orderBy: { changedAt: 'asc' },
  });
}
