import type {
  Agent,
  AgentOption,
  CreateAgentValues,
  Paginated,
  ResetAgentPasswordInput,
  UpdateAgentValues,
} from 'shared';
import { api } from '@/lib/apiClient';

/** Filters as they appear in the page URL; empty values are left out of the request. */
export type AgentListParams = Record<string, string | undefined>;

export function listAgents(params: AgentListParams): Promise<Paginated<Agent>> {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) if (value) query.set(key, value);
  const search = query.toString();
  return api(`/agents${search ? `?${search}` : ''}`);
}

export async function listAgentOptions(): Promise<AgentOption[]> {
  const { agents } = await api<{ agents: AgentOption[] }>('/agents/options');
  return agents;
}

export async function createAgent(input: CreateAgentValues): Promise<Agent> {
  const { agent } = await api<{ agent: Agent }>('/agents', { method: 'POST', body: input });
  return agent;
}

export async function updateAgent(id: string, input: UpdateAgentValues): Promise<Agent> {
  const { agent } = await api<{ agent: Agent }>(`/agents/${id}`, { method: 'PATCH', body: input });
  return agent;
}

export async function setAgentActive(id: string, isActive: boolean): Promise<Agent> {
  const { agent } = await api<{ agent: Agent }>(`/agents/${id}/status`, {
    method: 'PATCH',
    body: { isActive },
  });
  return agent;
}

export function resetAgentPassword(
  id: string,
  input: ResetAgentPasswordInput,
): Promise<{ message: string }> {
  return api(`/agents/${id}/reset-password`, { method: 'POST', body: input });
}
