import type {
  ChangeStatusValues,
  Paginated,
  RecordPaymentValues,
  StatusHistoryEntry,
  Submission,
  SubmissionFormValues,
} from 'shared';
import { api, withQuery, type QueryParams } from '@/lib/apiClient';

export function listSubmissions(params: QueryParams): Promise<Paginated<Submission>> {
  return api(withQuery('/submissions', params));
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
