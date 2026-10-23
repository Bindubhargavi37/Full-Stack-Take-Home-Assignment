import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { ChartTooltip } from '../ChartTooltip';
import { useChartTheme } from '../useChartTheme';

type Slice = { label: string; color: string; count: number };

/** Part-to-whole at a glance (≤ 5 slices), with the total in the middle and a counted legend. */
export function Donut({ slices, totalLabel }: { slices: readonly Slice[]; totalLabel: string }) {
  const theme = useChartTheme();
  const total = slices.reduce((sum, slice) => sum + slice.count, 0);
  const drawn = slices.filter((slice) => slice.count > 0);

  return (
    <div className="flex h-full items-center gap-4">
      <div className="relative h-full min-w-0 flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={drawn}
              dataKey="count"
              nameKey="label"
              innerRadius="62%"
              outerRadius="92%"
              // A surface-coloured gap between slices instead of a border.
              stroke={theme.surface}
              strokeWidth={2}
            >
              {drawn.map((slice) => (
                <Cell key={slice.label} fill={slice.color} />
              ))}
            </Pie>
            <Tooltip content={<ChartTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-semibold">{total.toLocaleString('en-IN')}</span>
          <span className="text-base-content/70 text-xs">{totalLabel}</span>
        </div>
      </div>
      <ul className="w-40 shrink-0 space-y-1.5 text-sm sm:w-48">
        {slices.map((slice) => (
          <li key={slice.label} className="flex items-center gap-2">
            <span
              className="size-2.5 shrink-0 rounded-sm"
              style={{ backgroundColor: slice.color }}
              aria-hidden="true"
            />
            <span className="text-base-content/80 grow">{slice.label}</span>
            <span className="font-semibold tabular-nums">
              {slice.count.toLocaleString('en-IN')}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
