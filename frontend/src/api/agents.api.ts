import type {
  Agent,
  AgentOption,
  CreateAgentValues,
  Paginated,
  ResetAgentPasswordInput,
  UpdateAgentValues,
} from 'shared';
import { api, withQuery, type QueryParams } from '@/lib/apiClient';

export function listAgents(params: QueryParams): Promise<Paginated<Agent>> {
  return api(withQuery('/agents', params));
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
