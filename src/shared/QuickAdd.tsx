import { useState } from 'react';
import type { ShoppingItem, SharedShoppingState } from './useSharedShopping';
import ShoppingFavorites from './ShoppingFavorites';
import { useShoppingFavorites, type Favorite } from './useShoppingFavorites';
import { formatPetFoodDetails, usePetFoodShopping } from './usePetFoodShopping';

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

export default function QuickAdd({ category: initialCategory, state, onClose, dashboard = false }: { category: ShoppingItem['category']; state: SharedShoppingState; onClose: () => void; dashboard?: boolean }) {
  const [category, setCategory] = useState(initialCategory);
  const [showCustom, setShowCustom] = useState(false);
  const petFood = usePetFoodShopping(state.session?.user.id, state.household, dashboard && category === 'Pets');
  const [search, setSearch] = useState('');
  const [favoriteEditing, setFavoriteEditing] = useState(false);
  const favorites = useShoppingFavorites(state.session?.user.id, state.household, category);
  const [expanded, setExpanded] = useState<string[]>([catalog[category][0].title]);
  const query = search.trim().toLocaleLowerCase();
  const groups = catalog[category].map(group => ({ ...group, items: group.items.filter(name => name.toLocaleLowerCase().includes(query)) })).filter(group => group.items.length > 0);
  const selected = state.quickItems[category];
  const custom = state.quickCustom[category];
  const categories = ['Home', 'Pets', 'Kids'] as const;
  const total = dashboard ? categories.reduce((count, name) => count + state.quickItems[name].length, 0) : selected.length;
  const hasCustomDraft = dashboard ? categories.some(name => state.quickCustom[name].trim()) : !!custom.trim();
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
    setSelected(existing ? selected.filter(row => row.id !== id) : [...selected, { id, name: item.name, notes, favoriteId: item.id, favoritePhoto: item.photo }]);
  }
  function addCustom() {
    const name = custom.trim();
    if (!name) return;
    setSelected([...selected, { id: crypto.randomUUID(), name, notes: '' }]);
    state.setQuickCustom(category, '');
  }
  return <section className="quick-add" aria-label={`${category} Quick Add`}>
    <div className="quick-heading"><div><h2>Quick Add</h2><p>Choose items for {category}.</p></div><button className="quick-close" disabled={state.busy || favorites.busy} onClick={() => { if (!favoriteEditing || window.confirm('Discard your unfinished favorite?')) onClose(); }}>Close</button></div>
    {dashboard && <div className="quick-category-tabs" role="group" aria-label="Quick Add categories">{categories.map(name => <button type="button" key={name} aria-pressed={category === name} disabled={state.busy || favorites.busy || favoriteEditing} onClick={() => { setCategory(name); setExpanded([catalog[name][0].title]); setShowCustom(false); setSearch(''); }}>{name}</button>)}</div>}
    <div className="quick-content">
    <label className="quick-search-label" htmlFor="quick-search">Search products</label>
    <input id="quick-search" className="quick-search" type="search" placeholder="Search products" value={search} onChange={event => setSearch(event.target.value)} />
    <ShoppingFavorites category={category} data={favorites} selectedIds={selected.filter(item => item.id.startsWith('favorite:')).map(item => item.id.slice(9))} onToggle={toggleFavorite} editing={favoriteEditing} setEditing={setFavoriteEditing} isPoc={state.isPoc} query={query} disabled={state.busy} />
    {dashboard && category === 'Pets' && <section className="quick-pet-food" aria-label="Our Pets’ Food"><h3>Our Pets’ Food</h3>{petFood.loading && <p>Loading saved pet food…</p>}{petFood.error && <><p role="alert">{petFood.error}</p><button type="button" className="text-action" onClick={petFood.retry}>Try again</button></>}{petFood.foods.filter(food => `${food.name} ${food.brand} ${food.petNames.join(' ')}`.toLocaleLowerCase().includes(query)).map(food => {
      const id = `petfood:${food.id}`;
      return <button type="button" className="quick-pet-food-item" key={id} aria-pressed={selected.some(item => item.id === id)} disabled={state.busy} onClick={() => setSelected(selected.some(item => item.id === id) ? selected.filter(item => item.id !== id) : [...selected, { id, name: food.name, notes: formatPetFoodDetails(food), petFoodId: food.id, petFoodPhoto: food.photo }])}><span className="favorite-thumb">{food.photo ? <img src={food.photo} alt="" /> : <span aria-hidden="true">🐾</span>}</span><span className="favorite-copy"><strong>{food.name}</strong><small>{[food.brand, food.package_size, `For ${food.petNames.join(' & ')}`].filter(Boolean).join(' · ')}</small></span><span aria-hidden="true">{selected.some(item => item.id === id) ? '✓' : '+'}</span></button>;
    })}</section>}
    {query && groups.length === 0 && !(dashboard && category === 'Pets' && petFood.foods.some(food => `${food.name} ${food.brand} ${food.petNames.join(' ')}`.toLocaleLowerCase().includes(query))) && !favorites.favorites.some(item => item.category === category && `${item.name} ${item.brand}`.toLocaleLowerCase().includes(query)) && <p className="quick-no-results" role="status">No products found. You can add a custom product below.</p>}
    {groups.map(group => {
      const open = !!query || expanded.includes(group.title);
      return <div className="quick-group" key={group.title}><h3><button type="button" className="quick-group-toggle" aria-expanded={open} onClick={() => setExpanded(previous => previous.includes(group.title) ? previous.filter(title => title !== group.title) : [...previous, group.title])}><span>{group.title}</span><span className={`quick-chevron ${open ? 'is-open' : ''}`} aria-hidden="true">⌄</span></button></h3>{open && <div className="quick-tiles">{group.items.map(name => <button key={name} type="button" className="quick-tile" aria-pressed={selected.some(item => item.id === `catalog:${name}`)} disabled={state.busy} onClick={() => toggle(name)}>{name}</button>)}</div>}</div>;
    })}
    {dashboard && !showCustom && !custom.trim() && <button type="button" className="favorite-custom quick-custom-toggle" onClick={() => setShowCustom(true)}>+ Custom item</button>}
    {(!dashboard || showCustom || !!custom.trim()) && <div className="quick-custom"><label htmlFor="quick-custom">Custom product</label><div><input id="quick-custom" maxLength={200} value={custom} disabled={state.busy} placeholder="Add something else" onChange={event => state.setQuickCustom(category, event.target.value)} /><button type="button" disabled={state.busy || !custom.trim()} onClick={addCustom}>Add</button></div></div>}
    {custom.trim() && <p className="quick-custom-hint">Tap Add to include your custom product.</p>}
    {selected.length > 0 && <div className="quick-selected"><h3>Selected ({selected.length})</h3>{selected.map((item, index) => <div className="quick-selection" key={item.id}><div><strong>{item.name}</strong><button type="button" disabled={state.busy} aria-label={`Remove ${item.name} from selection`} onClick={() => setSelected(selected.filter(row => row.id !== item.id))}>×</button></div><label htmlFor={`quick-note-${index}`}>Details (optional)</label><input id={`quick-note-${index}`} maxLength={20000} value={item.notes} disabled={state.busy} placeholder="Brand, flavor, quantity, size or notes" onChange={event => setSelected(selected.map(row => row.id === item.id ? { ...row, notes: event.target.value } : row))} /></div>)}</div>}
    {state.error && <p className="feedback error-message" role="alert">{state.error}</p>}
    </div>
    <div className="quick-footer">{dashboard && hasCustomDraft && <p className="quick-custom-hint">Finish or clear the custom item in {categories.filter(name => state.quickCustom[name].trim()).join(', ')}.</p>}<button className="primary quick-save" disabled={state.busy || favorites.busy || favoriteEditing || !total || hasCustomDraft || !navigator.onLine} onClick={() => { void (dashboard ? state.addQuickAll() : state.addQuick(category)).then(success => { if (success) onClose(); }); }}>{state.busy ? 'Adding…' : `Add ${total} ${total === 1 ? 'item' : 'items'}`}</button></div>
  </section>;
}
