import { useEffect, useRef, useState } from 'react';
import { supabase } from './client';
import type { ShoppingItem } from './useSharedShopping';

export type Favorite = { id: string; household_id: string; category: ShoppingItem['category']; name: string; brand: string; quantity: string; notes: string; photo: string | null };
export type FavoriteDraft = Pick<Favorite, 'category' | 'name' | 'brand' | 'quantity' | 'notes' | 'photo'>;

export function useShoppingFavorites(userId: string | undefined, household: string | null, category: ShoppingItem['category']) {
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const scope = `${userId ?? ''}:${household ?? ''}:${category}`;
  const loadedScope = useRef(scope);
  const current = useRef(scope);
  const version = useRef(0);
  if (current.current !== scope) { current.current = scope; ++version.current; }
  useEffect(() => {
    let active = true;
    loadedScope.current = scope;
    setFavorites([]); setError(''); setBusy(false); setLoading(true);
    if (!userId || !household) { setLoading(false); return; }
    const load = async () => {
      const request = ++version.current;
      const result = await supabase.from('shopping_favorites').select('*').eq('household_id', household).eq('category', category).order('created_at');
      if (!active || current.current !== scope || request !== version.current) return;
      if (result.error) setError('Could not load favorites. Check your connection.');
      else { setFavorites(result.data as Favorite[]); setError(''); }
      setLoading(false);
    };
    void load();
    const refresh = () => { if (!document.hidden) void load(); };
    const timer = window.setInterval(refresh, 15000);
    window.addEventListener('focus', refresh);
    return () => { active = false; ++version.current; clearInterval(timer); window.removeEventListener('focus', refresh); };
  }, [scope, userId, household, category]);
  async function save(draft: FavoriteDraft, id: string | null) {
    if (!household || !userId || busy || !navigator.onLine) { setError('Connect to save your favorite.'); return false; }
    ++version.current; setBusy(true); setError('');
    const values = { ...draft, name: draft.name.trim(), brand: draft.brand.trim(), quantity: draft.quantity.trim(), notes: draft.notes.trim() };
    const query = id ? supabase.from('shopping_favorites').update(values).eq('id', id).eq('household_id', household)
      : supabase.from('shopping_favorites').insert({ ...values, household_id: household });
    const result = await query.select().single();
    if (current.current !== scope) return false;
    if (result.error || !result.data) { setError('Could not save your favorite. Your changes are still here.'); setBusy(false); return false; }
    ++version.current;
    setFavorites(previous => [...previous.filter(row => row.id !== result.data.id), result.data as Favorite]);
    setBusy(false); return true;
  }
  async function remove(item: Favorite) {
    if (!household || busy || !navigator.onLine) { setError('Connect to remove your favorite.'); return; }
    ++version.current; setBusy(true); setError('');
    const result = await supabase.from('shopping_favorites').delete().eq('id', item.id).eq('household_id', household).select('id').single();
    if (current.current !== scope) return;
    if (result.error || !result.data) setError('Could not remove your favorite. Please try again.');
    else { ++version.current; setFavorites(previous => previous.filter(row => row.id !== item.id)); }
    setBusy(false);
  }
  const sameScope = loadedScope.current === scope;
  return { favorites: sameScope ? favorites : [], loading: !sameScope || loading, busy: sameScope && busy, error: sameScope ? error : '', save, remove };
}
