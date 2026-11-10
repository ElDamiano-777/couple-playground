import { useState } from 'react';
import { supabase } from '../shared/client';
import type { Note, PartnerNotesState } from './usePartnerNotes';
import '../expenses/expenses.css';
import './partner-notes.css';

export default function PartnerNotes({ userId, household, viewer, state, onBack }: { userId?: string; household: string | null; viewer: 'masha' | 'damian'; state: PartnerNotesState; onBack: () => void }) {
  const [draft, setDraft] = useState('');
  const [edit, setEdit] = useState<Note | null>(null);
  const [saving, setSaving] = useState(false);
  const [opening, setOpening] = useState<string | null>(null);
  const { notes, reads, error, setError, setNotes, markRead, unread } = state;
  const save = async () => {
    if (!household || !draft.trim() || saving) return;
    setSaving(true);
    const result = edit
      ? await supabase.from('partner_notes').update({ body: draft.trim() }).eq('id', edit.id).select().single()
      : await supabase.from('partner_notes').insert({ household_id: household, sender: viewer, body: draft.trim() }).select().single();
    if (result.error) setError('Could not save note.');
    else { setNotes(current => [result.data as Note, ...current.filter(note => note.id !== result.data.id)]); setDraft(''); setEdit(null); setError(''); }
    setSaving(false);
  };
  const remove = async (note: Note) => {
    if (!confirm('Delete this note?')) return;
    const result = await supabase.from('partner_notes').delete().eq('id', note.id);
    if (result.error) setError('Could not delete note.');
    else setNotes(current => current.filter(item => item.id !== note.id));
  };
  return <section className="partner-notes">
    <button className="text-action" onClick={onBack}>← Us</button>
    <p className="eyebrow">FOR EACH OTHER</p><h1>Love Notes<span>.</span></h1>
    <p className="notes-lead">{unread ? `${unread} unread note${unread === 1 ? '' : 's'}.` : 'A little note for your partner.'}</p>
    <form onSubmit={event => { event.preventDefault(); void save(); }}>
      <textarea aria-label="Partner note" maxLength={2000} value={draft} onChange={event => setDraft(event.target.value)} placeholder="Write something kind or useful…" />
      <button className="primary" disabled={!household || !draft.trim() || saving}>{edit ? 'Save note' : 'Send note'}</button>
      {edit && <button type="button" onClick={() => { setEdit(null); setDraft(''); }}>Cancel</button>}
    </form>
    {error && <p role="alert">{error}</p>}
    <div className="partner-note-list">{notes.map(note => {
      const closed = note.created_by !== userId && !reads.includes(note.id);
      return <article className={closed ? 'unread note-envelope' : 'note-open'} key={note.id}>
        <strong>{note.sender === 'masha' ? 'Masha' : 'Damian'}{closed && <em>New</em>}</strong>
        <time dateTime={note.created_at}>{new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(note.created_at))}</time>
        {closed ? <button className="open-note" disabled={opening === note.id} onClick={() => { setOpening(note.id); void markRead(note).finally(() => setOpening(null)); }}>Open note <span aria-hidden="true">✉</span></button> : <div className="note-message"><p>{note.body}</p>{note.created_by === userId && <div><button onClick={() => { setEdit(note); setDraft(note.body); }}>Edit</button><button onClick={() => void remove(note)}>Delete</button></div>}</div>}
      </article>;
    })}</div>
  </section>;
}
