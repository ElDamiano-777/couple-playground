import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../shared/client';

type SharedNote = { id: string; title: string; body: string; created_at: string; updated_at: string; revision: number };
const formatDate = (value: string) => new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(value));
export default function OurNotes({ household, visible, onDirty }: { household: string | null; visible: boolean; onDirty: (dirty: boolean) => void }) {
  const [notes, setNotes] = useState<SharedNote[]>([]);
  const [editor, setEditor] = useState<SharedNote | 'new' | null>(null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const dirty = !!editor && (editor === 'new' ? !!(title.trim() || body.trim()) : title !== editor.title || body !== editor.body);
  useEffect(() => { onDirty(dirty); return () => onDirty(false); }, [dirty, onDirty]);
  const refresh = useCallback(async () => {
    if (!household) return;
    const result = await supabase.from('shared_love_notes').select('*').eq('household_id', household).order('created_at', { ascending: false });
    if (result.error) setError('Could not load shared notes.');
    else setNotes(result.data as SharedNote[]);
  }, [household]);
  useEffect(() => {
    if (!visible) return;
    void refresh();
    const update = () => { if (!document.hidden) void refresh(); };
    const timer = window.setInterval(update, 15000);
    document.addEventListener('visibilitychange', update);
    return () => { window.clearInterval(timer); document.removeEventListener('visibilitychange', update); };
  }, [visible, refresh]);
  const open = (note: SharedNote | 'new') => { setEditor(note); setTitle(note === 'new' ? '' : note.title); setBody(note === 'new' ? '' : note.body); setError(''); setMessage(''); };
  const save = async () => {
    if (!household || !editor || !title.trim() || !body.trim() || saving) return;
    setSaving(true); setError('');
    const result = editor === 'new'
      ? await supabase.from('shared_love_notes').insert({ household_id: household, title: title.trim(), body: body.trim() }).select().single()
      : await supabase.from('shared_love_notes').update({ title: title.trim(), body: body.trim() }).eq('id', editor.id).eq('revision', editor.revision).select().maybeSingle();
    if (result.error) setError('Could not save this note. Your changes are still here.');
    else if (!result.data) setError('This note changed on another device. Your changes are still here. Copy them, then cancel and reopen the note to see the latest version.');
    else { setEditor(null); setTitle(''); setBody(''); setMessage('Shared note saved.'); await refresh(); }
    setSaving(false);
  };
  const remove = async (note: SharedNote) => {
    if (!confirm('Delete this shared note for both of you?')) return;
    const result = await supabase.from('shared_love_notes').delete().eq('id', note.id).eq('revision', note.revision).select().maybeSingle();
    if (result.error) setError('Could not delete this note.');
    else if (!result.data) { setError('This note changed on another device. Please review it before deleting.'); await refresh(); }
    else { setNotes(current => current.filter(item => item.id !== note.id)); setMessage('Shared note deleted.'); }
  };
  return <div hidden={!visible}>
    {!editor && <button className="notes-create" disabled={!household} onClick={() => open('new')}>+ New shared note</button>}
    {editor && <form className="note-composer" onSubmit={event => { event.preventDefault(); void save(); }}>
      <label htmlFor="shared-note-title">Title</label><input id="shared-note-title" maxLength={150} value={title} onChange={event => setTitle(event.target.value)} required />
      <label htmlFor="shared-note-body">Note</label><textarea id="shared-note-body" maxLength={10000} value={body} onChange={event => setBody(event.target.value)} required />
      <div className="note-form-actions"><button className="primary" disabled={saving || !title.trim() || !body.trim()}>Save</button><button type="button" disabled={saving} onClick={() => { if (dirty && !confirm('Discard your changes?')) return; setEditor(null); setError(''); }}>Cancel</button></div>
    </form>}
    {message && <p role="status" className="note-status">{message}</p>}{error && <p role="alert">{error}</p>}
    <div className="partner-note-list">{notes.map(note => <article className="shared-note" key={note.id}><strong>{note.title}</strong><time dateTime={note.created_at}>Created {formatDate(note.created_at)}</time><time dateTime={note.updated_at}>Last edited {formatDate(note.updated_at)}</time><p>{note.body}</p><div><button disabled={!!editor} onClick={() => open(note)}>Edit</button><button disabled={!!editor} onClick={() => void remove(note)}>Delete</button></div></article>)}</div>
    {!notes.length && <p className="notes-lead">Your shared notes will appear here.</p>}
  </div>;
}
