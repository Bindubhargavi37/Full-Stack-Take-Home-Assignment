import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { TOP_LOCATIONS_LIMIT, type DashboardSummary } from 'shared';
import { formatCountCompact } from '@/lib/format';
import { ChartCard } from '../ChartCard';
import { ChartTooltip } from '../ChartTooltip';
import { axisProps, BAR_RADIUS_END, cursorProps, gridProps } from '../chartStyles';
import { useChartTheme } from '../useChartTheme';

/** V7: the busiest locations, as horizontal bars so long names stay readable. */
export function LocationsChart({ summary }: { summary: DashboardSummary }) {
  const theme = useChartTheme();
  const rows = summary.topLocations;

  return (
    <ChartCard
      title="Top locations"
      description={`The ${TOP_LOCATIONS_LIMIT} busiest, by submissions`}
      table={{ columns: ['Location', 'Submissions'], rows: rows.map((r) => [r.location, r.count]) }}
      empty={rows.length === 0}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} layout="vertical" margin={{ top: 0, right: 16, bottom: 0, left: 0 }}>
          <CartesianGrid horizontal={false} {...gridProps(theme)} />
          <XAxis
            type="number"
            allowDecimals={false}
            tickFormatter={formatCountCompact}
            {...axisProps(theme)}
          />
          <YAxis type="category" dataKey="location" width={96} interval={0} {...axisProps(theme)} />
          <Tooltip content={<ChartTooltip />} cursor={cursorProps(theme)} />
          <Bar
            dataKey="count"
            name="Submissions"
            fill={theme.series[0]}
            maxBarSize={16}
            radius={BAR_RADIUS_END}
          />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
