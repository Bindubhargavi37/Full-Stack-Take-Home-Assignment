// The app works in Indian Standard Time: every "day" in filters and charts, and "today",
// is a calendar day in India, whatever time zone the server or browser runs in.

export const TIME_ZONE = 'Asia/Kolkata';

const IST_OFFSET = '+05:30';
const DAY_MS = 86_400_000;

/** The moment an IST calendar day (YYYY-MM-DD) starts. */
export function istDayStart(day: string): Date {
  return new Date(`${day}T00:00:00.000${IST_OFFSET}`);
}

/** The moment the IST calendar day (YYYY-MM-DD) after `day` starts (an exclusive end bound). */
export function istDayEnd(day: string): Date {
  return new Date(istDayStart(day).getTime() + DAY_MS);
}

const istCalendarDate = new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE });

/** The IST calendar date of a moment, as YYYY-MM-DD (defaults to now). */
export function istDate(at: Date | number = Date.now()): string {
  return istCalendarDate.format(at);
}
