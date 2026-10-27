import { STATUS_LABELS, type DashboardSummary } from 'shared';
import { ChartCard } from '../ChartCard';
import { useChartTheme } from '../useChartTheme';
import { Donut } from './Donut';

/** V1: how the submissions split across the five statuses. */
export function StatusChart({ summary }: { summary: DashboardSummary }) {
  const theme = useChartTheme();
  const slices = summary.byStatus.map((row) => ({
    label: STATUS_LABELS[row.status],
    color: theme.status[row.status],
    count: row.count,
  }));

  return (
    <ChartCard
      title="Submissions by status"
      table={{ columns: ['Status', 'Submissions'], rows: slices.map((s) => [s.label, s.count]) }}
      empty={summary.cards.totalSubmissions === 0}
    >
      <Donut slices={slices} totalLabel="submissions" />
    </ChartCard>
  );
}
