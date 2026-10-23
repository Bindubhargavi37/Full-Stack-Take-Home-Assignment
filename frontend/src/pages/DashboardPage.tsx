import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { RefreshCw } from 'lucide-react';
import { useSearchParams } from 'react-router';
import { STATUS_LABELS, type SubmissionStatus } from 'shared';
import { listAgentOptions } from '@/api/agents.api';
import { getDashboardSummary } from '@/api/dashboard.api';
import { BillingChart } from '@/features/dashboard/charts/BillingChart';
import { BreakdownChart } from '@/features/dashboard/charts/BreakdownChart';
import { ConditionChart } from '@/features/dashboard/charts/ConditionChart';
import { ConditionVsResultChart } from '@/features/dashboard/charts/ConditionVsResultChart';
import { LocationsChart } from '@/features/dashboard/charts/LocationsChart';
import { OverTimeChart } from '@/features/dashboard/charts/OverTimeChart';
import { ResultsChart } from '@/features/dashboard/charts/ResultsChart';
import { StatusChart } from '@/features/dashboard/charts/StatusChart';
import {
  DashboardFilters,
  type DashboardFilterValues,
} from '@/features/dashboard/DashboardFilters';
import { dateRangeFor, isDatePreset } from '@/features/dashboard/datePresets';
import { StatCard } from '@/features/dashboard/StatCard';
import { useChartTheme } from '@/features/dashboard/useChartTheme';
import { useAuth } from '@/hooks/useAuth';
import { formatRupeesWhole, formatTime } from '@/lib/format';
import { queryKeys } from '@/lib/queryKeys';

/** The dashboard refreshes itself this often (paused while the browser tab is hidden). */
const REFRESH_MS = 30_000;

// Filter names in the page URL.
const URL_KEYS: Record<keyof DashboardFilterValues, string> = {
  range: 'range',
  fromDate: 'from',
  toDate: 'to',
  status: 'status',
  agentId: 'agentId',
};

/**
 * One page for both roles. Agents see their own numbers; admins see all their agents combined
 * or one agent. Every number is computed on the server for that scope.
 */
export function DashboardPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const theme = useChartTheme();
  const [searchParams, setSearchParams] = useSearchParams();

  const rangeParam = searchParams.get(URL_KEYS.range);
  const filters: DashboardFilterValues = {
    range: isDatePreset(rangeParam) ? rangeParam : 'all',
    fromDate: searchParams.get(URL_KEYS.fromDate) ?? '',
    toDate: searchParams.get(URL_KEYS.toDate) ?? '',
    status: searchParams.get(URL_KEYS.status) ?? '',
    agentId: isAdmin ? (searchParams.get(URL_KEYS.agentId) ?? '') : '',
  };
  const params = {
    ...dateRangeFor(filters.range, filters),
    status: filters.status,
    agentId: filters.agentId,
  };

  const agentOptions = useQuery({
    queryKey: queryKeys.agentOptions,
    queryFn: listAgentOptions,
    enabled: isAdmin,
  });
  const { data, isPending, isError, error, isFetching, dataUpdatedAt, refetch } = useQuery({
    queryKey: queryKeys.dashboard(params),
    queryFn: () => getDashboardSummary(params),
    // Keep the current numbers on screen while new ones load (no flashing).
    placeholderData: keepPreviousData,
    refetchInterval: REFRESH_MS,
  });

  function updateFilters(changes: Partial<DashboardFilterValues>) {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      for (const [name, value] of Object.entries(changes)) {
        const key = URL_KEYS[name as keyof DashboardFilterValues];
        if (value && !(name === 'range' && value === 'all')) next.set(key, value);
        else next.delete(key);
      }
      return next;
    });
  }

  /** Opens the submissions list with the same filters (and a status, for status cards). */
  function listLink(status?: SubmissionStatus) {
    const query = new URLSearchParams();
    if (status ?? filters.status) query.set('status', status ?? filters.status);
    if (filters.agentId) query.set('agentId', filters.agentId);
    if (params.fromDate) query.set('fromDate', params.fromDate);
    if (params.toDate) query.set('toDate', params.toDate);
    const search = query.toString();
    return `/submissions${search ? `?${search}` : ''}`;
  }

  const scopeText = !data
    ? ''
    : data.scope.kind === 'all-agents'
      ? 'All your agents combined'
      : isAdmin
        ? `${data.scope.agentName}'s submissions`
        : 'Your submissions and billing';

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-base-content/70 text-sm">{scopeText}</p>
        </div>
        <div className="flex items-center gap-3">
          <p className="text-base-content/70 text-sm" aria-live="polite">
            {dataUpdatedAt > 0 && <>Updated {formatTime(dataUpdatedAt)}</>}
          </p>
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => void refetch()}
            disabled={isFetching}
          >
            <RefreshCw
              className={`size-4 ${isFetching ? 'animate-spin' : ''}`}
              aria-hidden="true"
            />
            Refresh
          </button>
        </div>
      </div>

      <DashboardFilters
        values={filters}
        onChange={updateFilters}
        agents={isAdmin ? (agentOptions.data ?? []) : undefined}
      />

      {isError && data && (
        <div role="alert" className="alert alert-warning alert-soft text-sm">
          Could not refresh ({error.message}). Showing the numbers from {formatTime(dataUpdatedAt)}.
        </div>
      )}

      {isPending ? (
        <div className="flex justify-center py-16">
          <span className="loading loading-spinner loading-lg" aria-label="Loading dashboard" />
        </div>
      ) : !data ? (
        <div role="alert" className="alert alert-error alert-soft">
          <span>{error?.message ?? 'Could not load the dashboard.'}</span>
          <button type="button" className="btn btn-sm" onClick={() => void refetch()}>
            Try again
          </button>
        </div>
      ) : (
        <div className={`space-y-4 transition-opacity ${isFetching ? 'opacity-70' : ''}`}>
          <section aria-label="Key figures" className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            <StatCard
              label="Total submissions"
              value={data.cards.totalSubmissions.toLocaleString('en-IN')}
              to={listLink()}
            />
            {(
              [
                ['Completed', 'COMPLETED', data.cards.completed],
                ['Payment done', 'BILLING_PAYMENT_DONE', data.cards.paymentDone],
                ['Payment pending', 'BILLING_PAYMENT_NOT_DONE', data.cards.paymentPending],
                ['Rejected', 'REJECTED', data.cards.rejected],
                ['Needs info', 'NOT_FILLED_COMPLETELY', data.cards.needsInfo],
              ] as const
            ).map(([label, status, count]) => (
              <StatCard
                key={status}
                label={label}
                value={count.toLocaleString('en-IN')}
                color={theme.status[status]}
                detail={status === 'NOT_FILLED_COMPLETELY' ? 'Sent back to the agent' : undefined}
                to={listLink(status)}
              />
            ))}
            <StatCard
              label="Total billed"
              value={formatRupeesWhole(data.cards.totalBilled)}
              detail={`${formatRupeesWhole(data.cards.totalCollected)} collected`}
            />
            <StatCard
              label="Pending due"
              value={formatRupeesWhole(data.cards.pendingDue)}
              detail={
                data.cards.collectionRate === null
                  ? 'Nothing billed yet'
                  : `${Math.round(data.cards.collectionRate * 100)}% collected`
              }
            />
          </section>

          {data.cards.totalSubmissions === 0 && (
            <p className="text-base-content/70 text-sm">
              No submissions match these filters
              {filters.status ? ` (${STATUS_LABELS[filters.status as SubmissionStatus]})` : ''}.
            </p>
          )}

          <section aria-label="Charts" className="grid gap-4 xl:grid-cols-2">
            <StatusChart summary={data} />
            <OverTimeChart summary={data} />
            <BillingChart summary={data} />
            <ResultsChart summary={data} />
            <ConditionChart summary={data} />
            <ConditionVsResultChart summary={data} />
            <LocationsChart summary={data} />
            <BreakdownChart summary={data} />
          </section>
          <p className="text-base-content/60 text-xs">
            Money totals leave out rejected submissions. Dates are whole days in UTC. The page
            refreshes every {REFRESH_MS / 1000} seconds while it is open.
          </p>
        </div>
      )}
    </div>
  );
}
