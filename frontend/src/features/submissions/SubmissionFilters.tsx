import { Search, X } from 'lucide-react';
import { useState } from 'react';
import { STATUS_LABELS, SUBMISSION_STATUSES } from 'shared';
import { SORT_OPTIONS, type FilterValues } from './listFilters';

type Props = {
  values: FilterValues;
  onChange: (changes: Partial<FilterValues>) => void;
  onClear: () => void;
};

export function SubmissionFilters({ values, onChange, onClear }: Props) {
  // Search is applied on Enter / the button, not on every key press.
  const [search, setSearch] = useState(values.search);
  const hasFilters = Boolean(values.search || values.status || values.fromDate || values.toDate);

  return (
    <div className="card bg-base-200">
      <div className="card-body gap-3 p-4">
        <form
          role="search"
          className="flex gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            onChange({ search: search.trim() });
          }}
        >
          <label className="input w-full">
            <Search className="size-4 opacity-60" aria-hidden="true" />
            <input
              type="search"
              value={search}
              maxLength={100}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search customer, location or SUB-number"
              aria-label="Search submissions"
              className="grow"
            />
          </label>
          <button type="submit" className="btn btn-primary">
            Search
          </button>
        </form>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-base-content/70">Status</span>
            <select
              className="select select-sm w-full"
              value={values.status}
              onChange={(event) => onChange({ status: event.target.value })}
            >
              <option value="">All statuses</option>
              {SUBMISSION_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {STATUS_LABELS[status]}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-base-content/70">From</span>
            <input
              type="date"
              className="input input-sm w-full"
              value={values.fromDate}
              max={values.toDate || undefined}
              onChange={(event) => onChange({ fromDate: event.target.value })}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-base-content/70">To</span>
            <input
              type="date"
              className="input input-sm w-full"
              value={values.toDate}
              min={values.fromDate || undefined}
              onChange={(event) => onChange({ toDate: event.target.value })}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-base-content/70">Sort by</span>
            <select
              className="select select-sm w-full"
              value={values.sort}
              onChange={(event) => onChange({ sort: event.target.value })}
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {hasFilters && (
          <div>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => {
                setSearch('');
                onClear();
              }}
            >
              <X className="size-4" aria-hidden="true" />
              Clear filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
