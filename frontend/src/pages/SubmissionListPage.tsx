import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { FilePlus2, Inbox } from 'lucide-react';
import { Link } from 'react-router';
import { formatReference, formatRupees } from 'shared';
import { listAgentOptions } from '@/api/agents.api';
import { listSubmissions } from '@/api/submissions.api';
import { SORT_OPTIONS, type FilterValues } from '@/features/submissions/listFilters';
import { SubmissionFilters } from '@/features/submissions/SubmissionFilters';
import { StatusBadge } from '@/features/submissions/StatusBadge';
import { Pagination } from '@/components/ui/Pagination';
import { useAuth } from '@/hooks/useAuth';
import { useUrlParams } from '@/hooks/useUrlParams';
import { formatDate } from '@/lib/format';
import { queryKeys } from '@/lib/queryKeys';

const PAGE_SIZE = '10';

/** Agents see their own submissions; admins see every submission from their agents. */
export function SubmissionListPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const { searchParams, setSearchParams, updateParams } = useUrlParams();

  const filters: FilterValues = {
    search: searchParams.get('search') ?? '',
    status: searchParams.get('status') ?? '',
    agentId: searchParams.get('agentId') ?? '',
    fromDate: searchParams.get('fromDate') ?? '',
    toDate: searchParams.get('toDate') ?? '',
    sort: searchParams.get('sort') ?? 'newest',
  };
  const page = Math.max(1, Number(searchParams.get('page')) || 1);
  const sort = SORT_OPTIONS.find((option) => option.value === filters.sort) ?? SORT_OPTIONS[0];

  const params = {
    page: String(page),
    pageSize: PAGE_SIZE,
    search: filters.search,
    status: filters.status,
    agentId: isAdmin ? filters.agentId : '',
    fromDate: filters.fromDate,
    toDate: filters.toDate,
    sortBy: sort.sortBy,
    sortOrder: sort.sortOrder,
  };
  // The admin's agent filter needs the list of their agents.
  const agentOptions = useQuery({
    queryKey: queryKeys.agentOptions,
    queryFn: listAgentOptions,
    enabled: isAdmin,
  });
  const { data, isPending, isError, error, isFetching, refetch } = useQuery({
    queryKey: queryKeys.submissionList(params),
    queryFn: () => listSubmissions(params),
    // Keep showing the current page while the next one loads.
    placeholderData: keepPreviousData,
  });

  const hasFilters = Boolean(
    filters.search || filters.status || filters.agentId || filters.fromDate || filters.toDate,
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">{isAdmin ? 'Submissions' : 'My submissions'}</h1>
          <p className="text-base-content/70 text-sm">
            {isAdmin
              ? 'Every submission from your agents. Open one to review it.'
              : 'Everything you have submitted and where each one stands.'}
          </p>
        </div>
        {!isAdmin && (
          <Link to="/submissions/new" className="btn btn-primary">
            <FilePlus2 className="size-4" aria-hidden="true" />
            New submission
          </Link>
        )}
      </div>

      <SubmissionFilters
        // A new key resets the search box when the filters are cleared from outside it.
        key={filters.search}
        values={filters}
        agents={isAdmin ? (agentOptions.data ?? []) : undefined}
        // Any filter change starts again from page 1.
        onChange={(changes) => updateParams({ ...changes, page: '' })}
        onClear={() => setSearchParams(filters.sort === 'newest' ? {} : { sort: filters.sort })}
      />

      {isPending ? (
        <div className="flex justify-center py-16">
          <span className="loading loading-spinner loading-lg" aria-label="Loading submissions" />
        </div>
      ) : isError ? (
        <div role="alert" className="alert alert-error alert-soft">
          <span>{error.message}</span>
          <button type="button" className="btn btn-sm" onClick={() => void refetch()}>
            Try again
          </button>
        </div>
      ) : data.items.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <Inbox className="text-base-content/40 size-12" aria-hidden="true" />
          <p className="text-base-content/70">
            {hasFilters ? 'No submissions match these filters.' : 'There are no submissions yet.'}
          </p>
          {!hasFilters && !isAdmin && (
            <Link to="/submissions/new" className="btn btn-primary btn-sm">
              Create your first submission
            </Link>
          )}
        </div>
      ) : (
        <>
          <div
            className={`border-base-300 overflow-x-auto rounded-box border transition-opacity ${isFetching ? 'opacity-60' : ''}`}
          >
            <table className="table">
              <thead>
                <tr>
                  <th className="w-12 text-right">S.No.</th>
                  <th>Reference</th>
                  <th>Customer</th>
                  <th className="hidden md:table-cell">Location</th>
                  {isAdmin && <th className="hidden lg:table-cell">Agent</th>}
                  <th className="hidden text-right sm:table-cell">Total</th>
                  <th className="text-right">Due</th>
                  <th>Status</th>
                  <th className="hidden lg:table-cell">Submitted</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((submission, index) => (
                  <tr key={submission.id} className="hover:bg-base-200">
                    {/* Counts on across pages: page 2 starts at pageSize + 1. */}
                    <td className="text-base-content/70 text-right tabular-nums">
                      {(data.page - 1) * data.pageSize + index + 1}
                    </td>
                    <td>
                      <Link
                        to={`/submissions/${submission.id}`}
                        className="link link-primary font-mono font-medium whitespace-nowrap"
                      >
                        {formatReference(submission.referenceNo)}
                      </Link>
                    </td>
                    <td className="max-w-48 truncate">{submission.customerName ?? '—'}</td>
                    <td className="hidden max-w-40 truncate md:table-cell">
                      {submission.location ?? '—'}
                    </td>
                    {isAdmin && (
                      <td className="hidden lg:table-cell">{submission.agent.fullName}</td>
                    )}
                    <td className="hidden text-right whitespace-nowrap sm:table-cell">
                      {submission.totalAmount === null ? '—' : formatRupees(submission.totalAmount)}
                    </td>
                    <td className="text-right whitespace-nowrap">
                      {submission.amountDue === null ? '—' : formatRupees(submission.amountDue)}
                    </td>
                    <td>
                      <StatusBadge status={submission.status} className="badge-sm" />
                    </td>
                    <td className="hidden whitespace-nowrap lg:table-cell">
                      {formatDate(submission.submittedAt ?? submission.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Pagination
            page={data.page}
            totalPages={data.totalPages}
            total={data.total}
            noun="submission"
            onPageChange={(next) => updateParams({ page: String(next) })}
          />
        </>
      )}
    </div>
  );
}
