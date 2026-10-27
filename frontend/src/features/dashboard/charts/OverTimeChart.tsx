import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { DashboardSummary } from 'shared';
import { formatCalendarDate, formatCountCompact, formatDayShort, formatMonth } from '@/lib/format';
import { ChartCard } from '../ChartCard';
import { ChartTooltip } from '../ChartTooltip';
import { axisProps, gridProps } from '../chartStyles';
import { useChartTheme } from '../useChartTheme';

/** V2: submissions per day (short ranges) or per month (long ranges). One series, no legend. */
export function OverTimeChart({ summary }: { summary: DashboardSummary }) {
  const theme = useChartTheme();
  const { granularity, points } = summary.overTime;
  // Axis ticks are short (dd/mm); the tooltip and table show the full date (dd/mm/yyyy).
  const formatTick = granularity === 'month' ? formatMonth : formatDayShort;
  const formatPeriod = granularity === 'month' ? formatMonth : formatCalendarDate;
  const color = theme.series[0];

  return (
    <ChartCard
      title="Submissions over time"
      description={granularity === 'month' ? 'Per month' : 'Per day'}
      table={{
        columns: [granularity === 'month' ? 'Month' : 'Day', 'Submissions'],
        rows: points.map((point) => [formatPeriod(point.period), point.count]),
      }}
      empty={points.length === 0}
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={points} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
          <CartesianGrid vertical={false} {...gridProps(theme)} />
          <XAxis
            dataKey="period"
            tickFormatter={formatTick}
            minTickGap={24}
            {...axisProps(theme)}
          />
          <YAxis allowDecimals={false} tickFormatter={formatCountCompact} {...axisProps(theme)} />
          <Tooltip
            content={<ChartTooltip formatLabel={formatPeriod} />}
            cursor={{ stroke: theme.text, strokeOpacity: 0.3 }}
          />
          <Area
            type="monotone"
            dataKey="count"
            name="Submissions"
            stroke={color}
            strokeWidth={2}
            fill={color}
            fillOpacity={0.1}
            dot={false}
            activeDot={{ r: 4, fill: color, stroke: theme.surface, strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
