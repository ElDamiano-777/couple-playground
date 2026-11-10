// Anniversaries of February 29 fall on February 28 in non-leap years.
type DateParts = { year: number; month: number; day: number };
const parse = (value: string): DateParts => {
  const [year, month, day] = value.split('-').map(Number);
  return { year, month, day };
};
const daysInMonth = (year: number, month: number) => new Date(Date.UTC(year, month, 0)).getUTCDate();
const clamp = (year: number, month: number, day: number): DateParts => ({ year, month, day: Math.min(day, daysInMonth(year, month)) });
const stamp = ({ year, month, day }: DateParts) => Date.UTC(year, month - 1, day);
const iso = ({ year, month, day }: DateParts) => `${year.toString().padStart(4, '0')}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
export function localToday() {
  const now = new Date();
  return iso({ year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() });
}
export function relationshipDates(startDate: string, todayDate: string) {
  const start = parse(startDate), today = parse(todayDate);
  let years = today.year - start.year;
  let yearAnchor = clamp(start.year + years, start.month, start.day);
  if (stamp(yearAnchor) > stamp(today)) yearAnchor = clamp(start.year + --years, start.month, start.day);
  let months = (today.year - yearAnchor.year) * 12 + today.month - yearAnchor.month;
  const monthAnchor = (count: number) => {
    const index = yearAnchor.year * 12 + yearAnchor.month - 1 + count;
    return clamp(Math.floor(index / 12), index % 12 + 1, yearAnchor.day);
  };
  if (months >= 12 || stamp(monthAnchor(months)) > stamp(today)) months--;
  const days = Math.round((stamp(today) - stamp(monthAnchor(months))) / 86400000);
  let anniversary = clamp(today.year, start.month, start.day);
  if (stamp(anniversary) < stamp(today)) anniversary = clamp(today.year + 1, start.month, start.day);
  return { years, months, days, anniversary: iso(anniversary), daysUntil: Math.round((stamp(anniversary) - stamp(today)) / 86400000) };
}
export function displayDate(value: string) {
  const { year, month, day } = parse(value);
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(Date.UTC(year, month - 1, day)));
}
