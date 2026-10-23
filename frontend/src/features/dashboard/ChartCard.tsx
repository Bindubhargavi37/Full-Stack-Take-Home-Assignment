import { BarChart3, Table2 } from 'lucide-react';
import { useId, useState, type ReactNode } from 'react';

export type ChartTable = {
  columns: readonly string[];
  rows: readonly (readonly (string | number)[])[];
};

type Props = {
  title: string;
  description?: string;
  /** The same numbers as the chart, for screen readers and anyone who prefers a table. */
  table: ChartTable;
  /** Shown instead of the chart when there is nothing to draw. */
  empty?: boolean;
  /** Extra height for charts with many rows (e.g. one bar per agent). */
  tall?: boolean;
  children: ReactNode;
};

/** A dashboard card holding one chart, with a Chart / Table switch. */
export function ChartCard({
  title,
  description,
  table,
  empty = false,
  tall = false,
  children,
}: Props) {
  const [showTable, setShowTable] = useState(false);
  const headingId = useId();

  return (
    <section className="card bg-base-200" aria-labelledby={headingId}>
      <div className="card-body gap-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 id={headingId} className="font-semibold">
              {title}
            </h2>
            {description && <p className="text-base-content/70 text-sm">{description}</p>}
          </div>
          {!empty && (
            <button
              type="button"
              className="btn btn-ghost btn-xs"
              onClick={() => setShowTable((value) => !value)}
              aria-pressed={showTable}
            >
              {showTable ? (
                <BarChart3 className="size-4" aria-hidden="true" />
              ) : (
                <Table2 className="size-4" aria-hidden="true" />
              )}
              {showTable ? 'Chart' : 'Table'}
            </button>
          )}
        </div>

        {empty ? (
          <p className="text-base-content/60 flex h-64 items-center justify-center text-sm">
            No data for these filters.
          </p>
        ) : showTable ? (
          <div className="max-h-72 overflow-auto">
            <table className="table-sm table">
              <thead>
                <tr>
                  {table.columns.map((column, index) => (
                    <th key={column} className={index > 0 ? 'text-right' : ''}>
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {table.rows.map((row) => (
                  <tr key={String(row[0])}>
                    {row.map((cell, index) => (
                      <td key={index} className={index > 0 ? 'text-right tabular-nums' : ''}>
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          // Fixed height that includes the axis labels, so the card never gets an inner scroll.
          <div className={tall ? 'h-80' : 'h-64'}>{children}</div>
        )}
      </div>
    </section>
  );
}
