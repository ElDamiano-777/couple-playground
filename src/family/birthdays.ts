// Birthdays are calendar dates, never instants in a phone's time zone.
export const todayDate = () => new Date().toISOString().slice(0, 10);

export function validBirthday(value: string): boolean {
  if (!value) return true;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value < `0001-01-01` || value > todayDate()) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}

export function formatBirthday(value: string): string {
  return new Intl.DateTimeFormat(`en-GB`, {
    day: `numeric`, month: `long`, year: `numeric`, timeZone: `UTC`,
  }).format(new Date(`${value}T00:00:00Z`));
}
