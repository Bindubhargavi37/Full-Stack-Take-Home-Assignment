import { Prisma } from '@prisma/client';
import { AMOUNT_RANGES, TOP_LOCATIONS_LIMIT, type DashboardQuery } from 'shared';
import { prisma } from '../config/db';

// Dashboard metrics, computed in PostgreSQL with GROUP BY: only the totals leave the database.
// Every query shares the same FROM/WHERE, so all charts describe exactly the same submissions.
// Counts are cast to int and money to float8 so they arrive as plain JavaScript numbers.

/** Whose submissions: one agent's, or every agent of one admin. */
export type DashboardScope = { agentId: string } | { adminId: string };

const DAY = 86_400_000;
const FROM = Prisma.sql`FROM submissions s JOIN users u ON u.id = s.agent_id`;

function whereClause(scope: DashboardScope, query: DashboardQuery, extra: Prisma.Sql[] = []) {
  const conditions: Prisma.Sql[] = [
    'agentId' in scope
      ? Prisma.sql`s.agent_id = ${scope.agentId}::uuid`
      : Prisma.sql`u.admin_id = ${scope.adminId}::uuid`,
  ];
  if (query.status?.length) {
    conditions.push(Prisma.sql`s.status::text IN (${Prisma.join(query.status)})`);
  }
  // Whole days in UTC, the same rule as the submissions list.
  if (query.fromDate) {
    conditions.push(Prisma.sql`s.created_at >= ${new Date(`${query.fromDate}T00:00:00.000Z`)}`);
  }
  if (query.toDate) {
    const end = new Date(Date.parse(`${query.toDate}T00:00:00.000Z`) + DAY);
    conditions.push(Prisma.sql`s.created_at < ${end}`);
  }
  return Prisma.sql`WHERE ${Prisma.join([...conditions, ...extra], ' AND ')}`;
}

const notRejected = Prisma.sql`s.status <> 'REJECTED'`;

export function countByStatus(scope: DashboardScope, query: DashboardQuery) {
  return prisma.$queryRaw<{ status: string; count: number }[]>`
    SELECT s.status::text AS status, count(*)::int AS count
    ${FROM} ${whereClause(scope, query)}
    GROUP BY s.status`;
}

export async function moneyTotals(scope: DashboardScope, query: DashboardQuery) {
  const [row] = await prisma.$queryRaw<{ billed: number; collected: number; due: number }[]>`
    SELECT coalesce(sum(s.total_amount), 0)::float8 AS billed,
           coalesce(sum(s.amount_paid), 0)::float8 AS collected,
           coalesce(sum(s.amount_due), 0)::float8 AS due
    ${FROM} ${whereClause(scope, query, [notRejected])}`;
  return row ?? { billed: 0, collected: 0, due: 0 };
}

/** Submissions per UTC day (YYYY-MM-DD). The service fills empty days and may group by month. */
export function countByDay(scope: DashboardScope, query: DashboardQuery) {
  return prisma.$queryRaw<{ day: string; count: number }[]>`
    SELECT to_char(s.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS day, count(*)::int AS count
    ${FROM} ${whereClause(scope, query)}
    GROUP BY 1 ORDER BY 1`;
}

export function billingByMonth(scope: DashboardScope, query: DashboardQuery) {
  return prisma.$queryRaw<{ month: string; billed: number; collected: number; pending: number }[]>`
    SELECT to_char(s.created_at AT TIME ZONE 'UTC', 'YYYY-MM') AS month,
           coalesce(sum(s.total_amount), 0)::float8 AS billed,
           coalesce(sum(s.amount_paid), 0)::float8 AS collected,
           coalesce(sum(s.amount_due), 0)::float8 AS pending
    ${FROM} ${whereClause(scope, query, [notRejected])}
    GROUP BY 1 ORDER BY 1`;
}

/** Counts per (condition, result) pair; V4, V5 and V6 are all derived from these rows. */
export function countByConditionAndResult(scope: DashboardScope, query: DashboardQuery) {
  return prisma.$queryRaw<{ condition: string | null; result: string | null; count: number }[]>`
    SELECT s.sample_condition::text AS condition, s.result::text AS result, count(*)::int AS count
    ${FROM} ${whereClause(scope, query)}
    GROUP BY 1, 2`;
}

export function topLocations(scope: DashboardScope, query: DashboardQuery) {
  // "Pune", " pune " and "PUNE" are one place, shown with its most common spelling.
  return prisma.$queryRaw<{ location: string; count: number }[]>`
    SELECT mode() WITHIN GROUP (ORDER BY btrim(s.location)) AS location, count(*)::int AS count
    ${FROM} ${whereClause(scope, query, [Prisma.sql`s.location IS NOT NULL`])}
    GROUP BY lower(btrim(s.location))
    ORDER BY count DESC, lower(btrim(s.location))
    LIMIT ${TOP_LOCATIONS_LIMIT}`;
}

/** How many submissions fall in each AMOUNT_RANGES bucket (by total amount). */
export function countByAmountRange(scope: DashboardScope, query: DashboardQuery) {
  // CASE checks the ranges in order, so "below the next limit" is enough. The bucket numbers are
  // our own constants, so they're written into the SQL rather than sent as parameters.
  const bucket = Prisma.join(
    AMOUNT_RANGES.map((range, index) =>
      range.max === null
        ? Prisma.sql`WHEN s.total_amount >= ${range.min} THEN ${Prisma.raw(String(index))}`
        : Prisma.sql`WHEN s.total_amount < ${range.max} THEN ${Prisma.raw(String(index))}`,
    ),
    ' ',
  );
  return prisma.$queryRaw<{ bucket: number; count: number }[]>`
    SELECT (CASE ${bucket} END)::int AS bucket, count(*)::int AS count
    ${FROM} ${whereClause(scope, query, [Prisma.sql`s.total_amount IS NOT NULL`])}
    GROUP BY 1`;
}

export function countByAgentAndStatus(adminId: string, query: DashboardQuery) {
  return prisma.$queryRaw<{ agentId: string; agentName: string; status: string; count: number }[]>`
    SELECT u.id::text AS "agentId", u.full_name AS "agentName", s.status::text AS status,
           count(*)::int AS count
    ${FROM} ${whereClause({ adminId }, query)}
    GROUP BY u.id, u.full_name, s.status
    ORDER BY u.full_name`;
}
