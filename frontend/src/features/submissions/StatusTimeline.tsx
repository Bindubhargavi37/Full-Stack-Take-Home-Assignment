import { ROLE_LABELS, STATUS_LABELS, type StatusHistoryEntry } from 'shared';
import { formatDateTime } from '@/lib/format';
import { StatusBadge } from './StatusBadge';

/** Every status change, oldest first, with who made it and their note. */
export function StatusTimeline({ entries }: { entries: readonly StatusHistoryEntry[] }) {
  if (entries.length === 0) {
    return <p className="text-base-content/70 text-sm">No status changes yet.</p>;
  }

  return (
    <ol className="border-base-300 relative ml-2 space-y-5 border-l pl-5">
      {entries.map((entry) => (
        <li key={entry.id} className="relative">
          <span
            className="bg-primary ring-base-200 absolute top-1.5 -left-[1.6rem] size-3 rounded-full ring-4"
            aria-hidden="true"
          />
          <StatusBadge status={entry.toStatus} className="badge-sm" />
          <p className="mt-1 text-sm">
            {entry.fromStatus ? `Changed from ${STATUS_LABELS[entry.fromStatus]}` : 'Submitted'} by{' '}
            <span className="font-medium">{entry.changedBy.fullName}</span>{' '}
            <span className="text-base-content/60">({ROLE_LABELS[entry.changedBy.role]})</span>
          </p>
          <p className="text-base-content/60 text-xs">
            <time dateTime={entry.changedAt}>{formatDateTime(entry.changedAt)}</time>
          </p>
          {entry.note && (
            <blockquote className="bg-base-100 mt-2 rounded-box p-2 text-sm break-words">
              {entry.note}
            </blockquote>
          )}
        </li>
      ))}
    </ol>
  );
}
