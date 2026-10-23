import { TEST_RESULT_LABELS, type DashboardSummary } from 'shared';
import { ChartCard } from '../ChartCard';
import { useChartTheme } from '../useChartTheme';
import { Donut } from './Donut';

/** V4: test results. The same result colours are used in "Condition vs result". */
export function ResultsChart({ summary }: { summary: DashboardSummary }) {
  const theme = useChartTheme();
  const slices = summary.byResult.map((row, index) => ({
    label: TEST_RESULT_LABELS[row.result],
    color: theme.series[index] ?? theme.series[0],
    count: row.count,
  }));
  const total = slices.reduce((sum, slice) => sum + slice.count, 0);

  return (
    <ChartCard
      title="Test results"
      table={{ columns: ['Result', 'Submissions'], rows: slices.map((s) => [s.label, s.count]) }}
      empty={total === 0}
    >
      <Donut slices={slices} totalLabel="tested" />
    </ChartCard>
  );
}
