import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from './client';
import type { QuickItem, ShoppingItem } from './useSharedShopping';

export type Collection = { id: string; name: string; icon: string; color: string; archived: boolean; builtin?: string };
export type CollectionItem = { id: string; collection_id: string | null; builtin_key: string | null; name: string; category: ShoppingItem['category']; notes: string; bought: boolean; favorite_id: string | null; pet_food_id: string | null };
export const occasions: Collection[] = [
  { id: 'party', builtin: 'party', name: 'Party Time', icon: '🎉', color: 'pink', archived: false },
  { id: 'daily', builtin: 'daily', name: 'Daily Groceries', icon: '🧺', color: 'mint', archived: false },
  { id: 'movie', builtin: 'movie', name: 'Movie Night', icon: '🍿', color: 'purple', archived: false },
  { id: 'weekend', builtin: 'weekend', name: 'Cozy Weekend', icon: '☕', color: 'peach', archived: false },
];
export function useShoppingCollections(userId: string | undefined, household: string | null) {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [items, setItems] = useState<CollectionItem[]>([]);
  const [photos, setPhotos] = useState<Record<string, string | null>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const scope = `${userId ?? ''}:${household ?? ''}`;
  const current = useRef(scope);
  const generation = useRef(0);
  const mutationPending = useRef(false);
  if (current.current !== scope) { current.current = scope; generation.current++; }

  const refresh = useCallback(async () => {
    if (!userId || !household) return;
    const request = ++generation.current;
    const [c, i] = await Promise.all([
      supabase.from('shopping_collections').select('*').eq('household_id', household).order('created_at'),
      supabase.from('shopping_collection_items').select('*').eq('household_id', household).order('created_at', { ascending: false }),
    ]);
    if (current.current !== scope || request !== generation.current) return;
    if (c.error || i.error) { setError('Could not load collections. Please try again.'); return; }
    setCollections(c.data as Collection[]); setItems(i.data as CollectionItem[]); setError('');
    const entries = i.data as CollectionItem[];
    const favorites = [...new Set(entries.flatMap(item => item.favorite_id ? [item.favorite_id] : []))];
    const foods = [...new Set(entries.flatMap(item => item.pet_food_id ? [item.pet_food_id] : []))];
    const [f, p] = await Promise.all([favorites.length ? supabase.from('shopping_favorites').select('id,photo').in('id', favorites) : Promise.resolve({ data: [] }), foods.length ? supabase.from('pet_food').select('id,photo').in('id', foods) : Promise.resolve({ data: [] })]);
    if (current.current !== scope || request !== generation.current) return;
    setPhotos(Object.fromEntries([...(f.data ?? []), ...(p.data ?? [])].map(row => [row.id, row.photo])));
  }, [userId, household, scope]);
  useEffect(() => { setCollections([]); setItems([]); setPhotos({}); setBusy(false); mutationPending.current = false; setError(''); if (!userId || !household) return; void refresh(); const timer = window.setInterval(() => { if (!document.hidden) void refresh(); }, 15000); window.addEventListener('focus', refresh); return () => { clearInterval(timer); window.removeEventListener('focus', refresh); }; }, [refresh, userId, household]);
  async function run(action: () => PromiseLike<{ error: unknown }>) {
    if (!household || mutationPending.current || !navigator.onLine) return false;
    mutationPending.current = true; ++generation.current; setBusy(true); setError('');
    try { const result = await action(); if (result.error) throw result.error; if (current.current !== scope) return false; await refresh(); return true; }
    catch { if (current.current === scope) setError('Could not save collection changes. Please try again.'); return false; }
    finally { if (current.current === scope) { mutationPending.current = false; setBusy(false); } }
  }
  const saveCollection = (draft: Pick<Collection, 'name' | 'icon' | 'color'>, id?: string) => run(() => id ? supabase.from('shopping_collections').update(draft).eq('id', id).eq('household_id', household!) : supabase.from('shopping_collections').insert({ ...draft, household_id: household! }));
  const archive = (collection: Collection) => run(() => supabase.from('shopping_collections').update({ archived: !collection.archived }).eq('id', collection.id).eq('household_id', household!));
  const removeCollection = (collection: Collection) => run(() => supabase.from('shopping_collections').delete().eq('id', collection.id).eq('household_id', household!));
  const addItems = (collection: Collection, selected: (QuickItem & { category: ShoppingItem['category'] })[]) => run(() => supabase.from('shopping_collection_items').insert(selected.map(item => ({ household_id: household!, collection_id: collection.builtin ? null : collection.id, builtin_key: collection.builtin ?? null, name: item.name.trim(), category: item.category, notes: item.notes.trim(), favorite_id: item.favoriteId ?? null, pet_food_id: item.petFoodId ?? null }))));
  const mark = (item: CollectionItem) => run(() => supabase.from('shopping_collection_items').update({ bought: !item.bought }).eq('id', item.id).eq('household_id', household!));
  const editItem = (item: CollectionItem, name: string, notes: string) => run(() => supabase.from('shopping_collection_items').update({ name: name.trim(), notes: notes.trim() }).eq('id', item.id).eq('household_id', household!));
  const removeItem = (item: CollectionItem) => run(() => supabase.from('shopping_collection_items').delete().eq('id', item.id).eq('household_id', household!));
  return { collections, items, photos, busy, error, refresh, saveCollection, archive, removeCollection, addItems, mark, editItem, removeItem };
}
