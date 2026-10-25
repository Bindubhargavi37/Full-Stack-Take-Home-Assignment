import { istDate, TIME_ZONE } from 'shared';

// Display helpers. Dates are shown as dd/mm/yyyy in Indian Standard Time; money uses
// formatRupees from shared (exact) or the compact/whole helpers below (charts, headline cards).

const ddmmyyyy = { day: '2-digit', month: '2-digit', year: 'numeric' } as const;

const dateTime = new Intl.DateTimeFormat('en-IN', {
  ...ddmmyyyy,
  hour: 'numeric',
  minute: '2-digit',
  timeZone: TIME_ZONE,
});
const dateOnly = new Intl.DateTimeFormat('en-IN', { ...ddmmyyyy, timeZone: TIME_ZONE });
// A calendar date (YYYY-MM-DD) has no time of day: format it in UTC so no time zone shifts it.
const calendarDate = new Intl.DateTimeFormat('en-IN', { ...ddmmyyyy, timeZone: 'UTC' });
const dayMonth = new Intl.DateTimeFormat('en-IN', {
  day: '2-digit',
  month: '2-digit',
  timeZone: 'UTC',
});
const monthYear = new Intl.DateTimeFormat('en-IN', {
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});
const timeOnly = new Intl.DateTimeFormat('en-IN', { timeStyle: 'medium', timeZone: TIME_ZONE });

/** ISO timestamp → "24/10/2026, 5:51 pm" (IST). */
export function formatDateTime(iso: string | null): string {
  return iso ? dateTime.format(new Date(iso)) : '—';
}

/** ISO timestamp → "24/10/2026" (IST). */
export function formatDate(iso: string | null): string {
  return iso ? dateOnly.format(new Date(iso)) : '—';
}

/** "2026-10-24" → "24/10/2026". */
export function formatCalendarDate(value: string | null): string {
  return value ? calendarDate.format(new Date(`${value}T00:00:00.000Z`)) : '—';
}

/** "2026-10-24" → "24/10", for chart axes where the year is shown elsewhere. */
export function formatDayShort(value: string): string {
  return dayMonth.format(new Date(`${value}T00:00:00.000Z`));
}

/** "2026-10" → "Oct 2026" (a month, not a date, so it keeps the month name). */
export function formatMonth(value: string): string {
  return monthYear.format(new Date(`${value}-01T00:00:00.000Z`));
}

/** ISO timestamp or epoch ms → "5:51:05 pm" (IST). */
export function formatTime(at: number | string): string {
  return timeOnly.format(new Date(at));
}

/** Today in India as YYYY-MM-DD, e.g. for a date input's max. */
export function todayString(): string {
  return istDate();
}

const compactRupees = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  notation: 'compact',
  maximumFractionDigits: 1,
});
const compactNumber = new Intl.NumberFormat('en-IN', {
  notation: 'compact',
  maximumFractionDigits: 1,
});
const wholeRupees = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

/** Short money for chart axes: 125000 → "₹1.3L" (Indian lakh/crore). */
export function formatRupeesCompact(amount: number): string {
  return compactRupees.format(amount);
}

/** Short counts for chart axes: 1200 → "1.2K". */
export function formatCountCompact(value: number): string {
  return compactNumber.format(value);
}

/** For headline figures: 2104200.5 → "₹21,04,201" (exact paise stay in tables and tooltips). */
export function formatRupeesWhole(amount: number): string {
  return wholeRupees.format(amount);
}
