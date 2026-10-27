import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import {
  SAMPLE_CONDITION_LABELS,
  TEST_RESULT_LABELS,
  TEST_RESULTS,
  type DashboardSummary,
} from 'shared';
import { formatCountCompact } from '@/lib/format';
import { ChartCard } from '../ChartCard';
import { ChartLegend } from '../ChartLegend';
import { ChartTooltip } from '../ChartTooltip';
import { axisProps, BAR_RADIUS_TOP, cursorProps, gridProps, MAX_BAR_SIZE } from '../chartStyles';
import { useChartTheme } from '../useChartTheme';

/** V6: test results within each sample condition (stacked). Colours match "Test results". */
export function ConditionVsResultChart({ summary }: { summary: DashboardSummary }) {
  const theme = useChartTheme();
  const rows = summary.conditionVsResult.map((row) => ({
    label: SAMPLE_CONDITION_LABELS[row.condition],
    ...row.counts,
  }));
  const total = rows.reduce(
    (sum, row) => sum + TEST_RESULTS.reduce((inner, result) => inner + row[result], 0),
    0,
  );

  return (
    <ChartCard
      title="Condition vs result"
      description="Test results within each sample condition"
      table={{
        columns: ['Condition', ...TEST_RESULTS.map((result) => TEST_RESULT_LABELS[result])],
        rows: rows.map((row) => [row.label, ...TEST_RESULTS.map((result) => row[result])]),
      }}
      empty={total === 0}
    >
      <div className="flex h-full flex-col gap-2">
        <ChartLegend
          items={TEST_RESULTS.map((result, index) => ({
            label: TEST_RESULT_LABELS[result],
            color: theme.series[index] ?? theme.series[0],
          }))}
        />
        <div className="min-h-0 flex-1">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
              <CartesianGrid vertical={false} {...gridProps(theme)} />
              <XAxis dataKey="label" {...axisProps(theme)} />
              <YAxis
                allowDecimals={false}
                tickFormatter={formatCountCompact}
                {...axisProps(theme)}
              />
              <Tooltip content={<ChartTooltip />} cursor={cursorProps(theme)} />
              {TEST_RESULTS.map((result, index) => (
                <Bar
                  key={result}
                  dataKey={result}
                  name={TEST_RESULT_LABELS[result]}
                  stackId="results"
                  fill={theme.series[index]}
                  // A surface-coloured gap between stacked segments.
                  stroke={theme.surface}
                  strokeWidth={2}
                  maxBarSize={MAX_BAR_SIZE * 2}
                  radius={index === TEST_RESULTS.length - 1 ? BAR_RADIUS_TOP : 0}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </ChartCard>
  );
}
