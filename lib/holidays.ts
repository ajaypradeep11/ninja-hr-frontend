// lib/holidays.ts
// Ontario statutory holidays, computed for any year (no hardcoded dates, so
// the yearly calendar stays correct after 2026).

export interface Holiday {
  date: string; // ISO YYYY-MM-DD
  name: string;
}

const iso = (y: number, m: number, d: number) =>
  `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

/** nth (1-based) occurrence of a weekday (0=Sun..6=Sat) in a month (1-based). */
function nthWeekday(year: number, month: number, weekday: number, n: number): string {
  const first = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const day = 1 + ((weekday - first + 7) % 7) + (n - 1) * 7;
  return iso(year, month, day);
}

/** Last `weekday` strictly BEFORE the given day of month (Victoria Day rule). */
function weekdayBefore(year: number, month: number, weekday: number, beforeDay: number): string {
  const d = new Date(Date.UTC(year, month - 1, beforeDay));
  let delta = (d.getUTCDay() - weekday + 7) % 7;
  if (delta === 0) delta = 7;
  d.setUTCDate(d.getUTCDate() - delta);
  return d.toISOString().slice(0, 10);
}

/** Easter Sunday (Gregorian, anonymous computus). */
function easterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31); // 3=Mar, 4=Apr
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(year, month - 1, day));
}

function goodFriday(year: number): string {
  const easter = easterSunday(year);
  easter.setUTCDate(easter.getUTCDate() - 2);
  return easter.toISOString().slice(0, 10);
}

/**
 * The nine Ontario statutory holidays (ESA). The Civic Holiday (August) is a
 * common company day off but NOT statutory in Ontario, so it's not listed.
 */
export function ontarioStatutoryHolidays(year: number): Holiday[] {
  return [
    { date: iso(year, 1, 1), name: "New Year's Day" },
    { date: nthWeekday(year, 2, 1, 3), name: "Family Day" },
    { date: goodFriday(year), name: "Good Friday" },
    { date: weekdayBefore(year, 5, 1, 25), name: "Victoria Day" },
    { date: iso(year, 7, 1), name: "Canada Day" },
    { date: nthWeekday(year, 9, 1, 1), name: "Labour Day" },
    { date: nthWeekday(year, 10, 1, 2), name: "Thanksgiving" },
    { date: iso(year, 12, 25), name: "Christmas Day" },
    { date: iso(year, 12, 26), name: "Boxing Day" },
  ];
}
