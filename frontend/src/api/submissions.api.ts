import type {
  ChangeStatusValues,
  Paginated,
  RecordPaymentValues,
  StatusHistoryEntry,
  Submission,
  SubmissionFormValues,
} from 'shared';
import { api } from '@/lib/apiClient';

/** Filters as they appear in the page URL; empty values are left out of the request. */
export type SubmissionListParams = Record<string, string | undefined>;

export function listSubmissions(params: SubmissionListParams): Promise<Paginated<Submission>> {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) if (value) query.set(key, value);
  const search = query.toString();
  return api(`/submissions${search ? `?${search}` : ''}`);
}

export async function getSubmission(id: string): Promise<Submission> {
  const { submission } = await api<{ submission: Submission }>(`/submissions/${id}`);
  return submission;
}

export async function getStatusHistory(id: string): Promise<StatusHistoryEntry[]> {
  const { history } = await api<{ history: StatusHistoryEntry[] }>(`/submissions/${id}/history`);
  return history;
}

export async function createSubmission(input: SubmissionFormValues): Promise<Submission> {
  const { submission } = await api<{ submission: Submission }>('/submissions', {
    method: 'POST',
    body: input,
  });
  return submission;
}

export async function resubmitSubmission(
  id: string,
  input: SubmissionFormValues,
): Promise<Submission> {
  const { submission } = await api<{ submission: Submission }>(`/submissions/${id}`, {
    method: 'PATCH',
    body: input,
  });
  return submission;
}

export async function recordPayment(id: string, input: RecordPaymentValues): Promise<Submission> {
  const { submission } = await api<{ submission: Submission }>(`/submissions/${id}/payments`, {
    method: 'POST',
    body: input,
  });
  return submission;
}

export async function changeStatus(id: string, input: ChangeStatusValues): Promise<Submission> {
  const { submission } = await api<{ submission: Submission }>(`/submissions/${id}/status`, {
    method: 'PATCH',
    body: input,
  });
  return submission;
}
