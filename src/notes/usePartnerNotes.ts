import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../shared/client';

export type Note = { id: string; household_id: string; sender: 'masha' | 'damian'; body: string; created_by: string; created_at: string; updated_at: string; deliver_at: string | null; photo_count: number };
export type PrivateNote = Omit<Note, 'body'> & { body: string | null; opened: boolean };
export function usePartnerNotes(userId: string | undefined, household: string | null, enabled: boolean) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [reads, setReads] = useState<string[]>([]);
  const [statuses, setStatuses] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const generation = useRef(0);
  const [loadedFor, setLoadedFor] = useState('');
  const identity = `${userId ?? ''}:${household ?? ''}`;
  const refresh = useCallback(async () => {
    if (!userId || !household || !enabled) return;
    const requestGeneration = generation.current;
    const notesResult = await supabase.rpc('list_private_partner_notes');
    if (requestGeneration !== generation.current) return;
    if (notesResult.error) { setError('Could not load notes.'); return; }
    const rows = (notesResult.data ?? []) as PrivateNote[];
    setLoadedFor(identity);
    setNotes(rows.map(row => ({ ...row, body: row.body ?? '' })));
    setReads(rows.filter(row => row.opened).map(row => row.id));
    setError('');
    if (rows.some(note => note.created_by === userId && note.deliver_at)) {
      const result = await supabase.rpc('scheduled_love_note_status');
      if (requestGeneration !== generation.current) return;
      setStatuses(result.error ? {} : Object.fromEntries((result.data ?? []).map((row: { note_id: string; status: string }) => [row.note_id, row.status])));
    } else setStatuses({});
  }, [userId, household, enabled, identity]);
  useEffect(() => {
    if (!userId || !household) { setNotes([]); setReads([]); return; }
    if (!enabled) return;
    void refresh();
    const update = () => { if (!document.hidden) void refresh(); };
    const timer = window.setInterval(update, 15000);
    document.addEventListener('visibilitychange', update);
    return () => { generation.current++; window.clearInterval(timer); document.removeEventListener('visibilitychange', update); };
  }, [userId, household, enabled, refresh]);
  const markRead = async (note: Note) => {
    if (!userId || note.created_by === userId || reads.includes(note.id)) return;
    const result = await supabase.from('partner_note_reads').insert({ note_id: note.id, user_id: userId });
    if (result.error && result.error.code !== '23505') { setError('Could not open this note. Please try again.'); return; }
    const requestGeneration = ++generation.current;
    const opened = await supabase.rpc('list_private_partner_notes');
    if (requestGeneration !== generation.current) return;
    const revealed = (opened.data as PrivateNote[] | null)?.find(row => row.id === note.id && row.opened);
    if (opened.error || !revealed || revealed.body === null) { setError('Could not open this note. Please try again.'); return; }
    const body = revealed.body;
    setNotes(current => current.map(item => item.id === note.id ? { ...item, body } : item));
    setReads(current => [...new Set([...current, note.id])]);
    setError('');
  };
  const visibleNotes = loadedFor === identity ? notes : [];
  const visibleReads = loadedFor === identity ? reads : [];
  return { notes: visibleNotes, reads: visibleReads, statuses: loadedFor === identity ? statuses : {}, refresh, error, setError, setNotes, markRead, unread: visibleNotes.filter(note => note.created_by !== userId && !visibleReads.includes(note.id)).length };
}
export type PartnerNotesState = ReturnType<typeof usePartnerNotes>;
