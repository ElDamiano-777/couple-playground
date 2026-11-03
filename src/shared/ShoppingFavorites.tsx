import { useState, type FormEvent } from 'react';
import { readPhoto } from '../family/petPhoto';
import type { ShoppingItem } from './useSharedShopping';
import type { Favorite, FavoriteDraft } from './useShoppingFavorites';
import { useShoppingFavorites } from './useShoppingFavorites';

type FavoritesState = ReturnType<typeof useShoppingFavorites>;
const emptyDraft = (category: ShoppingItem['category']): FavoriteDraft => ({ category, name: '', brand: '', quantity: '', notes: '', photo: null });

export default function ShoppingFavorites({ category, data, selectedIds, onToggle, editing, setEditing, isPoc, query, disabled }: {
  category: ShoppingItem['category']; data: FavoritesState; selectedIds: string[];
  onToggle: (item: Favorite) => void; editing: boolean; setEditing: (value: boolean) => void; isPoc: boolean; query: string; disabled: boolean;
}) {
  const [draft, setDraft] = useState<FavoriteDraft>(emptyDraft(category));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoError, setPhotoError] = useState('');
  const items = data.favorites.filter(item => item.category === category && `${item.name} ${item.brand}`.toLocaleLowerCase().includes(query));
  function start(item?: Favorite) {
    setEditingId(item?.id ?? null);
    setDraft(item ? { category: item.category, name: item.name, brand: item.brand, quantity: item.quantity, notes: item.notes, photo: item.photo } : emptyDraft(category));
    setPhotoError(''); setEditing(true);
  }
  async function photo(file?: File) {
    if (!file) return;
    setPhotoBusy(true); setPhotoError('');
    try {
      const value = await readPhoto(file);
      if (value.length > 1400000) throw new Error('Photo too large');
      setDraft(previous => ({ ...previous, photo: value }));
    } catch { setPhotoError('Could not use that photo. Try a different image.'); }
    finally { setPhotoBusy(false); }
  }
  async function save(event: FormEvent) {
    event.preventDefault();
    if (!draft.name.trim()) return;
    if (await data.save(draft, editingId)) setEditing(false);
  }
  return <section className="favorites-section" aria-labelledby="favorites-title">
    <div className="favorites-header"><h3 id="favorites-title">⭐ Favorites</h3>{!editing && <button type="button" className="favorite-add" disabled={data.loading || data.busy || disabled} onClick={() => start()}>+ Add favorite</button>}</div>
    {isPoc && <p className="favorite-poc">POC test space: don’t add sensitive information or private photos.</p>}
    {data.loading && <p className="favorite-hint">Loading favorites…</p>}
    {!data.loading && !items.length && <p className="favorite-hint">{query ? 'No matching favorites.' : 'Save your favorite products here.'}</p>}
    <div className="favorites-list">{items.map(item => <article className="favorite-card" key={item.id}>
      <button type="button" className="favorite-select" aria-pressed={selectedIds.includes(item.id)} disabled={data.busy || disabled || editing} onClick={() => onToggle(item)}>
        <span className="favorite-thumb">{item.photo ? <img src={item.photo} alt="" /> : <span aria-hidden="true">☆</span>}</span>
        <span className="favorite-copy"><strong>{item.name}</strong>{(item.brand || item.quantity) && <small>{[item.brand, item.quantity].filter(Boolean).join(' · ')}</small>}</span>
        <span aria-hidden="true">{selectedIds.includes(item.id) ? '✓' : '+'}</span>
      </button>
      <details className="food-menu favorite-menu"><summary aria-label={`Actions for favorite ${item.name}`}>⋯</summary><div className="food-menu-options">
        <button disabled={data.busy || disabled || editing} onClick={event => { event.currentTarget.closest('details')?.removeAttribute('open'); start(item); }}>Edit</button>
        <button disabled={data.busy || disabled || editing} onClick={event => { event.currentTarget.closest('details')?.removeAttribute('open'); if (window.confirm(`Remove “${item.name}” from favorites for both of you?`)) void data.remove(item); }}>Delete</button>
      </div></details>
    </article>)}</div>
    {data.error && <p className="feedback error-message" role="alert">{data.error}</p>}
    {editing && <form className="favorite-form" onSubmit={save}>
      <h3>{editingId ? 'Edit favorite' : 'New favorite'}</h3>
      <label htmlFor="favorite-name">Product name</label><input id="favorite-name" required maxLength={200} value={draft.name} disabled={data.busy || disabled} onChange={event => setDraft({ ...draft, name: event.target.value })} />
      <label htmlFor="favorite-brand">Brand (optional)</label><input id="favorite-brand" maxLength={150} value={draft.brand} disabled={data.busy || disabled} onChange={event => setDraft({ ...draft, brand: event.target.value })} />
      <label htmlFor="favorite-quantity">Quantity or size (optional)</label><input id="favorite-quantity" maxLength={150} value={draft.quantity} disabled={data.busy || disabled} onChange={event => setDraft({ ...draft, quantity: event.target.value })} />
      <label htmlFor="favorite-notes">Notes (optional)</label><textarea id="favorite-notes" rows={3} maxLength={600} value={draft.notes} disabled={data.busy || disabled} onChange={event => setDraft({ ...draft, notes: event.target.value })} />
      <label htmlFor="favorite-category">Shopping category</label><select id="favorite-category" value={draft.category} disabled={data.busy || disabled} onChange={event => setDraft({ ...draft, category: event.target.value as ShoppingItem['category'] })}><option>Home</option><option>Pets</option><option>Kids</option></select>
      <label htmlFor="favorite-photo">Product photo (optional)</label><input id="favorite-photo" type="file" accept="image/*" disabled={data.busy || disabled || photoBusy} onChange={event => void photo(event.target.files?.[0])} />
      {draft.photo && <><img className="favorite-photo-preview" src={draft.photo} alt="Product photo preview" /><button type="button" className="text-action" onClick={() => setDraft({ ...draft, photo: null })}>Remove photo</button></>}
      {photoError && <p className="error-message" role="alert">{photoError}</p>}
      <button className="primary" disabled={data.busy || disabled || photoBusy || !draft.name.trim()}>{data.busy ? 'Saving…' : 'Save favorite'}</button>
      <button type="button" className="text-action" disabled={data.busy || disabled || photoBusy} onClick={() => { if (window.confirm('Discard your unfinished favorite?')) setEditing(false); }}>Cancel</button>
    </form>}
  </section>;
}
