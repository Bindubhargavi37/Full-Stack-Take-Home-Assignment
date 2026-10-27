import type { DashboardSummary } from 'shared';
import { api, withQuery, type QueryParams } from '@/lib/apiClient';

export function getDashboardSummary(params: QueryParams): Promise<DashboardSummary> {
  return api(withQuery('/dashboard/summary', params));
}
