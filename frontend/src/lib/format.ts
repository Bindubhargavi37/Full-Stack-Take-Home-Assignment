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
