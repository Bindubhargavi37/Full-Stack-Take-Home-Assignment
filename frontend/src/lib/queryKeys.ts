import type { SubmissionListParams } from '@/api/submissions.api';

// Every TanStack Query cache key in one place, so they never get mistyped.
export const queryKeys = {
  currentUser: ['auth', 'me'] as const,
  /** Prefix of every submission query: invalidate it after any change to a submission. */
  submissions: ['submissions'] as const,
  submissionList: (params: SubmissionListParams) => ['submissions', 'list', params] as const,
  submission: (id: string) => ['submissions', 'detail', id] as const,
  submissionHistory: (id: string) => ['submissions', 'history', id] as const,
};
