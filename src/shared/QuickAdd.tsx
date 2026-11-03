import { useState } from 'react';
import type { ShoppingItem, SharedShoppingState } from './useSharedShopping';
import ShoppingFavorites from './ShoppingFavorites';
import { useShoppingFavorites, type Favorite } from './useShoppingFavorites';

const catalog: Record<ShoppingItem['category'], { title: string; items: string[] }[]> = {
  Home: [
    { title: 'Food', items: ['Eggs', 'Milk', 'Bread', 'Chicken', 'Meat', 'Vegetables', 'Fruit', 'Cheese', 'Rice', 'Pasta'] },
    { title: 'Cleaning', items: ['Dish soap', 'Laundry detergent', 'All-purpose cleaner', 'Sponges', 'Trash bags'] },
    { title: 'Bathroom & care', items: ['Toilet paper', 'Hand soap', 'Shampoo', 'Toothpaste', 'Deodorant'] },
    { title: 'Everyday essentials', items: ['Paper towels', 'Batteries', 'Coffee', 'Tea'] },
  ],
  Pets: [
    { title: 'Food & treats', items: ['Dry food', 'Wet food', 'Treats'] },
    { title: 'Care & supplies', items: ['Cat litter', 'Toys', 'Grooming supplies', 'Pet care products'] },
  ],
  Kids: [
    { title: 'Essentials', items: ['Diapers', 'Wipes', 'Baby food', 'Clothes'] },
    { title: 'Play & care', items: ['Toys', 'Shampoo', 'Hygiene products', 'Care products'] },
  ],
};

export default function QuickAdd({ category, state, onClose }: { category: ShoppingItem['category']; state: SharedShoppingState; onClose: () => void }) {
  const [search, setSearch] = useState('');
  const [favoriteEditing, setFavoriteEditing] = useState(false);
  const favorites = useShoppingFavorites(state.session?.user.id, state.household, category);
  const [expanded, setExpanded] = useState<string[]>([catalog[category][0].title]);
  const query = search.trim().toLocaleLowerCase();
  const groups = catalog[category].map(group => ({ ...group, items: group.items.filter(name => name.toLocaleLowerCase().includes(query)) })).filter(group => group.items.length > 0);
  const selected = state.quickItems[category];
  const custom = state.quickCustom[category];
  const setSelected = (items: typeof selected) => state.setQuickItems(category, items);
  function toggle(name: string) {
    const id = `catalog:${name}`;
    const existing = selected.find(item => item.id === id);
    setSelected(existing ? selected.filter(item => item.id !== id) : [...selected, { id, name, notes: '' }]);
  }
  function toggleFavorite(item: Favorite) {
    const id = `favorite:${item.id}`;
    const existing = selected.find(row => row.id === id);
    const notes = [item.brand && `Brand: ${item.brand}`, item.flavor && `Flavor: ${item.flavor}`, item.size && `Size: ${item.size}`, item.quantity && `Quantity or size: ${item.quantity}`, item.notes].filter(Boolean).join(' · ');
    setSelected(existing ? selected.filter(row => row.id !== id) : [...selected, { id, name: item.name, notes }]);
  }
  function addCustom() {
    const name = custom.trim();
    if (!name) return;
    setSelected([...selected, { id: crypto.randomUUID(), name, notes: '' }]);
    state.setQuickCustom(category, '');
  }
  return <section className="quick-add" aria-label={`${category} Quick Add`}>
    <div className="quick-heading"><div><h2>Quick Add</h2><p>Choose items for {category}.</p></div><button className="quick-close" disabled={state.busy || favorites.busy} onClick={() => { if (!favoriteEditing || window.confirm('Discard your unfinished favorite?')) onClose(); }}>Close</button></div>
    <div className="quick-content">
    <label className="quick-search-label" htmlFor="quick-search">Search products</label>
    <input id="quick-search" className="quick-search" type="search" placeholder="Search products" value={search} onChange={event => setSearch(event.target.value)} />
    <ShoppingFavorites category={category} data={favorites} selectedIds={selected.filter(item => item.id.startsWith('favorite:')).map(item => item.id.slice(9))} onToggle={toggleFavorite} editing={favoriteEditing} setEditing={setFavoriteEditing} isPoc={state.isPoc} query={query} disabled={state.busy} />
    {query && groups.length === 0 && !favorites.favorites.some(item => item.category === category && `${item.name} ${item.brand}`.toLocaleLowerCase().includes(query)) && <p className="quick-no-results" role="status">No products found. You can add a custom product below.</p>}
    {groups.map(group => {
      const open = !!query || expanded.includes(group.title);
      return <div className="quick-group" key={group.title}><h3><button type="button" className="quick-group-toggle" aria-expanded={open} onClick={() => setExpanded(previous => previous.includes(group.title) ? previous.filter(title => title !== group.title) : [...previous, group.title])}><span>{group.title}</span><span className={`quick-chevron ${open ? 'is-open' : ''}`} aria-hidden="true">⌄</span></button></h3>{open && <div className="quick-tiles">{group.items.map(name => <button key={name} type="button" className="quick-tile" aria-pressed={selected.some(item => item.id === `catalog:${name}`)} disabled={state.busy} onClick={() => toggle(name)}>{name}</button>)}</div>}</div>;
    })}
    <div className="quick-custom"><label htmlFor="quick-custom">Custom product</label><div><input id="quick-custom" maxLength={200} value={custom} disabled={state.busy} placeholder="Add something else" onChange={event => state.setQuickCustom(category, event.target.value)} /><button type="button" disabled={state.busy || !custom.trim()} onClick={addCustom}>Add</button></div></div>
    {custom.trim() && <p className="quick-custom-hint">Tap Add to include your custom product.</p>}
    {selected.length > 0 && <div className="quick-selected"><h3>Selected ({selected.length})</h3>{selected.map((item, index) => <div className="quick-selection" key={item.id}><div><strong>{item.name}</strong><button type="button" disabled={state.busy} aria-label={`Remove ${item.name} from selection`} onClick={() => setSelected(selected.filter(row => row.id !== item.id))}>×</button></div><label htmlFor={`quick-note-${index}`}>Details (optional)</label><input id={`quick-note-${index}`} maxLength={2000} value={item.notes} disabled={state.busy} placeholder="Brand, flavor, quantity, size or notes" onChange={event => setSelected(selected.map(row => row.id === item.id ? { ...row, notes: event.target.value } : row))} /></div>)}</div>}
    {state.error && <p className="feedback error-message" role="alert">{state.error}</p>}
    </div>
    <div className="quick-footer"><button className="primary quick-save" disabled={state.busy || favorites.busy || favoriteEditing || !selected.length || !!custom.trim() || !navigator.onLine} onClick={() => { void state.addQuick(category).then(success => { if (success) onClose(); }); }}>{state.busy ? 'Adding…' : `Add ${selected.length} ${selected.length === 1 ? 'item' : 'items'}`}</button></div>
  </section>;
}
