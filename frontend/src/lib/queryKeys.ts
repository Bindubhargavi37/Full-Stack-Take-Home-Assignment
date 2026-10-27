import type { QueryParams } from '@/lib/apiClient';

// Every TanStack Query cache key in one place, so they never get mistyped.
export const queryKeys = {
  currentUser: ['auth', 'me'] as const,
  /** Prefix of every submission query: invalidate it after any change to a submission. */
  submissions: ['submissions'] as const,
  submissionList: (params: QueryParams) => ['submissions', 'list', params] as const,
  submission: (id: string) => ['submissions', 'detail', id] as const,
  submissionHistory: (id: string) => ['submissions', 'history', id] as const,
  /** Prefix of every agent query: invalidate it after any change to an agent. */
  agents: ['agents'] as const,
  agentList: (params: QueryParams) => ['agents', 'list', params] as const,
  agentOptions: ['agents', 'options'] as const,
  dashboard: (params: QueryParams) => ['dashboard', params] as const,
};
