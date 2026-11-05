import { useEffect, useMemo, useState } from 'react';
import type { SharedShoppingState } from '../shared/useSharedShopping';
import { useGoogleCalendar, type CalendarEvent, type GoogleCalendar } from './useGoogleCalendar';
import './calendar.css';

const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const keyFor = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const startKey = (event: CalendarEvent) => event.start.date || (event.start.dateTime ? keyFor(new Date(event.start.dateTime)) : '');
const eventTime = (event: CalendarEvent) => event.start.date ? 'All day' : event.start.dateTime ? new Intl.DateTimeFormat('en-GB', { hour: 'numeric', minute: '2-digit' }).format(new Date(event.start.dateTime)) : '';
function days(month: Date) {
  const start = new Date(month.getFullYear(), month.getMonth(), 1); const offset = (start.getDay() + 6) % 7;
  return Array.from({ length: 42 }, (_, index) => new Date(month.getFullYear(), month.getMonth(), index - offset + 1));
}
function CalendarChoices({ calendars, disabled, onSave }: { calendars: GoogleCalendar[]; disabled: boolean; onSave: (next: GoogleCalendar[]) => void }) {
  const update = (id: string, field: 'selected' | 'shared', value: boolean) => onSave(calendars.map(item => item.id === id ? { ...item, [field]: value } : item));
  return <section className="calendar-choices" aria-label="Google calendar visibility"><h2>Your Google calendars</h2><p>Only you see them by default. Share only calendars your partner may see.</p>{calendars.map(item => <article key={item.id} className="calendar-choice"><span className="calendar-dot" style={{ background: item.color }} /><div><strong>{item.summary}</strong>{item.primary && <small>Primary calendar</small>}</div><label><input type="checkbox" checked={item.selected} disabled={disabled} onChange={event => update(item.id, 'selected', event.target.checked)} />Show</label><label><input type="checkbox" checked={item.shared} disabled={disabled || !item.selected} onChange={event => update(item.id, 'shared', event.target.checked)} />Share</label></article>)}</section>;
}
export default function Calendar({ shopping }: { shopping: SharedShoppingState }) {
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [view, setView] = useState<'month' | 'agenda'>('month');
  const [returnStatus] = useState(() => { const url = new URL(window.location.href); const status = url.searchParams.get('calendar'); if (status) { url.searchParams.delete('calendar'); window.history.replaceState(window.history.state, '', url.href); } return status; });
  const data = useGoogleCalendar({ userId: shopping.session?.user.id, household: shopping.household });
  useEffect(() => { void data.refresh(month); }, [month]);
  const byDay = useMemo(() => new Map(data.events.reduce<[string, CalendarEvent][]>((all, event) => { const key = startKey(event); return key ? [...all, [key, event]] : all; }, []).map(([key, event]) => [key, data.events.filter(item => startKey(item) === key)])), [data.events]);
  const monthName = new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric' }).format(month);
  const agenda = [...data.events].sort((a, b) => (a.start.dateTime || a.start.date || '').localeCompare(b.start.dateTime || b.start.date || ''));
  if (!shopping.session || !shopping.household) return <section className="calendar-page"><h1>Calendar<span>.</span></h1><p className="intro">Sign in and connect your home to see calendars.</p></section>;
  return <section className="calendar-page"><p className="eyebrow">TIME TOGETHER</p><h1>Calendar<span>.</span></h1><p className="calendar-lead">Your selected Google calendars. Personal calendars stay private until you share one.</p>
    {!data.connected && !data.loading && <section className="calendar-connect"><h2>Connect Google Calendar</h2><p>Read-only. Together never creates or edits Google events in this phase.</p><button className="primary" disabled={data.busy} onClick={() => void data.connect()}>Connect Google Calendar</button></section>}
    {returnStatus && returnStatus !== 'connected' && <p className="feedback error-message" role="alert">Google Calendar could not be connected. Please try again and allow access.</p>}
    {data.error && <p className="feedback error-message" role="alert">{data.error}</p>}{data.notice && <p className="feedback" role="status">{data.notice}</p>}
    {data.connected && <><div className="calendar-controls"><div className="calendar-switch" role="group" aria-label="Calendar view"><button aria-pressed={view === 'month'} onClick={() => setView('month')}>Month</button><button aria-pressed={view === 'agenda'} onClick={() => setView('agenda')}>Agenda</button></div><button className="text-button" disabled={data.loading || data.busy} onClick={() => void data.refresh(month)}>{data.loading ? 'Refreshing…' : 'Refresh'}</button></div>
      {view === 'month' ? <><div className="month-heading"><button aria-label="Previous month" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}>‹</button><h2>{monthName}</h2><button aria-label="Next month" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}>›</button></div><div className="month-grid" aria-label={monthName}>{weekdays.map(day => <span key={day} className="month-weekday">{day}</span>)}{days(month).map(day => { const events = byDay.get(keyFor(day)) ?? []; const outside = day.getMonth() !== month.getMonth(); return <div className={`month-day${outside ? ' outside' : ''}`} key={day.toISOString()}><time dateTime={keyFor(day)}>{day.getDate()}</time>{events.slice(0, 3).map(event => <span className="month-event" title={`${eventTime(event)} ${event.title}`} key={event.id} style={{ borderColor: event.color }}>{event.title}</span>)}{events.length > 3 && <small>+{events.length - 3} more</small>}</div>; })}</div></> : <div className="calendar-agenda">{agenda.length ? agenda.map(event => <article key={event.id} className="agenda-event"><span className="calendar-dot" style={{ background: event.color }} /><time>{event.start.date ? new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }).format(new Date(`${event.start.date}T12:00:00`)) : `${new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }).format(new Date(event.start.dateTime!))} · ${eventTime(event)}`}</time><div><strong>{event.title}</strong><small>{event.calendar}{event.own ? '' : ' · Shared by your partner'}</small></div></article>) : <p className="calendar-empty">No events in this month.</p>}</div>}
      <CalendarChoices calendars={data.calendars} disabled={data.busy} onSave={next => void data.saveCalendars(next)} /><button className="text-action calendar-disconnect" disabled={data.busy} onClick={() => { if (window.confirm('Disconnect Google Calendar? Together will no longer read these events.')) void data.disconnect(); }}>Disconnect Google Calendar</button></>}
  </section>;
}
