import type { ReactNode } from 'react';
import { Link } from 'react-router';

type Props = {
  label: string;
  value: string;
  /** A second line, e.g. "₹2.1L collected". */
  detail?: ReactNode;
  /** A colour dot beside the label (status cards), so colour is never the only cue. */
  color?: string;
  /** Opens the matching submissions list. */
  to?: string;
};

/** One KPI tile: label, big value, optional detail line. */
export function StatCard({ label, value, detail, color, to }: Props) {
  const body = (
    <div className="card-body justify-start gap-1 p-4">
      <p className="text-base-content/70 flex items-center gap-2 text-sm">
        {color && (
          <span
            className="size-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: color }}
            aria-hidden="true"
          />
        )}
        {label}
      </p>
      <p className="text-xl font-semibold sm:text-2xl">{value}</p>
      {detail && <p className="text-base-content/70 text-sm">{detail}</p>}
    </div>
  );

  return to ? (
    <Link
      to={to}
      className="card bg-base-200 hover:bg-base-300 focus-visible:outline-primary transition-colors"
    >
      {body}
    </Link>
  ) : (
    <div className="card bg-base-200">{body}</div>
  );
}
