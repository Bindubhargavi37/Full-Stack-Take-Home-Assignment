import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { RefreshCw } from 'lucide-react';
import { STATUS_LABELS, type DashboardCards, type SubmissionStatus } from 'shared';
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
import { RefundBadge } from '@/features/submissions/RefundBadge';
import { useAuth } from '@/hooks/useAuth';
import { useUrlParams } from '@/hooks/useUrlParams';
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
  agentIds: 'agentIds',
};

/** Pending due's second line: how many submissions owe money, and in which status. */
function UnpaidSplit({ cards }: { cards: DashboardCards }) {
  const { unpaidCount, unpaidNeedsInfo } = cards;
  if (unpaidCount === 0) return 'Nothing left to collect';
  const paymentPending = unpaidCount - unpaidNeedsInfo;
  const count = (value: number) => value.toLocaleString('en-IN');
  const split =
    unpaidNeedsInfo === 0
      ? 'All payment pending'
      : paymentPending === 0
        ? 'All needs info'
        : `${count(paymentPending)} payment pending · ${count(unpaidNeedsInfo)} needs info`;
  return (
    <>
      From {count(unpaidCount)} unpaid {unpaidCount === 1 ? 'submission' : 'submissions'}
      <span className="block">{split}</span>
    </>
  );
}

/**
 * One page for both roles. Agents see their own numbers; admins see all their agents combined,
 * or any agents they choose. Every number is computed on the server for that scope.
 */
export function DashboardPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const theme = useChartTheme();
  const { searchParams, updateParams } = useUrlParams();

  const rangeParam = searchParams.get(URL_KEYS.range);
  const filters: DashboardFilterValues = {
    range: isDatePreset(rangeParam) ? rangeParam : 'all',
    fromDate: searchParams.get(URL_KEYS.fromDate) ?? '',
    toDate: searchParams.get(URL_KEYS.toDate) ?? '',
    status: searchParams.get(URL_KEYS.status) ?? '',
    agentIds: isAdmin ? (searchParams.get(URL_KEYS.agentIds) ?? '') : '',
  };
  const params = {
    ...dateRangeFor(filters.range, filters),
    status: filters.status,
    agentIds: filters.agentIds,
  };
  const chosenAgents = filters.agentIds ? filters.agentIds.split(',') : [];

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
    updateParams(
      Object.fromEntries(
        Object.entries(changes).map(([name, value]) => [
          URL_KEYS[name as keyof DashboardFilterValues],
          // "All time" is the default, so it isn't written to the URL.
          name === 'range' && value === 'all' ? '' : value,
        ]),
      ),
    );
  }

  /**
   * Opens the submissions list with the same filters (and a status, for status cards). The list
   * filters by one agent at most, so with several agents chosen the cards aren't links.
   */
  function listLink(status?: SubmissionStatus) {
    if (chosenAgents.length > 1) return undefined;
    const query = new URLSearchParams();
    if (status ?? filters.status) query.set('status', status ?? filters.status);
    if (chosenAgents[0]) query.set('agentId', chosenAgents[0]);
    if (params.fromDate) query.set('fromDate', params.fromDate);
    if (params.toDate) query.set('toDate', params.toDate);
    const search = query.toString();
    return `/submissions${search ? `?${search}` : ''}`;
  }

  const scopeText = !data
    ? ''
    : data.scope.kind === 'all-agents'
      ? 'All your agents combined'
      : data.scope.kind === 'agents'
        ? `${data.scope.agents.map((agent) => agent.agentName).join(', ')} combined`
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
                detail={
                  status === 'NOT_FILLED_COMPLETELY' ? (
                    'Sent back to the agent'
                  ) : status === 'REJECTED' ? (
                    <span className="flex flex-wrap items-center gap-1">
                      {formatRupeesWhole(data.cards.rejectedBilled)} billed ·{' '}
                      <RefundBadge className="badge-xs" />
                      {formatRupeesWhole(data.cards.refunded)} refunded
                    </span>
                  ) : undefined
                }
                to={listLink(status)}
              />
            ))}
            <StatCard
              label="Total billed"
              value={formatRupeesWhole(data.cards.totalBilled)}
              detail={`${formatRupeesWhole(data.cards.totalCollected)} collected · ${formatRupeesWhole(data.cards.pendingDue)} due · ${formatRupeesWhole(data.cards.rejectedBilled)} rejected`}
            />
            <StatCard
              label="Pending due"
              value={formatRupeesWhole(data.cards.pendingDue)}
              detail={<UnpaidSplit cards={data.cards} />}
            />
          </section>

          {data.cards.totalSubmissions === 0 && (
            <p className="text-base-content/70 text-sm">
              No submissions match these filters
              {filters.status ? ` (${STATUS_LABELS[filters.status as SubmissionStatus]})` : ''}.
            </p>
          )}

          <section aria-label="Charts" className="grid gap-4 md:grid-cols-2">
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
            Total billed includes rejected samples; money paid on them is shown as refunded, not
            collected. Dates are whole days in Indian Standard Time. The page refreshes every{' '}
            {REFRESH_MS / 1000} seconds while it is open.
          </p>
        </div>
      )}
    </div>
  );
}
