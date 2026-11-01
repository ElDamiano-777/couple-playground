export type Age = { years: number; months: number; days: number };
type CalendarDate = { year: number; month: number; day: number; timestamp: number };

function parseDate(value: string): CalendarDate | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value < `0001-01-01`) return null;
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.valueOf()) || date.toISOString().slice(0, 10) !== value) return null;
  return {
    year: date.getUTCFullYear(), month: date.getUTCMonth(), day: date.getUTCDate(), timestamp: date.valueOf(),
  };
}

function anniversary(birth: CalendarDate, completedMonths: number): number {
  const monthIndex = birth.month + completedMonths;
  const year = birth.year + Math.floor(monthIndex / 12);
  const month = monthIndex % 12;
  const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const monthLength = [31, leapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month];
  const date = new Date(0);
  // setUTCFullYear preserves years 0001–0099, unlike the Date.UTC constructor shortcut.
  date.setUTCFullYear(year, month, Math.min(birth.day, monthLength));
  return date.valueOf();
}

/**
 * Count completed calendar months from the original birthday, clamping its day
 * to the target month's last day. Split months into years/months; count UTC days
 * since that anniversary. Thus Jan 31 to Feb 28 is one month, while Jan 31 to
 * Mar 30 is one month and 30 days. Feb 29 anniversaries clamp to Feb 28 in
 * non-leap years. Date-only UTC arithmetic keeps daylight saving out of ages.
 */
export function calculateAge(birthDate: string, today: string): Age | null {
  const birth = parseDate(birthDate);
  const current = parseDate(today);
  if (!birth || !current || birth.timestamp > current.timestamp) return null;
  let months = (current.year - birth.year) * 12 + current.month - birth.month;
  if (anniversary(birth, months) > current.timestamp) --months;
  return {
    years: Math.floor(months / 12),
    months: months % 12,
    days: (current.timestamp - anniversary(birth, months)) / 86_400_000,
  };
}

export function formatAge(age: Age): string {
  const parts = ([`years`, `months`, `days`] as const)
    .filter((unit) => age[unit] !== 0)
    .map((unit) => `${age[unit]} ${age[unit] === 1 ? unit.slice(0, -1) : unit}`);
  return parts.length ? `${parts.join(`, `)} old` : `Born today`;
}
