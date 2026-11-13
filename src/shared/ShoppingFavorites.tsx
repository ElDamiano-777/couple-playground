import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { readPhoto } from '../family/petPhoto';
import type { ShoppingItem } from './useSharedShopping';
import type { Favorite, FavoriteDraft } from './useShoppingFavorites';
import { useShoppingFavorites } from './useShoppingFavorites';
import { ProductIllustration, matchesProductSearch } from './ProductIllustration';
import { recognizeBarcode, recognizeProduct } from './productRecognition';

type FavoritesState = ReturnType<typeof useShoppingFavorites>;
const emptyDraft = (category: ShoppingItem['category']): FavoriteDraft => ({ category, name: '', brand: '', flavor: '', size: '', quantity: '', notes: '', photo: null });

export default function ShoppingFavorites({ category, data, selectedIds, onToggle, editing, setEditing, isPoc, query, disabled, favoriteSeed, onSeedHandled }: {
  favoriteSeed: { name: string; id: number } | null; onSeedHandled: () => void;
  category: ShoppingItem['category']; data: FavoritesState; selectedIds: string[];
  onToggle: (item: Favorite) => void; editing: boolean; setEditing: (value: boolean) => void; isPoc: boolean; query: string; disabled: boolean;
}) {
  const [draft, setDraft] = useState<FavoriteDraft>(emptyDraft(category));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  useEffect(() => { setShowAll(false); }, [category]);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoError, setPhotoError] = useState('');
  const [recognition, setRecognition] = useState('');
  const [scanningBarcode, setScanningBarcode] = useState(false);
  const scannerVideo = useRef<HTMLVideoElement>(null);
  const items = data.favorites.filter(item => item.category === category && (`${item.name} ${item.brand} ${item.flavor} ${item.size} ${item.quantity} ${item.notes}`.toLocaleLowerCase().includes(query) || matchesProductSearch(item.name, query)));
  function start(item?: Favorite) {
    setEditingId(item?.id ?? null);
    setDraft(item ? { category: item.category, name: item.name, brand: item.brand, flavor: item.flavor ?? '', size: item.size ?? '', quantity: item.quantity, notes: item.notes, photo: item.photo } : emptyDraft(category));

    setNotesOpen(!!(item?.brand || item?.flavor || item?.size || item?.quantity || item?.notes)); setPhotoError(''); setRecognition(''); setEditing(true);
  }
  useEffect(() => {
    if (!favoriteSeed) return;
    setEditingId(null); setDraft({ ...emptyDraft(category), name: favoriteSeed.name });
    setNotesOpen(false); setPhotoError(''); setRecognition(''); setEditing(true); onSeedHandled();
  }, [favoriteSeed, category, onSeedHandled, setEditing]);
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
    <div className="favorites-header"><h3 id="favorites-title"><span aria-hidden="true">★</span> Favorites</h3>{!editing && <div className="favorite-header-actions"><button type="button" className="favorite-header-tool" aria-label="Scan barcode" disabled={data.loading || data.busy || disabled} onClick={() => { start(); setScanningBarcode(true); }}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4v16m3-16v16m3-16v16m3-16v16m4-16v16m3-16v16" /></svg></button><label className="favorite-header-tool" htmlFor="quick-favorite-photo" aria-label="Choose product photo"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8h4l2-3h4l2 3h4v11H4z"/><circle cx="12" cy="13" r="3"/></svg></label><input id="quick-favorite-photo" className="favorite-header-input" type="file" accept="image/*" disabled={data.loading || data.busy || disabled} onChange={event => { const file = event.target.files?.[0]; if (file) { start(); void photo(file); } }} /><button type="button" className="favorite-add" disabled={data.loading || data.busy || disabled} onClick={() => start()}>+ Add favorite</button></div>}</div>
    {isPoc && <p className="favorite-poc">POC test space: don’t add sensitive information or private photos.</p>}
    {data.loading && <p className="favorite-hint">Loading favorites…</p>}
    {!editing && !data.loading && !items.length && <p className="favorite-hint">{query ? 'No matching favorites.' : 'Save your favorite products here.'}</p>}
    {!editing && <div className="favorites-list">{(showAll || query ? items : items.slice(0, 2)).map(item => <article className="favorite-card" key={item.id}>
      <button type="button" className="favorite-select" aria-pressed={selectedIds.includes(item.id)} disabled={data.busy || disabled || editing} onClick={() => onToggle(item)}>
        <span className="favorite-thumb">{item.photo ? <img src={item.photo} alt="" /> : <ProductIllustration name={item.name} />}</span>
        <span className="favorite-copy"><strong>{item.name}</strong>{(item.brand || item.flavor || item.size || item.quantity) && <small>{[item.brand, item.flavor, item.size, item.quantity].filter(Boolean).join(' · ')}</small>}</span>
        <span className="favorite-indicator" aria-hidden="true">{selectedIds.includes(item.id) ? '✓' : '+'}</span>
      </button>
      <details className="food-menu favorite-menu"><summary aria-label={`Actions for favorite ${item.name}`}>⋯</summary><div className="food-menu-options">
        <button disabled={data.busy || disabled || editing} onClick={event => { event.currentTarget.closest('details')?.removeAttribute('open'); start(item); }}>Edit</button>
        <button disabled={data.busy || disabled || editing} onClick={event => { event.currentTarget.closest('details')?.removeAttribute('open'); if (window.confirm(`Remove “${item.name}” from favorites for both of you?`)) void data.remove(item); }}>Delete</button>
      </div></details>
    </article>)}</div>}
    {!editing && !query && items.length > 2 && <button type="button" className="favorite-show-all" aria-expanded={showAll} onClick={() => setShowAll(value => !value)}>{showAll ? 'Show less' : `Show all favorites (${items.length})`}</button>}
    {data.error && <p className="feedback error-message" role="alert">{data.error}</p>}
    {editing && <form className="favorite-form favorite-editor" onSubmit={save}>
      <div className="favorite-editor-heading"><h3>{editingId ? 'Edit favorite' : 'New favorite'}</h3><button type="button" className="favorite-scan" disabled={photoBusy || data.busy || disabled} onClick={() => { setPhotoError(''); setScanningBarcode(true); }}>Scan barcode</button></div>
      <div className="favorite-editor-identity"><div className="favorite-editor-photo">{draft.photo ? <img src={draft.photo} alt="Product photo preview" /> : <ProductIllustration name={draft.name} />}</div><div className="favorite-editor-name"><label htmlFor="favorite-name">Product name</label><input id="favorite-name" required maxLength={200} value={draft.name} disabled={data.busy || disabled} placeholder="What is it called?" onChange={event => setDraft({ ...draft, name: event.target.value })} /></div></div>
      <div className="favorite-photo-controls"><input className="favorite-photo-input" id="favorite-photo" type="file" accept="image/*" aria-label="Product photo (optional)" disabled={data.busy || disabled || photoBusy} onChange={event => { const file = event.target.files?.[0]; event.target.value = ''; void photo(file); }} /><label htmlFor="favorite-photo" aria-disabled={data.busy || disabled || photoBusy}>Choose photo</label><input className="favorite-photo-input" id="favorite-camera" type="file" accept="image/*" capture="environment" aria-label="Take a photo" disabled={data.busy || disabled || photoBusy} onChange={event => { const file = event.target.files?.[0]; event.target.value = ''; void photo(file); }} /><label htmlFor="favorite-camera" aria-disabled={data.busy || disabled || photoBusy}>Take a photo</label>{draft.photo && <button type="button" disabled={photoBusy || data.busy || disabled} onClick={() => setDraft({ ...draft, photo: null })}>Remove photo</button>}</div>
      {photoBusy && <p className="favorite-inline-message" role="status">Processing photo…</p>}{photoError && <p className="favorite-inline-message favorite-inline-error" role="alert">{photoError}</p>}{recognition && !photoBusy && <p className="favorite-inline-message" role="status">{recognition}</p>}
      <div className="favorite-editor-category"><label htmlFor="favorite-category">Shopping category</label><select id="favorite-category" value={draft.category} disabled={data.busy || disabled} onChange={event => setDraft({ ...draft, category: event.target.value as ShoppingItem['category'] })}><option>Home</option><option>Pets</option><option>Kids</option></select></div>
      <details className="favorite-more-details" open={notesOpen} onToggle={event => setNotesOpen(event.currentTarget.open)}><summary>More details <span>Optional</span></summary><div className="favorite-editor-grid"><div><label htmlFor="favorite-brand">Brand</label><input aria-label="Brand (optional)" id="favorite-brand" maxLength={150} value={draft.brand} disabled={data.busy || disabled} onChange={event => setDraft({ ...draft, brand: event.target.value })} /></div><div><label htmlFor="favorite-flavor">Flavor</label><input aria-label="Flavor (optional)" id="favorite-flavor" maxLength={150} value={draft.flavor} disabled={data.busy || disabled} onChange={event => setDraft({ ...draft, flavor: event.target.value })} /></div><div><label htmlFor="favorite-size">Size</label><input aria-label="Size (optional)" id="favorite-size" maxLength={150} value={draft.size} disabled={data.busy || disabled} onChange={event => setDraft({ ...draft, size: event.target.value })} /></div><div><label htmlFor="favorite-quantity">Quantity</label><input aria-label="Quantity (optional)" id="favorite-quantity" maxLength={150} value={draft.quantity} disabled={data.busy || disabled} onChange={event => setDraft({ ...draft, quantity: event.target.value })} /></div></div><label htmlFor="favorite-notes">Notes (optional)</label><textarea id="favorite-notes" rows={3} maxLength={600} value={draft.notes} disabled={data.busy || disabled} onChange={event => setDraft({ ...draft, notes: event.target.value })} /></details>
      <div className="favorite-editor-actions"><button className="primary favorite-save" disabled={data.busy || disabled || photoBusy || !draft.name.trim()}>{data.busy ? 'Saving…' : 'Save favorite'}</button><button type="button" className="favorite-cancel" disabled={data.busy || disabled || photoBusy} onClick={() => { if (window.confirm('Discard your unfinished favorite?')) setEditing(false); }}>Cancel</button></div>
    </form>}
    {scanningBarcode && <div className="barcode-scanner" role="dialog" aria-modal="true" aria-label="Scan barcode"><section><button type="button" className="text-action" onClick={() => setScanningBarcode(false)}>Close</button><h3>Scan barcode</h3><p>Point camera at barcode.</p><video ref={scannerVideo} className="barcode-video" playsInline muted /></section></div>}
  </section>;
}
