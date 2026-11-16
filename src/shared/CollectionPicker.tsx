import { useState } from 'react';
import { createPortal } from 'react-dom';
import { ProductIllustration, matchesProductSearch } from './ProductIllustration';
import { occasionCatalog, customCollectionCatalog } from './occasionCatalog';
import { useShoppingFavorites, type Favorite } from './useShoppingFavorites';
import type { QuickItem, SharedShoppingState, ShoppingItem } from './useSharedShopping';
import { emptyItemDetails, formatItemDetails, ItemDetailFields, validItemDetails } from './collectionItemDetails';

type Selection = QuickItem & { category: ShoppingItem['category'] };
export default function CollectionPicker({ builtin, state, busy, error, onAdd, footer }: { footer: HTMLElement | null; builtin?: string; state: SharedShoppingState; busy: boolean; error: string; onAdd: (items: Selection[]) => Promise<boolean> }) {
  const [selected, setSelected] = useState<Selection[]>([]);
  const [expanded, setExpanded] = useState<string[]>([]);
  const [browsing, setBrowsing] = useState(false);
  const [search, setSearch] = useState('');
  const [favoriteCategory, setFavoriteCategory] = useState<ShoppingItem['category']>('Home');
  const [custom, setCustom] = useState('');
  const [customOpen, setCustomOpen] = useState(false);
  const [customDetails, setCustomDetails] = useState(emptyItemDetails);
  const [selectedOpen, setSelectedOpen] = useState(false);
  const favorites = useShoppingFavorites(state.session?.user.id, state.household, favoriteCategory);
  const query = search.trim();
  const groups = builtin ? occasionCatalog[builtin] : customCollectionCatalog;
  function toggle(item: Selection) {
    if (!selected.some(row => row.id === item.id && row.category === item.category)) setSelectedOpen(true);
    setSelected(previous => previous.some(row => row.id === item.id && row.category === item.category) ? previous.filter(row => row.id !== item.id || row.category !== item.category) : [...previous, item]);
  }
  function chooseFavorite(item: Favorite) {
    const notes = [item.brand && `Brand: ${item.brand}`, item.flavor && `Flavor: ${item.flavor}`, item.size && `Size: ${item.size}`, item.quantity && `Quantity or size: ${item.quantity}`, item.notes].filter(Boolean).join(' · ');
    toggle({ id: `favorite:${item.id}`, name: item.name, notes, category: item.category, favoriteId: item.id, favoritePhoto: item.photo });
  }
  return <div className="collection-picker">
    <label className="collection-search-label" htmlFor="collection-search">Search collection products</label><input id="collection-search" type="search" placeholder="Search products…" value={search} onChange={e => setSearch(e.target.value)} />
    <details className="collection-picker-extra collection-custom" open={customOpen} onToggle={event => setCustomOpen(event.currentTarget.open)}><summary>+ Add custom item</summary><label htmlFor="collection-custom">Product name</label><input id="collection-custom" maxLength={200} value={custom} onChange={e => setCustom(e.target.value)} /><details className="collection-more-details"><summary>More details</summary><ItemDetailFields value={customDetails} onChange={setCustomDetails} /></details><button type="button" className="collection-custom-select" disabled={!custom.trim() || !validItemDetails(customDetails)} onClick={() => { const name = custom.trim(); if (!name) return; const item: Selection = { id: `custom:${name.toLocaleLowerCase()}`, name, notes: formatItemDetails(customDetails), category: 'Home' }; setSelected(previous => [...previous.filter(row => row.id !== item.id || row.category !== item.category), item]); setSelectedOpen(true); setCustom(''); setCustomDetails(emptyItemDetails()); setCustomOpen(false); }}>Select</button></details>
    {selected.length > 0 && <details className="collection-picker-extra collection-selected-details" open={selectedOpen} onToggle={event => setSelectedOpen(event.currentTarget.open)}><summary>Selected items ({selected.length})</summary><p className="collection-selection-hint">Selected only. Add items below to save them.</p>{selected.map(item => <div className="collection-selected-detail" key={`${item.category}:${item.id}`}><div className="collection-selected-copy"><strong>{item.name}</strong>{item.notes && <small>{item.notes}</small>}<details><summary>Edit</summary><label>Name<input aria-label={`Name for ${item.name}`} value={item.name} maxLength={200} onChange={event => setSelected(previous => previous.map(row => row.id === item.id && row.category === item.category ? { ...row, name: event.target.value } : row))} /></label><label>Details<textarea aria-label={`Details for ${item.name}`} rows={3} maxLength={20000} value={item.notes} onChange={event => setSelected(previous => previous.map(row => row.id === item.id && row.category === item.category ? { ...row, notes: event.target.value } : row))} /></label></details></div><button type="button" aria-label={`Remove ${item.name} from selection`} onClick={() => toggle(item)}>×</button></div>)}</details>}
    <details className="collection-picker-extra"><summary>Favorites</summary><label htmlFor="collection-favorite-category">Shopping category</label><select id="collection-favorite-category" value={favoriteCategory} onChange={e => setFavoriteCategory(e.target.value as ShoppingItem['category'])}><option>Home</option><option>Pets</option><option>Kids</option></select>{favorites.loading ? <p>Loading favorites…</p> : favorites.favorites.filter(item => matchesProductSearch(item.name, query)).length ? <div className="collection-product-grid">{favorites.favorites.filter(item => matchesProductSearch(item.name, query)).map(item => <button type="button" key={item.id} className="collection-product-tile" aria-pressed={selected.some(row => row.id === `favorite:${item.id}`)} onClick={() => chooseFavorite(item)}><span className={`collection-product-art${item.photo ? ' has-photo' : ''}`}>{item.photo ? <img src={item.photo} alt="" /> : <ProductIllustration name={item.name} />}</span><span>{item.name}</span><span className="collection-product-state" aria-hidden="true">{selected.some(row => row.id === `favorite:${item.id}`) ? '✓' : '+'}</span></button>)}</div> : <p className="occasion-empty">No matching favorites.</p>}{favorites.error && <p role="alert">{favorites.error}</p>}</details>
    <button type="button" className="collection-browse-toggle" aria-expanded={browsing} onClick={() => setBrowsing(!browsing)}>Browse categories <span aria-hidden="true">{browsing ? '⌃' : '⌄'}</span></button>
    {(browsing || !!query) && groups.map(group => {
      const matches = query ? group.items.filter(name => matchesProductSearch(name, query)) : group.items;
      if (query && !matches.length) return null;
      const open = !!query || expanded.includes(group.title);
      return <section className="collection-picker-group" key={group.title}>
        <button type="button" className="collection-group-toggle" aria-expanded={open} onClick={() => setExpanded(previous => open && !query ? previous.filter(value => value !== group.title) : [...previous, group.title])}><span className="collection-group-icon"><ProductIllustration name={group.items[0]} /></span><span>{group.title}</span><span aria-hidden="true">{open ? '⌃' : '⌄'}</span></button>
        {open && <div className="collection-product-grid">{matches.map(name => {
          const item: Selection = { id: `catalog:${name}`, name, category: group.category, notes: '' };
          const chosen = selected.some(row => row.id === item.id && row.category === item.category);
          return <button type="button" className="collection-product-tile" aria-pressed={chosen} key={name} onClick={() => toggle(item)}><span className="collection-product-art"><ProductIllustration name={name} /></span><span>{name}</span><span className="collection-product-state" aria-hidden="true">{chosen ? '✓' : '+'}</span></button>;
        })}</div>}
      </section>;
    })}
    {query && !groups.some(group => group.items.some(name => matchesProductSearch(name, query))) && !favorites.favorites.some(item => matchesProductSearch(item.name, query)) && <p className="occasion-empty">No matching products. Add a custom item above.</p>}
    {error && <p role="alert">{error}</p>}
    {footer && createPortal(<div className="collection-picker-action"><button type="button" className="primary" disabled={!selected.length || selected.some(item => !item.name.trim()) || busy || !navigator.onLine} onClick={() => { void onAdd(selected).then(ok => { if (ok) setSelected([]); }); }}>{busy ? 'Adding…' : `Add ${selected.length} ${selected.length === 1 ? 'item' : 'items'}`}</button></div>, footer)}
  </div>;
}
