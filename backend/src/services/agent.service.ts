import type {
  Agent,
  AgentOption,
  CreateAgentValues,
  ListAgentsQuery,
  Paginated,
  UpdateAgentValues,
} from 'shared';
import * as agentRepository from '../repositories/agent.repository';
import type { AgentRecord } from '../repositories/agent.repository';
import { revokeAllRefreshTokens } from '../repositories/refreshToken.repository';
import { AppError } from '../utils/AppError';
import { hashPassword } from '../utils/password';
import { withUniqueEmail } from '../utils/uniqueEmail';

function toAgent(record: AgentRecord): Agent {
  return {
    id: record.id,
    fullName: record.fullName,
    email: record.email,
    phone: record.phone,
    isActive: record.isActive,
    lastLoginAt: record.lastLoginAt?.toISOString() ?? null,
    createdAt: record.createdAt.toISOString(),
    submissionCount: record._count.ownedSubmissions,
  };
}

/** Another admin's agent is a 404, so their ids reveal nothing. */
async function findOwnAgent(adminId: string, id: string) {
  const agent = await agentRepository.findAgent(id, adminId);
  if (!agent) throw new AppError(404, 'NOT_FOUND', 'Agent not found');
  return agent;
}

export async function listAgents(
  adminId: string,
  query: ListAgentsQuery,
): Promise<Paginated<Agent>> {
  const { items, total } = await agentRepository.listAgents(adminId, query);
  return {
    items: items.map(toAgent),
    page: query.page,
    pageSize: query.pageSize,
    total,
    totalPages: Math.ceil(total / query.pageSize),
  };
}

export function listAgentOptions(adminId: string): Promise<AgentOption[]> {
  return agentRepository.listAgentOptions(adminId);
}

export async function getAgent(adminId: string, id: string) {
  return toAgent(await findOwnAgent(adminId, id));
}

export async function createAgent(adminId: string, input: CreateAgentValues) {
  const passwordHash = await hashPassword(input.password);
  const record = await withUniqueEmail(() =>
    agentRepository.createAgent(adminId, {
      fullName: input.fullName,
      email: input.email,
      phone: input.phone,
      passwordHash,
    }),
  );
  return toAgent(record);
}

export async function updateAgent(adminId: string, id: string, input: UpdateAgentValues) {
  await findOwnAgent(adminId, id);
  const record = await withUniqueEmail(() => agentRepository.updateAgent(id, input));
  return toAgent(record);
}

/**
 * Activates or deactivates an agent. Deactivating also ends all their sessions; authenticate
 * already rejects inactive users on every request, this just cleans up their refresh tokens.
 * Their submissions and history are kept.
 */
export async function setAgentActive(adminId: string, id: string, isActive: boolean) {
  await findOwnAgent(adminId, id);
  const record = await agentRepository.updateAgent(id, {
    isActive,
    ...(isActive && { failedLoginAttempts: 0, lockedUntil: null }),
  });
  if (!isActive) await revokeAllRefreshTokens(id);
  return toAgent(record);
}

/** Sets a new password, clears any lockout and signs the agent out everywhere. */
export async function resetAgentPassword(adminId: string, id: string, newPassword: string) {
  await findOwnAgent(adminId, id);
  await agentRepository.updateAgent(id, {
    passwordHash: await hashPassword(newPassword),
    failedLoginAttempts: 0,
    lockedUntil: null,
  });
  await revokeAllRefreshTokens(id);
}
