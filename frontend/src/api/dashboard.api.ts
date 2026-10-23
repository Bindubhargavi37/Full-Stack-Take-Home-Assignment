import type { DashboardSummary } from 'shared';
import { api } from '@/lib/apiClient';

/** Filters as they appear in the page URL; empty values are left out of the request. */
export type DashboardParams = Record<string, string | undefined>;

export function getDashboardSummary(params: DashboardParams): Promise<DashboardSummary> {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) if (value) query.set(key, value);
  const search = query.toString();
  return api(`/dashboard/summary${search ? `?${search}` : ''}`);
}
