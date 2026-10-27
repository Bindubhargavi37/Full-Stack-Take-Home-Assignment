import type { TooltipContentProps } from 'recharts';

type Props = Partial<TooltipContentProps<number, string>> & {
  /** Formats each value (e.g. as rupees). Defaults to a plain number. */
  formatValue?: (value: number) => string;
  /** Formats the heading (e.g. a date). Defaults to the label as given. */
  formatLabel?: (label: string) => string;
  /** An extra line under the series, from the hovered data row (e.g. "₹500 refunded"). */
  note?: (row: never) => string | undefined;
};

/**
 * Shared tooltip for every chart: a heading, then one row per series with a short colour key.
 * The value is the strong part; the series name is secondary.
 */
export function ChartTooltip({
  active,
  payload,
  label,
  formatValue = (value) => value.toLocaleString('en-IN'),
  formatLabel = (value) => value,
  note,
}: Props) {
  if (!active || !payload?.length) return null;
  const heading = label ?? payload[0]?.name;
  const noteText = note?.(payload[0]?.payload as never);

  return (
    <div className="bg-base-100 border-base-300 rounded-box border px-3 py-2 text-sm shadow-md">
      {heading !== undefined && heading !== '' && (
        <p className="text-base-content/70 mb-1 text-xs">{formatLabel(String(heading))}</p>
      )}
      <ul className="space-y-0.5">
        {payload.map((entry) => (
          <li key={String(entry.dataKey ?? entry.name)} className="flex items-center gap-2">
            <span
              className="h-0.5 w-3 rounded-full"
              style={{ backgroundColor: entry.color ?? entry.payload?.fill }}
              aria-hidden="true"
            />
            <span className="font-semibold">{formatValue(Number(entry.value))}</span>
            {payload.length > 1 && <span className="text-base-content/70">{entry.name}</span>}
          </li>
        ))}
      </ul>
      {noteText && <p className="text-base-content/70 mt-1 text-xs">{noteText}</p>}
    </div>
  );
}
