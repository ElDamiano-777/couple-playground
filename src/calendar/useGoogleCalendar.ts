import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../shared/client';

export type GoogleCalendar = { id: string; summary: string; color: string; primary?: boolean; selected: boolean; shared: boolean };
export type CalendarEvent = { id: string; title: string; start: { date?: string; dateTime?: string; timeZone?: string }; end: { date?: string; dateTime?: string; timeZone?: string }; calendar: string; color: string; own: boolean };
const failure = 'We couldn’t load Google Calendar. Check your connection and try again.';
const monthRange = (month: Date) => ({
  timeMin: new Date(month.getFullYear(), month.getMonth(), 1).toISOString(),
  timeMax: new Date(month.getFullYear(), month.getMonth() + 1, 1).toISOString(),
});

export function useGoogleCalendar({ userId, household }: { userId?: string; household: string | null }) {
  const [calendars, setCalendars] = useState<GoogleCalendar[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const invoke = useCallback(async (body: Record<string, unknown>) => {
    const result = await supabase.functions.invoke('calendar-google', { body });
    if (result.error) throw new Error((result.data as { error?: string } | null)?.error || result.error.message);
    if ((result.data as { error?: string } | null)?.error) throw new Error((result.data as { error: string }).error);
    return result.data as Record<string, unknown>;
  }, []);
  const refreshSettings = useCallback(async () => {
    if (!userId || !household) return;
    const data = await invoke({ action: 'calendars' });
    setConnected(data.connected === true);
    setCalendars(Array.isArray(data.calendars) ? data.calendars as GoogleCalendar[] : []);
  }, [household, invoke, userId]);
  const refresh = useCallback(async (month: Date) => {
    if (!userId || !household) return;
    setLoading(true); setError('');
    try {
      await refreshSettings();
      const data = await invoke({ action: 'events', ...monthRange(month) });
      setEvents(Array.isArray(data.events) ? data.events as CalendarEvent[] : []);
    } catch (value) { setError(value instanceof Error && /not configured|reconnecting/i.test(value.message) ? value.message : failure); }
    finally { setLoading(false); }
  }, [household, invoke, refreshSettings, userId]);
  useEffect(() => { void refreshSettings().catch(() => { /* Calendar stays optional until connected. */ }); }, [refreshSettings]);
  const connect = async () => {
    setBusy(true); setError('');
    try {
      const data = await invoke({ action: 'connect' });
      if (typeof data.url !== 'string') throw new Error('Could not start Google connection.');
      window.location.assign(data.url);
    } catch (value) { setError(value instanceof Error ? value.message : failure); setBusy(false); }
  };
  const saveCalendars = async (next: GoogleCalendar[]) => {
    setBusy(true); setError('');
    try {
      await invoke({ action: 'preferences', calendars: next.map(item => ({ id: item.id, selected: item.selected, shared: item.shared })) });
      setCalendars(next); setNotice('Calendar visibility saved.');
    } catch (value) { setError(value instanceof Error ? value.message : failure); }
    finally { setBusy(false); }
  };
  const disconnect = async () => {
    setBusy(true); setError('');
    try { await invoke({ action: 'disconnect' }); setConnected(false); setCalendars([]); setEvents([]); setNotice('Google Calendar disconnected.'); }
    catch (value) { setError(value instanceof Error ? value.message : failure); }
    finally { setBusy(false); }
  };
  return { calendars, events, connected, loading, busy, error, notice, refresh, connect, saveCalendars, disconnect };
}
