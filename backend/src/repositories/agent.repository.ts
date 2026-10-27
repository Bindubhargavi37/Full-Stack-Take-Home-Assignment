import type { Prisma } from '@prisma/client';
import type { ListAgentsQuery } from 'shared';
import { prisma } from '../config/db';

// Agents are users with role AGENT. Every query is limited to the agents of one admin.

const agentSelect = {
  id: true,
  fullName: true,
  email: true,
  phone: true,
  isActive: true,
  lastLoginAt: true,
  createdAt: true,
  _count: { select: { ownedSubmissions: true } },
} satisfies Prisma.UserSelect;

export type AgentRecord = Prisma.UserGetPayload<{ select: typeof agentSelect }>;

const ownAgents = (adminId: string) => ({ role: 'AGENT', adminId }) satisfies Prisma.UserWhereInput;

export async function listAgents(adminId: string, query: ListAgentsQuery) {
  const where: Prisma.UserWhereInput = {
    ...ownAgents(adminId),
    ...(query.status && { isActive: query.status === 'active' }),
    ...(query.search && {
      OR: [
        { fullName: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
      ],
    }),
  };
  const [items, total] = await prisma.$transaction([
    prisma.user.findMany({
      where,
      select: agentSelect,
      orderBy: [{ fullName: 'asc' }, { id: 'asc' }],
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
    prisma.user.count({ where }),
  ]);
  return { items, total };
}

export function listAgentOptions(adminId: string) {
  return prisma.user.findMany({
    where: ownAgents(adminId),
    select: { id: true, fullName: true, isActive: true },
    orderBy: [{ fullName: 'asc' }, { id: 'asc' }],
  });
}

/** Returns null when the agent doesn't exist or belongs to another admin (the caller sends 404). */
export function findAgent(id: string, adminId: string) {
  return prisma.user.findFirst({ where: { id, ...ownAgents(adminId) }, select: agentSelect });
}

/** Those of the given ids that are this admin's agents (others are silently left out). */
export function findAgentsByIds(ids: string[], adminId: string) {
  return prisma.user.findMany({
    where: { id: { in: ids }, ...ownAgents(adminId) },
    select: { id: true, fullName: true },
    orderBy: { fullName: 'asc' },
  });
}

export function createAgent(
  adminId: string,
  data: { fullName: string; email: string; phone: string | null; passwordHash: string },
) {
  return prisma.user.create({
    data: { ...data, role: 'AGENT', adminId },
    select: agentSelect,
  });
}

/** Call only after findAgent has confirmed the agent belongs to this admin. */
export function updateAgent(id: string, data: Prisma.UserUpdateInput) {
  return prisma.user.update({ where: { id }, data, select: agentSelect });
}
