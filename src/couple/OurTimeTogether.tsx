import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../shared/client';
import { displayDate, localToday, relationshipDates } from './relationshipDates';

export default function OurTimeTogether({ userId, household, onSignIn }: { userId?: string; household: string | null; onSignIn: () => void }) {
  const [date, setDate] = useState<string | null>(null);
  const [today, setToday] = useState(localToday);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const refresh = useCallback(async () => {
    if (!userId || !household) { setLoading(false); return; }
    const result = await supabase.from('households').select('relationship_start_date').eq('id', household).single();
    if (result.error) setError('Could not load your date. Please try again.');
    else { setDate(result.data.relationship_start_date); setError(''); }
    setLoading(false);
  }, [userId, household]);
  useEffect(() => {
    void refresh();
    const update = () => { setToday(localToday()); if (!document.hidden) void refresh(); };
    const timer = window.setInterval(update, 15000);
    document.addEventListener('visibilitychange', update);
    return () => { window.clearInterval(timer); document.removeEventListener('visibilitychange', update); };
  }, [refresh]);
  const save = async () => {
    if (!household || !draft || draft > localToday() || saving) return;
    setSaving(true); setError('');
    const result = await supabase.from('households').update({ relationship_start_date: draft }).eq('id', household).select('relationship_start_date').single();
    if (result.error) setError('Could not save your date. Please try again.');
    else { setDate(result.data.relationship_start_date); setEditing(false); }
    setSaving(false);
  };
  const info = date && date <= today ? relationshipDates(date, today) : null;
  const unit = (value: number, name: string) => `${value} ${name}${value === 1 ? '' : 's'}`;
  return <section className="our-time" aria-labelledby="our-time-title">
    <div className="our-time-header"><h2 id="our-time-title">Our Time Together</h2>{date && !editing && <button className="our-time-edit" onClick={() => { setDraft(date); setEditing(true); }}>Edit date</button>}</div>
    {!userId || !household ? <><p>Save your date in your shared space.</p><button className="our-time-button" onClick={onSignIn}>Open shared space</button></> : loading ? <p>Loading your date…</p> : editing ? <form onSubmit={event => { event.preventDefault(); void save(); }}><label htmlFor="relationship-date">The day you got together</label><input id="relationship-date" type="date" required max={today} value={draft} onChange={event => setDraft(event.target.value)} /><div className="our-time-actions"><button className="our-time-button" disabled={saving || !draft || draft > today}>Save</button><button type="button" disabled={saving} onClick={() => { setEditing(false); setError(''); }}>Cancel</button></div></form> : info ? <><p className="our-time-duration">{unit(info.years, 'year')} · {unit(info.months, 'month')} · {unit(info.days, 'day')}</p><p className="our-time-since">Together since {displayDate(date!)}</p><p className="our-time-anniversary">{info.daysUntil === 0 ? 'Happy anniversary! Today is your day.' : `${info.daysUntil} ${info.daysUntil === 1 ? 'day' : 'days'} until your anniversary`} <span>· {displayDate(info.anniversary)}</span></p>{date?.slice(5) === '02-29' && <small>In non-leap years, your anniversary falls on 28 February.</small>}</> : !error ? <><p>Every story has a beginning. Save yours here.</p><button className="our-time-button" onClick={() => { setDraft(''); setEditing(true); }}>Set our date</button></> : null}
    {error && <p role="alert">{error} <button className="our-time-edit" onClick={() => void refresh()}>Try again</button></p>}
  </section>;
}
