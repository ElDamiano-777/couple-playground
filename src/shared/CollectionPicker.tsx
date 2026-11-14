import { useState } from 'react';
import { createPortal } from 'react-dom';
import { ProductIllustration, matchesProductSearch } from './ProductIllustration';
import { occasionCatalog, customCollectionCatalog } from './occasionCatalog';
import { useShoppingFavorites, type Favorite } from './useShoppingFavorites';
import type { QuickItem, SharedShoppingState, ShoppingItem } from './useSharedShopping';

type Selection = QuickItem & { category: ShoppingItem['category'] };
export default function CollectionPicker({ builtin, state, busy, error, onAdd, footer }: { footer: HTMLElement | null; builtin?: string; state: SharedShoppingState; busy: boolean; error: string; onAdd: (items: Selection[]) => Promise<boolean> }) {
  const [selected, setSelected] = useState<Selection[]>([]);
  const [expanded, setExpanded] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [favoriteCategory, setFavoriteCategory] = useState<ShoppingItem['category']>('Home');
  const [custom, setCustom] = useState('');
  const favorites = useShoppingFavorites(state.session?.user.id, state.household, favoriteCategory);
  const query = search.trim();
  const groups = builtin ? occasionCatalog[builtin] : customCollectionCatalog;
  function toggle(item: Selection) {
    setSelected(previous => previous.some(row => row.id === item.id && row.category === item.category) ? previous.filter(row => row.id !== item.id || row.category !== item.category) : [...previous, item]);
  }
  function chooseFavorite(item: Favorite) {
    const notes = [item.brand && `Brand: ${item.brand}`, item.flavor && `Flavor: ${item.flavor}`, item.size && `Size: ${item.size}`, item.quantity && `Quantity or size: ${item.quantity}`, item.notes].filter(Boolean).join(' · ');
    toggle({ id: `favorite:${item.id}`, name: item.name, notes, category: item.category, favoriteId: item.id, favoritePhoto: item.photo });
  }
  return <div className="collection-picker">
    <label className="collection-search-label" htmlFor="collection-search">Search collection products</label><input id="collection-search" type="search" placeholder="Search products…" value={search} onChange={e => setSearch(e.target.value)} />
    {groups.map(group => {
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
    {query && !groups.some(group => group.items.some(name => matchesProductSearch(name, query))) && !favorites.favorites.some(item => matchesProductSearch(item.name, query)) && <p className="occasion-empty">No matching products. Add a custom item below.</p>}
    <details className="collection-picker-extra"><summary>Favorites</summary><label htmlFor="collection-favorite-category">Shopping category</label><select id="collection-favorite-category" value={favoriteCategory} onChange={e => setFavoriteCategory(e.target.value as ShoppingItem['category'])}><option>Home</option><option>Pets</option><option>Kids</option></select>{favorites.loading ? <p>Loading favorites…</p> : favorites.favorites.filter(item => matchesProductSearch(item.name, query)).length ? <div className="collection-product-grid">{favorites.favorites.filter(item => matchesProductSearch(item.name, query)).map(item => <button type="button" key={item.id} className="collection-product-tile" aria-pressed={selected.some(row => row.id === `favorite:${item.id}`)} onClick={() => chooseFavorite(item)}><span className={`collection-product-art${item.photo ? ' has-photo' : ''}`}>{item.photo ? <img src={item.photo} alt="" /> : <ProductIllustration name={item.name} />}</span><span>{item.name}</span><span className="collection-product-state" aria-hidden="true">{selected.some(row => row.id === `favorite:${item.id}`) ? '✓' : '+'}</span></button>)}</div> : <p className="occasion-empty">No matching favorites.</p>}{favorites.error && <p role="alert">{favorites.error}</p>}</details>
    <details className="collection-picker-extra"><summary>+ Custom item</summary><label htmlFor="collection-custom">Product name</label><div className="collection-custom-row"><input id="collection-custom" maxLength={200} value={custom} onChange={e => setCustom(e.target.value)} /><button type="button" disabled={!custom.trim()} onClick={() => { const name = custom.trim(); if (name) { toggle({ id: `custom:${name.toLocaleLowerCase()}`, name, notes: '', category: 'Home' }); setCustom(''); } }}>Select</button></div></details>
    {selected.length > 0 && <details className="collection-picker-extra collection-selected-details"><summary>Selected items ({selected.length})</summary>{selected.map(item => <div className="collection-selected-detail" key={`${item.category}:${item.id}`}><label>{item.name}<input aria-label={`Details for ${item.name}`} placeholder="Quantity, size or notes" maxLength={20000} value={item.notes} onChange={event => setSelected(previous => previous.map(row => row.id === item.id && row.category === item.category ? { ...row, notes: event.target.value } : row))} /></label><button type="button" aria-label={`Remove ${item.name} from selection`} onClick={() => toggle(item)}>×</button></div>)}</details>}
    {error && <p role="alert">{error}</p>}
    {footer && createPortal(<div className="collection-picker-action"><button type="button" className="primary" disabled={!selected.length || busy || !navigator.onLine} onClick={() => { void onAdd(selected).then(ok => { if (ok) setSelected([]); }); }}>{busy ? 'Adding…' : `Add ${selected.length} ${selected.length === 1 ? 'item' : 'items'}`}</button></div>, footer)}
  </div>;
}
