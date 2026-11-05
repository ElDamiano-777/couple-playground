import { useEffect, useMemo, useState } from 'react';
import type { FolderEntriesState } from '../collections/useFolderEntries';
import type { SharedShoppingState } from '../shared/useSharedShopping';
import { supabase } from '../shared/client';
import type { Note } from '../storage';
import type { HouseholdTasksState } from '../tasks/useHouseholdTasks';
import './search.css';

type SearchHit = { kind: string; title: string; detail: string };

export default function GlobalSearch({ shopping, collections, tasks, localNotes, onClose }: {
  shopping: SharedShoppingState;
  collections: FolderEntriesState;
  tasks: HouseholdTasksState;
  localNotes: Note[];
  onClose: () => void;
}) {
  const [query, setQuery] = useState('');
  const [favorites, setFavorites] = useState<any[]>([]);
  const [partnerNotes, setPartnerNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!shopping.session || !shopping.household) return;
    setLoading(true);
    void Promise.all([
      supabase.from('shopping_favorites').select('name,brand,flavor,category').eq('household_id', shopping.household),
      supabase.from('partner_notes').select('body,sender,created_at').eq('household_id', shopping.household),
    ]).then(([favoritesResult, notesResult]) => {
      setFavorites(favoritesResult.data ?? []);
      setPartnerNotes(notesResult.data ?? []);
      setLoading(false);
    });
  }, [shopping.household, shopping.session]);

  const hits = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    if (!normalized) return [] as SearchHit[];
    const all: SearchHit[] = [
      ...collections.entries.filter(entry => entry.kind === 'recipe').map(entry => ({ kind: 'Recipe', title: entry.title, detail: [entry.recipe_category, entry.recipe_ingredients, entry.notes].filter(Boolean).join(' · ') })),
      ...shopping.items.map(item => ({ kind: 'Shopping', title: item.name, detail: [item.category, item.notes].filter(Boolean).join(' · ') })),
      ...favorites.map(item => ({ kind: 'Favorite', title: item.name, detail: [item.brand, item.flavor, item.category].filter(Boolean).join(' · ') })),
      ...tasks.items.map(task => ({ kind: 'Task', title: task.title, detail: [task.assignee, task.due_date, task.priority].filter(Boolean).join(' · ') })),
      ...partnerNotes.map(note => ({ kind: 'Partner note', title: note.sender === 'masha' ? 'Masha' : 'Damian', detail: note.body })),
      ...localNotes.map(note => ({ kind: 'Personal note', title: 'Personal note', detail: note.text })),
    ];
    return all.filter(hit => `${hit.title} ${hit.detail}`.toLocaleLowerCase().includes(normalized)).slice(0, 60);
  }, [collections.entries, favorites, localNotes, partnerNotes, query, shopping.items, tasks.items]);

  return <section className="search-page">
    <button className="text-action" onClick={onClose}>← Back</button>
    <p className="eyebrow">YOUR SHARED SPACE</p>
    <h1>Search<span>.</span></h1>
    <label>Search recipes, Shopping, favorites, tasks and notes
      <input autoFocus value={query} onChange={event => setQuery(event.target.value)} placeholder="Try pasta, milk or laundry" />
    </label>
    {loading && <p role="status">Loading search…</p>}
    {query && !loading && <div className="search-results">{hits.length
      ? hits.map((hit, index) => <article key={`${hit.kind}:${hit.title}:${index}`}><small>{hit.kind}</small><strong>{hit.title}</strong>{hit.detail && <p>{hit.detail}</p>}</article>)
      : <p>No matches in content you can access.</p>}
    </div>}
  </section>;
}
