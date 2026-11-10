import { useEffect, useState } from 'react';
import { supabase } from '../shared/client';
import type { Note, PartnerNotesState } from './usePartnerNotes';
import '../expenses/expenses.css';
import './partner-notes.css';
import OurNotes from './OurNotes';
import { localScheduleValue, scheduledInstant, scheduleLabel } from './schedule';

export default function PartnerNotes({ userId, household, viewer, state, onBack, onDirty }: { userId?: string; household: string | null; viewer: 'masha' | 'damian'; state: PartnerNotesState; onBack: () => void; onDirty: (dirty: boolean) => void }) {
  const [sharedDirty, setSharedDirty] = useState(false);
  const [tab, setTab] = useState<'personal' | 'shared'>('personal');
  const [composing, setComposing] = useState(false);
  const [message, setMessage] = useState('');
  const [draft, setDraft] = useState('');
  const [delivery, setDelivery] = useState<'now' | 'scheduled'>('now');
  const [scheduledTime, setScheduledTime] = useState('');
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 15000); return () => window.clearInterval(timer); }, []);
  const chosenTime = scheduledInstant(scheduledTime);
  const scheduleValid = !!chosenTime && chosenTime.getTime() > now;
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const [edit, setEdit] = useState<Note | null>(null);
  const [saving, setSaving] = useState(false);
  const [opening, setOpening] = useState<string | null>(null);
  const { notes, reads, error, setError, setNotes, markRead, unread } = state;
  const personalDirty = composing && (edit ? draft !== edit.body || (delivery === 'scheduled' && scheduledTime !== localScheduleValue(edit.deliver_at!)) : !!draft.trim() || !!scheduledTime);
  useEffect(() => { onDirty(personalDirty || sharedDirty); return () => onDirty(false); }, [personalDirty, sharedDirty, onDirty]);
  const save = async () => {
    const scheduled = delivery === 'scheduled';
    const instant = scheduled ? scheduledInstant(scheduledTime) : null;
    if (!household || !draft.trim() || saving || (scheduled && (!instant || instant.getTime() <= Date.now()))) return;
    setSaving(true);
    const values = { body: draft.trim(), ...(scheduled && instant ? { deliver_at: instant.toISOString() } : {}) };
    const result = edit
      ? await (edit.deliver_at
        ? supabase.from('partner_notes').update(values).eq('id', edit.id).eq('deliver_at', edit.deliver_at).select().maybeSingle()
        : supabase.from('partner_notes').update(values).eq('id', edit.id).select().maybeSingle())
      : await supabase.from('partner_notes').insert({ household_id: household, sender: viewer, ...values }).select().single();
    if (result.error || !result.data) setError(scheduled ? 'Could not save the surprise. Check that the delivery time is still in the future and try again.' : 'Could not save note.');
    else { setNotes(current => [result.data as Note, ...current.filter(note => note.id !== result.data.id)]); setDraft(''); setScheduledTime(''); setDelivery('now'); setEdit(null); setComposing(false); setMessage(scheduled ? 'Surprise scheduled.' : edit ? 'Note saved.' : 'Note sent.'); setError(''); }
    setSaving(false);
  };
  const remove = async (note: Note) => {
    if (!confirm('Delete this note?')) return;
    const result = await supabase.from('partner_notes').delete().eq('id', note.id);
    if (result.error) setError('Could not delete note.');
    else setNotes(current => current.filter(item => item.id !== note.id));
  };
  const cancelSurprise = async (note: Note) => {
    if (!confirm('Cancel this scheduled surprise?')) return;
    const result = await supabase.from('partner_notes').delete().eq('id', note.id).eq('deliver_at', note.deliver_at!).select().maybeSingle();
    if (result.error || !result.data) setError('Could not cancel this surprise. It may already have been delivered.');
    else { setNotes(current => current.filter(item => item.id !== note.id)); setMessage('Surprise cancelled.'); }
  };
  const scheduledNotes = notes.filter(note => note.created_by === userId && note.deliver_at && new Date(note.deliver_at).getTime() > now);
  const deliveredNotes = notes.filter(note => !scheduledNotes.some(item => item.id === note.id));
  const editNote = (note: Note) => { if (personalDirty && !confirm('Discard your unfinished note?')) return; setEdit(note); setDraft(note.body); setDelivery(note.deliver_at ? 'scheduled' : 'now'); setScheduledTime(note.deliver_at ? localScheduleValue(note.deliver_at) : ''); setMessage(''); setComposing(true); };
  return <section className="partner-notes">
    <button className="text-action" onClick={onBack}>← Us</button>
    <p className="eyebrow">FOR EACH OTHER</p><h1>Love Notes<span>.</span></h1>
    <div className="love-note-tabs" role="tablist" aria-label="Love Notes sections"><button role="tab" aria-selected={tab === 'personal'} onClick={() => setTab('personal')}>For Each Other 💌</button><button role="tab" aria-selected={tab === 'shared'} onClick={() => setTab('shared')}>Our Notes 📖</button></div>
    <div hidden={tab !== 'personal'}>
    <p className="notes-lead">{unread ? `${unread} unread note${unread === 1 ? '' : 's'}.` : 'A little note for your partner.'}</p>
    {!composing && <button className="notes-create" disabled={!household} onClick={() => { setMessage(''); setEdit(null); setDelivery('now'); setScheduledTime(''); setComposing(true); }}>+ Write a note</button>}
    {composing && <form className="note-composer" onSubmit={event => { event.preventDefault(); void save(); }}>
      {(!edit || edit.deliver_at) && <fieldset className="delivery-options"><legend>Delivery</legend><label><input type="radio" name="delivery" checked={delivery === 'now'} disabled={!!edit} onChange={() => setDelivery('now')} /> Send now</label><label><input type="radio" name="delivery" checked={delivery === 'scheduled'} onChange={() => setDelivery('scheduled')} /> Schedule a surprise 💌</label></fieldset>}
      {delivery === 'scheduled' && <div className="schedule-picker"><label htmlFor="surprise-time">Delivery date and time</label><input id="surprise-time" type="datetime-local" required min={localScheduleValue(new Date(now).toISOString())} value={scheduledTime} onChange={event => setScheduledTime(event.target.value)} /><small>Times use your phone’s time zone ({zone}).</small>{scheduledTime && <small>{chosenTime ? `Delivery: ${scheduleLabel(chosenTime.toISOString())}` : 'Choose a valid local time.'}</small>}{scheduledTime && !scheduleValid && <small>Choose a valid time in the future.</small>}</div>}
      <textarea aria-label="Partner note" maxLength={2000} value={draft} onChange={event => setDraft(event.target.value)} placeholder="Write something kind or useful…" />
      <div className="note-form-actions"><button className="primary" disabled={!household || !draft.trim() || saving || (delivery === 'scheduled' && !scheduleValid)}>{edit ? 'Save note' : delivery === 'scheduled' ? 'Schedule' : 'Send'}</button>
      <button type="button" disabled={saving} onClick={() => { if (personalDirty && !confirm('Discard your changes?')) return; setEdit(null); setDraft(''); setScheduledTime(''); setDelivery('now'); setComposing(false); }}>Cancel</button></div>
    </form>}
    {message && <p role="status" className="note-status">{message}</p>}
    {error && <p role="alert">{error}</p>}
    {!!scheduledNotes.length && <section className="scheduled-notes"><h2>Scheduled</h2><div className="partner-note-list">{[...scheduledNotes].sort((a, b) => a.deliver_at!.localeCompare(b.deliver_at!)).map(note => <article key={note.id}><strong>Scheduled surprise</strong><time dateTime={note.deliver_at!}>{scheduleLabel(note.deliver_at!)}</time><p>{note.body}</p><div><button onClick={() => editNote(note)}>Edit</button><button onClick={() => void cancelSurprise(note)}>Cancel surprise</button></div></article>)}</div></section>}
    <div className="partner-note-list">{[...deliveredNotes].sort((a, b) => (b.deliver_at ?? b.created_at).localeCompare(a.deliver_at ?? a.created_at)).map(note => {
      const closed = note.created_by !== userId && !reads.includes(note.id);
      return <article className={closed ? 'unread note-envelope' : 'note-open'} key={note.id}>
        <span className="envelope-icon" aria-hidden="true">{closed ? '✉' : ''}</span><strong>{note.sender === 'masha' ? 'Masha' : 'Damian'}{closed && <em>New</em>}</strong>
        <time dateTime={note.deliver_at ?? note.created_at}>{new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(note.deliver_at ?? note.created_at))}</time>
        {closed ? <button className="open-note" disabled={opening === note.id} onClick={() => { setOpening(note.id); void markRead(note).finally(() => setOpening(null)); }}>Open note <span aria-hidden="true">✉</span></button> : <div className="note-message"><p>{note.body}</p>{note.created_by === userId && !note.deliver_at && <div><button onClick={() => editNote(note)}>Edit</button><button onClick={() => void remove(note)}>Delete</button></div>}</div>}
      </article>;
    })}</div>
    </div>
    <OurNotes key={`${userId ?? ''}:${household ?? ''}`} household={household} visible={tab === 'shared'} onDirty={setSharedDirty} />
  </section>;
}
