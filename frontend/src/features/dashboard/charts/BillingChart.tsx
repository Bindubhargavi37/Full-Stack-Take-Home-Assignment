import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatRupees, type DashboardSummary } from 'shared';
import { formatMonth, formatRupeesCompact } from '@/lib/format';
import { ChartCard } from '../ChartCard';
import { ChartLegend } from '../ChartLegend';
import { ChartTooltip } from '../ChartTooltip';
import { axisProps, BAR_RADIUS_TOP, cursorProps, gridProps, MAX_BAR_SIZE } from '../chartStyles';
import { useChartTheme } from '../useChartTheme';

const SERIES = [
  { key: 'billed', label: 'Billed' },
  { key: 'collected', label: 'Collected' },
  { key: 'pending', label: 'Pending' },
] as const;

type BillingRow = DashboardSummary['billingByMonth'][number];

/**
 * V3: money billed, collected and still pending per month. Billed includes rejected submissions;
 * money paid on those is refunded (in the tooltip and table), not collected.
 */
export function BillingChart({ summary }: { summary: DashboardSummary }) {
  const theme = useChartTheme();
  const rows = summary.billingByMonth;

  return (
    <ChartCard
      title="Billed vs collected vs pending"
      description="Per month; billed includes rejected samples"
      table={{
        columns: ['Month', ...SERIES.map((series) => series.label), 'Refunded'],
        rows: rows.map((row) => [
          formatMonth(row.month),
          ...SERIES.map((series) => formatRupees(row[series.key])),
          formatRupees(row.refunded),
        ]),
      }}
      empty={rows.every((row) => row.billed === 0)}
    >
      <div className="flex h-full flex-col gap-2">
        <ChartLegend
          items={SERIES.map((series, index) => ({
            label: series.label,
            color: theme.series[index] ?? theme.series[0],
          }))}
        />
        <div className="min-h-0 flex-1">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid vertical={false} {...gridProps(theme)} />
              <XAxis dataKey="month" tickFormatter={formatMonth} {...axisProps(theme)} />
              <YAxis tickFormatter={formatRupeesCompact} width={56} {...axisProps(theme)} />
              <Tooltip
                content={
                  <ChartTooltip
                    formatLabel={formatMonth}
                    formatValue={formatRupees}
                    note={(row: BillingRow) =>
                      row.refunded > 0 ? `${formatRupees(row.refunded)} refunded` : undefined
                    }
                  />
                }
                cursor={cursorProps(theme)}
              />
              {SERIES.map((series, index) => (
                <Bar
                  key={series.key}
                  dataKey={series.key}
                  name={series.label}
                  fill={theme.series[index]}
                  maxBarSize={MAX_BAR_SIZE}
                  radius={BAR_RADIUS_TOP}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </ChartCard>
  );
}
