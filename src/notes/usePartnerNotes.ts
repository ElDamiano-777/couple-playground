import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../shared/client';

export type Note = { id: string; household_id: string; sender: 'masha' | 'damian'; body: string; created_by: string; created_at: string; deliver_at: string | null };
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
    const [notesResult, readsResult] = await Promise.all([
      supabase.from('partner_notes').select('*').eq('household_id', household).order('created_at', { ascending: false }),
      supabase.from('partner_note_reads').select('note_id').eq('user_id', userId),
    ]);
    if (requestGeneration !== generation.current) return;
    if (notesResult.error || readsResult.error) { setError('Could not load notes.'); return; }
    setLoadedFor(identity);
    setNotes(notesResult.data as Note[]);
    setReads((readsResult.data ?? []).map(row => row.note_id));
    setError('');
    if (notesResult.data.some(note => note.created_by === userId && note.deliver_at)) {
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
    setReads(current => [...new Set([...current, note.id])]);
    setError('');
  };
  const visibleNotes = loadedFor === identity ? notes : [];
  const visibleReads = loadedFor === identity ? reads : [];
  return { notes: visibleNotes, reads: visibleReads, statuses: loadedFor === identity ? statuses : {}, refresh, error, setError, setNotes, markRead, unread: visibleNotes.filter(note => note.created_by !== userId && !visibleReads.includes(note.id)).length };
}
export type PartnerNotesState = ReturnType<typeof usePartnerNotes>;
