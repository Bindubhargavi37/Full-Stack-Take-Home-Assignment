import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { STATUS_LABELS, SUBMISSION_STATUSES, type DashboardSummary } from 'shared';
import { formatCountCompact } from '@/lib/format';
import { ChartCard } from '../ChartCard';
import { ChartLegend } from '../ChartLegend';
import { ChartTooltip } from '../ChartTooltip';
import {
  axisProps,
  BAR_RADIUS_END,
  BAR_RADIUS_TOP,
  cursorProps,
  gridProps,
  MAX_BAR_SIZE,
} from '../chartStyles';
import { useChartTheme } from '../useChartTheme';

/**
 * V8. For one agent: how big their orders are (amount ranges).
 * For the admin's "All agents" view: each agent's submissions by status (stacked).
 */
export function BreakdownChart({ summary }: { summary: DashboardSummary }) {
  const theme = useChartTheme();
  const { breakdown } = summary;

  if (breakdown.kind === 'amountRanges') {
    const rows = breakdown.buckets;
    return (
      <ChartCard
        title="Order sizes"
        description="Submissions by total amount"
        table={{
          columns: ['Total amount', 'Submissions'],
          rows: rows.map((row) => [row.label, row.count]),
        }}
        empty={rows.every((row) => row.count === 0)}
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
            <CartesianGrid vertical={false} {...gridProps(theme)} />
            <XAxis dataKey="label" interval={0} {...axisProps(theme)} />
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

  const rows = breakdown.agents.map((agent) => ({ name: agent.agentName, ...agent.counts }));
  return (
    <ChartCard
      title="Agents by status"
      description="Each agent's submissions"
      tall
      table={{
        columns: ['Agent', ...SUBMISSION_STATUSES.map((status) => STATUS_LABELS[status]), 'Total'],
        rows: breakdown.agents.map((agent) => [
          agent.agentName,
          ...SUBMISSION_STATUSES.map((status) => agent.counts[status]),
          agent.total,
        ]),
      }}
      empty={rows.length === 0}
    >
      <div className="flex h-full flex-col gap-2">
        <ChartLegend
          items={SUBMISSION_STATUSES.map((status) => ({
            label: STATUS_LABELS[status],
            color: theme.status[status],
          }))}
        />
        <div className="min-h-0 flex-1">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={rows}
              layout="vertical"
              margin={{ top: 0, right: 16, bottom: 0, left: 0 }}
            >
              <CartesianGrid horizontal={false} {...gridProps(theme)} />
              <XAxis
                type="number"
                allowDecimals={false}
                tickFormatter={formatCountCompact}
                {...axisProps(theme)}
              />
              <YAxis
                type="category"
                dataKey="name"
                width={96}
                // Every agent gets a label, even when space is tight.
                interval={0}
                {...axisProps(theme)}
              />
              <Tooltip content={<ChartTooltip />} cursor={cursorProps(theme)} />
              {SUBMISSION_STATUSES.map((status, index) => (
                <Bar
                  key={status}
                  dataKey={status}
                  name={STATUS_LABELS[status]}
                  stackId="status"
                  fill={theme.status[status]}
                  // A surface-coloured gap between stacked segments.
                  stroke={theme.surface}
                  strokeWidth={2}
                  maxBarSize={16}
                  radius={index === SUBMISSION_STATUSES.length - 1 ? BAR_RADIUS_END : 0}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </ChartCard>
  );
}
