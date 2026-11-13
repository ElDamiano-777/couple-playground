import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { readPhoto } from '../family/petPhoto';
import type { ShoppingItem } from './useSharedShopping';
import type { Favorite, FavoriteDraft } from './useShoppingFavorites';
import { useShoppingFavorites } from './useShoppingFavorites';
import { favoriteCatalog } from './favoriteCatalog';
import { recognizeBarcode, recognizeProduct } from './productRecognition';

type FavoritesState = ReturnType<typeof useShoppingFavorites>;
const emptyDraft = (category: ShoppingItem['category']): FavoriteDraft => ({ category, name: '', brand: '', flavor: '', size: '', quantity: '', notes: '', photo: null });

export default function ShoppingFavorites({ category, data, selectedIds, onToggle, editing, setEditing, isPoc, query, disabled }: {
  category: ShoppingItem['category']; data: FavoritesState; selectedIds: string[];
  onToggle: (item: Favorite) => void; editing: boolean; setEditing: (value: boolean) => void; isPoc: boolean; query: string; disabled: boolean;
}) {
  const [draft, setDraft] = useState<FavoriteDraft>(emptyDraft(category));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);
  const [showAll, setShowAll] = useState(false);
  useEffect(() => { setShowAll(false); }, [category]);
  const [productGroup, setProductGroup] = useState<string>(favoriteCatalog[0].title);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoError, setPhotoError] = useState('');
  const [recognition, setRecognition] = useState('');
  const [scanningBarcode, setScanningBarcode] = useState(false);
  const scannerVideo = useRef<HTMLVideoElement>(null);
  const items = data.favorites.filter(item => item.category === category && `${item.name} ${item.brand} ${item.flavor} ${item.size} ${item.quantity} ${item.notes}`.toLocaleLowerCase().includes(query));
  function start(item?: Favorite) {
    setEditingId(item?.id ?? null);
    setDraft(item ? { category: item.category, name: item.name, brand: item.brand, flavor: item.flavor ?? '', size: item.size ?? '', quantity: item.quantity, notes: item.notes, photo: item.photo } : emptyDraft(category));
    setProductGroup(favoriteCatalog[0].title); setPicking(!item);
    setPhotoError(''); setRecognition(''); setEditing(true);
  }
  async function photo(file?: File) {
    if (!file) return;
    setPhotoBusy(true); setPhotoError('');
    try {
      const value = await readPhoto(file);
      if (value.length > 1400000) throw new Error('Photo too large');
      setRecognition('Reading product information…');
      const result = await recognizeProduct(value);
      setDraft(previous => ({ ...previous, ...result.fields, photo: result.source === 'barcode' ? result.photo : value }));
      setRecognition(result.source === 'barcode'
        ? result.photo ? 'Product and product photo found from barcode. Review before saving.' : 'Product found from barcode. Add a front photo if you want one.'
        : Object.values(result.fields).some(Boolean) ? 'Visible text added. Review before saving.' : 'Could not identify product details. You can enter them yourself.');
    } catch { setPhotoError('Could not use or read that photo. You can still enter details yourself.'); }
    finally { setPhotoBusy(false); }
  }
  const scanBarcode = useCallback(async (code: string) => {
    setScanningBarcode(false); setPhotoBusy(true); setPhotoError(''); setRecognition('Finding product…');
    try {
      const result = await recognizeBarcode(code);
      if (!Object.values(result.fields).some(Boolean)) { setRecognition('No product found for this barcode. You can enter it yourself.'); return; }
      setDraft(previous => ({ ...previous, ...result.fields, photo: result.photo }));
      setPicking(false);
      setRecognition(result.photo ? 'Product and product photo found. Review before saving.' : 'Product found. Add a front photo if you want one.');
    } catch { setPhotoError('Could not look up this barcode. Try again or enter details yourself.'); }
    finally { setPhotoBusy(false); }
  }, []);
  useEffect(() => {
    if (!scanningBarcode || !scannerVideo.current) return;
    const reader = new BrowserMultiFormatReader();
    let stopped = false;
    let controls: { stop: () => void } | undefined;
    void reader.decodeFromVideoDevice(undefined, scannerVideo.current, result => {
      if (!result || stopped) return;
      stopped = true; controls?.stop(); void scanBarcode(result.getText());
    }).then(value => { controls = value; if (stopped) controls.stop(); }).catch(() => { setScanningBarcode(false); setPhotoError('Camera unavailable. Choose a barcode photo instead.'); });
    return () => { stopped = true; controls?.stop(); };
  }, [scanningBarcode, scanBarcode]);
  async function save(event: FormEvent) {
    event.preventDefault();
    if (!draft.name.trim()) return;
    if (await data.save(draft, editingId)) { setEditing(false); setShowAll(true); }
  }
  return <section className="favorites-section" aria-labelledby="favorites-title">
    <div className="favorites-header"><h3 id="favorites-title"><span aria-hidden="true">★</span> Favorites</h3>{!editing && <button type="button" className="favorite-add" disabled={data.loading || data.busy || disabled} onClick={() => start()}>+ Add favorite</button>}</div>
    {isPoc && <p className="favorite-poc">POC test space: don’t add sensitive information or private photos.</p>}
    {data.loading && <p className="favorite-hint">Loading favorites…</p>}
    {!editing && !data.loading && !items.length && <p className="favorite-hint">{query ? 'No matching favorites.' : 'Save your favorite products here.'}</p>}
    {!editing && <div className="favorites-list">{(showAll || query ? items : items.slice(0, 3)).map(item => <article className="favorite-card" key={item.id}>
      <button type="button" className="favorite-select" aria-pressed={selectedIds.includes(item.id)} disabled={data.busy || disabled || editing} onClick={() => onToggle(item)}>
        <span className="favorite-thumb">{item.photo ? <img src={item.photo} alt="" /> : <span aria-hidden="true">☆</span>}</span>
        <span className="favorite-copy"><strong>{item.name}</strong>{(item.brand || item.flavor || item.size || item.quantity) && <small>{[item.brand, item.flavor, item.size, item.quantity].filter(Boolean).join(' · ')}</small>}</span>
        <span className="favorite-indicator" aria-hidden="true">{selectedIds.includes(item.id) ? '✓' : '+'}</span>
      </button>
      <details className="food-menu favorite-menu"><summary aria-label={`Actions for favorite ${item.name}`}>⋯</summary><div className="food-menu-options">
        <button disabled={data.busy || disabled || editing} onClick={event => { event.currentTarget.closest('details')?.removeAttribute('open'); start(item); }}>Edit</button>
        <button disabled={data.busy || disabled || editing} onClick={event => { event.currentTarget.closest('details')?.removeAttribute('open'); if (window.confirm(`Remove “${item.name}” from favorites for both of you?`)) void data.remove(item); }}>Delete</button>
      </div></details>
    </article>)}</div>}
    {!editing && !query && items.length > 3 && <button type="button" className="favorite-show-all" aria-expanded={showAll} onClick={() => setShowAll(value => !value)}>{showAll ? 'Show less' : `Show all favorites (${items.length})`}</button>}
    {data.error && <p className="feedback error-message" role="alert">{data.error}</p>}
    {editing && picking && <section className="favorite-picker" aria-label="Choose a product">
      <h3>Choose a product</h3><p>Pick a category, then tap a product.</p>
      <div className="favorite-picker-groups" role="group" aria-label="Product categories">{favoriteCatalog.map(group => <button type="button" key={group.title} className="favorite-picker-group" aria-pressed={productGroup === group.title} onClick={() => setProductGroup(group.title)}>{group.title}</button>)}</div>
      <div className="favorite-picker-products" role="group" aria-label={`${productGroup} products`}>{favoriteCatalog.find(group => group.title === productGroup)?.items.map(name => <button type="button" key={name} className="favorite-picker-product" onClick={() => { setDraft(previous => ({ ...previous, name })); setPicking(false); }}>{name}</button>)}</div>
      <button type="button" className="favorite-custom" disabled={photoBusy} onClick={() => setScanningBarcode(true)}>Scan barcode</button>
      <label className="favorite-photo-action" htmlFor="favorite-photo-recognize">Choose product photo</label><input id="favorite-photo-recognize" type="file" accept="image/*" disabled={photoBusy} onChange={event => { setPicking(false); void photo(event.target.files?.[0]); }} />
      <button type="button" className="favorite-custom" onClick={() => { setDraft(previous => ({ ...previous, name: '' })); setPicking(false); }}>+ Enter a custom product</button>
      <button type="button" className="text-action" onClick={() => { if (window.confirm('Discard your unfinished favorite?')) setEditing(false); }}>Cancel</button>
    </section>}
    {editing && !picking && <form className="favorite-form" onSubmit={save}>
      <h3>{editingId ? 'Edit favorite' : 'New favorite'}</h3>
      <label htmlFor="favorite-name">Product name</label><input id="favorite-name" required maxLength={200} value={draft.name} disabled={data.busy || disabled} onChange={event => setDraft({ ...draft, name: event.target.value })} />
      {!editingId && <button type="button" className="favorite-change-product" onClick={() => setPicking(true)}>← Choose a different product</button>}
      <label htmlFor="favorite-brand">Brand (optional)</label><input id="favorite-brand" maxLength={150} value={draft.brand} disabled={data.busy || disabled} onChange={event => setDraft({ ...draft, brand: event.target.value })} />
      <label htmlFor="favorite-flavor">Flavor (optional)</label><input id="favorite-flavor" maxLength={150} value={draft.flavor} disabled={data.busy || disabled} onChange={event => setDraft({ ...draft, flavor: event.target.value })} />
      <label htmlFor="favorite-size">Size (optional)</label><input id="favorite-size" maxLength={150} value={draft.size} disabled={data.busy || disabled} onChange={event => setDraft({ ...draft, size: event.target.value })} />
      <label htmlFor="favorite-quantity">Quantity (optional)</label><input id="favorite-quantity" maxLength={150} value={draft.quantity} disabled={data.busy || disabled} onChange={event => setDraft({ ...draft, quantity: event.target.value })} />
      <label htmlFor="favorite-notes">Notes (optional)</label><textarea id="favorite-notes" rows={3} maxLength={600} value={draft.notes} disabled={data.busy || disabled} onChange={event => setDraft({ ...draft, notes: event.target.value })} />
      <label htmlFor="favorite-category">Shopping category</label><select id="favorite-category" value={draft.category} disabled={data.busy || disabled} onChange={event => setDraft({ ...draft, category: event.target.value as ShoppingItem['category'] })}><option>Home</option><option>Pets</option><option>Kids</option></select>
      <label htmlFor="favorite-photo">{draft.photo ? 'Replace product photo (optional)' : 'Product photo (optional)'}</label><input id="favorite-photo" type="file" accept="image/*" disabled={data.busy || disabled || photoBusy} onChange={event => void photo(event.target.files?.[0])} /><label className="favorite-photo-action" htmlFor="favorite-camera">Take a photo</label><input id="favorite-camera" type="file" accept="image/*" capture="environment" disabled={data.busy || disabled || photoBusy} onChange={event => void photo(event.target.files?.[0])} />
      {draft.photo && <><img className="favorite-photo-preview" src={draft.photo} alt="Product photo preview" /><button type="button" className="text-action" onClick={() => setDraft({ ...draft, photo: null })}>Remove photo</button></>}
      {photoError && <p className="error-message" role="alert">{photoError}</p>}
      {recognition && <p className="feedback" role="status">{recognition}</p>}
      <button className="primary" disabled={data.busy || disabled || photoBusy || !draft.name.trim()}>{data.busy ? 'Saving…' : 'Save favorite'}</button>
      <button type="button" className="text-action" disabled={data.busy || disabled || photoBusy} onClick={() => { if (window.confirm('Discard your unfinished favorite?')) setEditing(false); }}>Cancel</button>
    </form>}
    {scanningBarcode && <div className="barcode-scanner" role="dialog" aria-modal="true" aria-label="Scan barcode"><section><button type="button" className="text-action" onClick={() => setScanningBarcode(false)}>Close</button><h3>Scan barcode</h3><p>Point camera at barcode.</p><video ref={scannerVideo} className="barcode-video" playsInline muted /></section></div>}
  </section>;
}
