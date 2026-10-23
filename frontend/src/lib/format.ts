// Date display helpers. Money uses formatRupees from shared.

const dateTime = new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
// A calendar date (YYYY-MM-DD) has no time zone: format it as UTC so it never shifts a day.
const calendarDate = new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeZone: 'UTC' });
const shortDate = new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' });

/** ISO timestamp → "23 Oct 2026, 2:30 pm". */
export function formatDateTime(iso: string | null): string {
  return iso ? dateTime.format(new Date(iso)) : '—';
}

/** ISO timestamp → "23 Oct 2026" in the user's time zone. */
export function formatDate(iso: string | null): string {
  return iso ? shortDate.format(new Date(iso)) : '—';
}

/** "2026-10-23" → "23 Oct 2026". */
export function formatCalendarDate(value: string | null): string {
  return value ? calendarDate.format(new Date(`${value}T00:00:00.000Z`)) : '—';
}

/** Today in the user's time zone as YYYY-MM-DD, e.g. for a date input's max. */
export function todayString(): string {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
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
const timeOnly = new Intl.DateTimeFormat('en-IN', { timeStyle: 'medium' });

/** Short money for chart axes: 125000 → "₹1.3L" (Indian lakh/crore). */
export function formatRupeesCompact(amount: number): string {
  return compactRupees.format(amount);
}

/** Short counts for chart axes: 1200 → "1.2K". */
export function formatCountCompact(value: number): string {
  return compactNumber.format(value);
}

/** ISO timestamp → "2:30:05 pm". */
export function formatTime(iso: number | string): string {
  return timeOnly.format(new Date(iso));
}

/** "2026-10" → "Oct 2026" (UTC, so it never shifts a month). */
export function formatMonth(value: string): string {
  return new Intl.DateTimeFormat('en-IN', {
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${value}-01T00:00:00.000Z`));
}

/** "2026-10-23" → "23 Oct" (UTC). */
export function formatDayShort(value: string): string {
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  }).format(new Date(`${value}T00:00:00.000Z`));
}

const wholeRupees = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

/** For headline figures: 2104200.5 → "₹21,04,201" (exact paise stay in tables and tooltips). */
export function formatRupeesWhole(amount: number): string {
  return wholeRupees.format(amount);
}
