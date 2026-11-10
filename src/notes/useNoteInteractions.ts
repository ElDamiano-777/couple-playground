import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../shared/client';

type Reaction = { note_id: string; user_id: string; reaction: string };
export function useNoteInteractions(userId: string | undefined, household: string | null, enabled: boolean) {
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const sequence = useRef(0);
  const [loadedFor, setLoadedFor] = useState('');
  const identity = `${userId ?? ''}:${household ?? ''}`;
  const refresh = useCallback(async () => {
    if (!userId || !household || !enabled) return;
    const request = ++sequence.current;
    const [reactionResult, favoriteResult] = await Promise.all([
      supabase.from('partner_note_reactions').select('note_id,user_id,reaction'),
      supabase.from('partner_note_favorites').select('note_id').eq('user_id', userId),
    ]);
    if (request !== sequence.current) return;
    if (reactionResult.error || favoriteResult.error) { setError('Could not load reactions or favorites.'); return; }
    setReactions(reactionResult.data as Reaction[]);
    setFavorites((favoriteResult.data ?? []).map(item => item.note_id));
    setLoadedFor(identity); setError('');
  }, [userId, household, enabled, identity]);
  useEffect(() => {
    if (!enabled || !userId || !household) return;
    void refresh();
    const update = () => { if (!document.hidden) void refresh(); };
    const timer = window.setInterval(update, 15000);
    document.addEventListener('visibilitychange', update);
    return () => { sequence.current++; window.clearInterval(timer); document.removeEventListener('visibilitychange', update); };
  }, [enabled, userId, household, refresh]);
  const toggleReaction = async (noteId: string, reaction: string) => {
    if (!userId || busy) return;
    setBusy(noteId); setError('');
    const own = reactions.find(item => item.note_id === noteId && item.user_id === userId);
    const result = own?.reaction === reaction
      ? await supabase.from('partner_note_reactions').delete().eq('note_id', noteId).eq('user_id', userId)
      : own ? await supabase.from('partner_note_reactions').update({ reaction }).eq('note_id', noteId).eq('user_id', userId)
      : await supabase.from('partner_note_reactions').insert({ note_id: noteId, user_id: userId, reaction });
    if (result.error) setError('Could not save your reaction. Please try again.');
    else await refresh();
    setBusy('');
  };
  const toggleFavorite = async (noteId: string) => {
    if (!userId || busy) return;
    setBusy(noteId); setError('');
    const result = favorites.includes(noteId)
      ? await supabase.from('partner_note_favorites').delete().eq('note_id', noteId).eq('user_id', userId)
      : await supabase.from('partner_note_favorites').insert({ note_id: noteId, user_id: userId });
    if (result.error) setError('Could not save your favorite. Please try again.');
    else await refresh();
    setBusy('');
  };
  return { ready: !!userId && !!household && loadedFor === identity, reactions: loadedFor === identity ? reactions : [], favorites: loadedFor === identity ? favorites : [], busy, error, refresh, toggleReaction, toggleFavorite };
}
