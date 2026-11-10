// Interpret the picker in the phone's local zone and reject missing DST times.
export function scheduledInstant(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const [, year, month, day, hour, minute] = match;
  const result = new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute));
  if (result.getFullYear() !== Number(year) || result.getMonth() !== Number(month) - 1 || result.getDate() !== Number(day) || result.getHours() !== Number(hour) || result.getMinutes() !== Number(minute)) return null;
  return result;
}
export function localScheduleValue(value: string) {
  const date = new Date(value);
  const part = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${part(date.getMonth() + 1)}-${part(date.getDate())}T${part(date.getHours())}:${part(date.getMinutes())}`;
}
export function scheduleLabel(value: string) {
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' }).format(new Date(value));
}
