import { todayString } from '@/lib/format';

// Date-range presets for the dashboard filter row (kept apart from components for fast refresh).

export const DATE_PRESETS = [
  { value: 'all', label: 'All time' },
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
  { value: 'year', label: 'This year' },
  { value: 'custom', label: 'Custom range' },
] as const;

export type DatePreset = (typeof DATE_PRESETS)[number]['value'];

const DAYS: Partial<Record<DatePreset, number>> = { '7d': 7, '30d': 30, '90d': 90 };

/** The fromDate / toDate a preset stands for ("Last 7 days" = today and the 6 days before). */
export function dateRangeFor(
  preset: DatePreset,
  custom: { fromDate: string; toDate: string },
): { fromDate?: string; toDate?: string } {
  const today = todayString();
  const days = DAYS[preset];
  if (days) {
    const from = new Date(`${today}T00:00:00.000Z`);
    from.setUTCDate(from.getUTCDate() - (days - 1));
    return { fromDate: from.toISOString().slice(0, 10), toDate: today };
  }
  if (preset === 'year') return { fromDate: `${today.slice(0, 4)}-01-01`, toDate: today };
  if (preset === 'custom') {
    return { fromDate: custom.fromDate || undefined, toDate: custom.toDate || undefined };
  }
  return {};
}

export function isDatePreset(value: string | null): value is DatePreset {
  return DATE_PRESETS.some((preset) => preset.value === value);
}
