import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { SAMPLE_CONDITION_LABELS, type DashboardSummary } from 'shared';
import { formatCountCompact } from '@/lib/format';
import { ChartCard } from '../ChartCard';
import { ChartTooltip } from '../ChartTooltip';
import { axisProps, BAR_RADIUS_TOP, cursorProps, gridProps, MAX_BAR_SIZE } from '../chartStyles';
import { useChartTheme } from '../useChartTheme';

/** V5: sample condition. One series, so one colour for every bar. */
export function ConditionChart({ summary }: { summary: DashboardSummary }) {
  const theme = useChartTheme();
  const rows = summary.byCondition.map((row) => ({
    label: SAMPLE_CONDITION_LABELS[row.condition],
    count: row.count,
  }));

  return (
    <ChartCard
      title="Sample condition"
      table={{ columns: ['Condition', 'Submissions'], rows: rows.map((r) => [r.label, r.count]) }}
      empty={rows.every((row) => row.count === 0)}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
          <CartesianGrid vertical={false} {...gridProps(theme)} />
          <XAxis dataKey="label" {...axisProps(theme)} />
          <YAxis allowDecimals={false} tickFormatter={formatCountCompact} {...axisProps(theme)} />
          <Tooltip content={<ChartTooltip />} cursor={cursorProps(theme)} />
          <Bar
            dataKey="count"
            name="Submissions"
            fill={theme.series[0]}
            maxBarSize={MAX_BAR_SIZE}
            radius={BAR_RADIUS_TOP}
          />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
