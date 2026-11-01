import { useEffect, useState } from 'react';
import { todayDate } from './birthdays';

// Age follows the same UTC calendar day on both phones. Refresh after sleep or
// a clock change without reloading the page or interrupting an unfinished form.
export function useAgeDate(): string {
  const [today, setToday] = useState(todayDate);
  useEffect(() => {
    let timer: number;
    const refresh = () => {
      setToday(todayDate());
      window.clearTimeout(timer);
      const now = new Date();
      const midnight = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1);
      timer = window.setTimeout(refresh, Math.max(100, midnight - now.getTime() + 100));
    };
    const visible = () => { if (!document.hidden) refresh(); };
    refresh();
    window.addEventListener(`focus`, refresh);
    document.addEventListener(`visibilitychange`, visible);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener(`focus`, refresh);
      document.removeEventListener(`visibilitychange`, visible);
    };
  }, []);
  return today;
}
