import { useEffect, useRef, useState } from 'react';
import type { ShoppingItem, SharedShoppingState } from './useSharedShopping';
import ShoppingFavorites from './ShoppingFavorites';
import { useShoppingFavorites, type Favorite } from './useShoppingFavorites';
import { formatPetFoodDetails, usePetFoodShopping } from './usePetFoodShopping';
import { ProductIllustration, petFoodIllustrationName, matchesProductSearch } from './ProductIllustration';

type CatalogItem = string | { title: string; items: string[] };
type CatalogGroup = { title: string; items: CatalogItem[] };
const catalog: Record<ShoppingItem['category'], CatalogGroup[]> = {
  Home: [
    { title: 'Food', items: ['Eggs', 'Milk', { title: 'Bread', items: ['Toast bread', 'Rolls', 'Bagels', 'Croissants'] }, { title: 'Meat', items: ['Chicken', 'Beef', 'Pork', 'Turkey', 'Sausages', 'Chicken slices', 'Ham', 'Salami'] }, { title: 'Vegetables', items: ['Carrots', 'Tomatoes', 'Cucumbers', 'Potatoes', 'Onions', 'Peppers', 'Salad'] }, { title: 'Fruit', items: ['Apples', 'Bananas', 'Oranges', 'Berries', 'Grapes'] }, { title: 'Cheese', items: ['Gouda', 'Emmental', 'Mozzarella', 'Cream cheese', 'Parmesan', 'Sandwich cheese', 'Cottage cheese'] }, 'Rice', { title: 'Pasta', items: ['Spaghetti', 'Penne', 'Fusilli'] }, 'Yogurt', 'Butter', 'Cream', 'Spread', 'Flour', 'Cereal', 'Oil', 'Beans', 'Water', 'Juice'] },
    { title: 'Cleaning', items: [{ title: 'Dishwashing', items: ['Dish soap', 'Dishwasher tabs', 'Rinse aid'] }, { title: 'Laundry', items: ['Laundry detergent', 'Color detergent', 'Universal detergent', 'Fabric softener'] }, { title: 'Cleaners', items: ['All-purpose cleaner', 'Bathroom cleaner', 'Glass cleaner'] }, 'Sponges', 'Trash bags'] },
    { title: 'Bathroom & care', items: ['Toilet paper', 'Hand soap', { title: 'Hair & body', items: ['Shampoo', 'Conditioner', 'Shower gel'] }, { title: 'Dental care', items: ['Toothpaste', 'Toothbrushes', 'Dental floss'] }, 'Deodorant'] },
    { title: 'Everyday essentials', items: ['Paper towels', { title: 'Batteries', items: ['AA batteries', 'AAA batteries'] }, { title: 'Coffee', items: ['Ground coffee', 'Coffee beans', 'Coffee capsules'] }, { title: 'Tea', items: ['Black tea', 'Herbal tea', 'Green tea'] }] },
  ],
  Pets: [
    { title: 'Food & treats', items: ['Dry food', 'Wet food', 'Treats'] },
    { title: 'Care & supplies', items: ['Cat litter', 'Toys', 'Grooming supplies', 'Pet care products'] },
  ],
  Kids: [
    { title: 'Essentials', items: ['Diapers', 'Wipes', { title: 'Baby food', items: ['Fruit puree', 'Vegetable puree', 'Baby cereal'] }, 'Clothes'] },
    { title: 'Play & care', items: ['Toys', 'Shampoo', 'Hygiene products', 'Care products'] },
  ],
};
const categorySearchAliases: Record<string, string[]> = { Bread: ['brot', 'backwaren'], Meat: ['fleisch'], Vegetables: ['gemüse', 'gemuese', 'gemuse'], Fruit: ['obst', 'frucht'], Cheese: ['käse', 'kaese', 'kase'], Pasta: ['nudeln', 'teigwaren'] };
const isCatalogSubgroup = (item: CatalogItem): item is Exclude<CatalogItem, string> => typeof item !== 'string';

export default function QuickAdd({ category: initialCategory, state, onClose, dashboard = false }: { category: ShoppingItem['category']; state: SharedShoppingState; onClose: () => void; dashboard?: boolean }) {
  const [category, setCategory] = useState(initialCategory);
  const [showCustom, setShowCustom] = useState(false);
  const petFood = usePetFoodShopping(state.session?.user.id, state.household, dashboard && category === 'Pets');
  const [search, setSearch] = useState('');
  const [selectedOpen, setSelectedOpen] = useState(false);
  const [keyboard, setKeyboard] = useState<{ inset: number; height: number } | null>(null);
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    const update = () => {
      const inset = Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop);
      setKeyboard(inset > 100 ? { inset, height: viewport.height } : null);
    };
    viewport.addEventListener('resize', update); viewport.addEventListener('scroll', update);
    return () => { viewport.removeEventListener('resize', update); viewport.removeEventListener('scroll', update); };
  }, []);
  const [favoriteEditing, setFavoriteEditing] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  const confirmDialog = useRef<HTMLDialogElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const dialog = confirmDialog.current;
    if (confirmClose && dialog && !dialog.open) dialog.showModal();
    if (!confirmClose && dialog?.open) { dialog.close(); closeButton.current?.focus({ preventScroll: true }); }
  }, [confirmClose]);
  const [expandedProducts, setExpandedProducts] = useState<string[]>([]);
  const favorites = useShoppingFavorites(state.session?.user.id, state.household, category);
  const [expanded, setExpanded] = useState<string[]>([catalog[category][0].title]);
  const query = search.trim().toLocaleLowerCase();
  const groups = catalog[category];
  const searchResults = query ? groups.flatMap(group => group.items.flatMap(item => {
    if (typeof item === 'string') return matchesProductSearch(item, query) ? [item] : [];
    return item.title.toLocaleLowerCase().includes(query) || (categorySearchAliases[item.title] ?? []).some(alias => alias.includes(query)) ? item.items : item.items.filter(name => matchesProductSearch(name, query));
  })) : [];

  const selected = state.quickItems[category];
  const custom = state.quickCustom[category];
  const categories = ['Home', 'Pets', 'Kids'] as const;
  const total = dashboard ? categories.reduce((count, name) => count + state.quickItems[name].length, 0) : selected.length;
  const selectedRows = (dashboard ? categories : [category]).flatMap(name => state.quickItems[name].map(item => ({ ...item, category: name })));
  const hasCustomDraft = dashboard ? categories.some(name => state.quickCustom[name].trim()) : !!custom.trim();
  const setSelected = (items: typeof selected) => state.setQuickItems(category, items);
  function requestClose() {
    if (favoriteEditing || total || hasCustomDraft) setConfirmClose(true);
    else onClose();
  }
  function discardAndClose() {
    (dashboard ? categories : [category]).forEach(name => { state.setQuickItems(name, []); state.setQuickCustom(name, ''); });
    onClose();
  }
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
  function product(name: string) {
    const chosen = selected.some(item => item.id === `catalog:${name}`);
    const saved = favorites.favorites.find(item => item.category === category && item.name.trim().toLocaleLowerCase() === name.toLocaleLowerCase());
    return <div className={`quick-product${chosen ? ' is-selected' : ''}`} key={name}><button type="button" className="quick-tile" aria-pressed={chosen} disabled={state.busy} onClick={() => toggle(name)}><ProductIllustration name={name} /><span>{name}</span>{chosen && <span className="quick-check" aria-hidden="true">✓</span>}</button><button type="button" className="quick-favorite-product" aria-label={saved ? `Remove ${name} from favorites` : `Save ${name} as favorite`} aria-pressed={!!saved} disabled={state.busy || favorites.busy || favorites.loading || favoriteEditing} onClick={() => { if (saved) { if (window.confirm(`Remove “${saved.name}” from favorites for both of you?`)) void favorites.remove(saved); } else void favorites.save({ category, name, brand: '', flavor: '', size: '', quantity: '', notes: '', photo: null }, null); }}>{saved ? '★' : '☆'}</button></div>;
  }
  return <section className="quick-add" aria-label={`${category} Quick Add`} style={keyboard ? { bottom: keyboard.inset + 8, height: `min(680px, ${Math.max(180, keyboard.height - 16)}px)` } : undefined}>
    <div className="quick-heading"><div><h2>Quick Add</h2></div><button ref={closeButton} className="quick-close" disabled={state.busy || favorites.busy} onClick={requestClose}>Close</button></div>
    <div className="quick-search-wrap"><label className="quick-search-label" htmlFor="quick-search">Search products</label><input id="quick-search" className="quick-search" type="search" placeholder="Search products…" value={search} onChange={event => setSearch(event.target.value)} /></div>
    {dashboard && <div className="quick-category-tabs" role="group" aria-label="Quick Add categories">{categories.map(name => <button type="button" key={name} data-category={name.toLowerCase()} aria-pressed={category === name} disabled={state.busy || favorites.busy || favoriteEditing} onClick={() => { setCategory(name); setExpanded([catalog[name][0].title]); setExpandedProducts([]); setShowCustom(false); }}>{name}</button>)}</div>}
    <div className="quick-content">
    <ShoppingFavorites favoriteSeed={null} onSeedHandled={() => {}} category={category} data={favorites} selectedIds={selected.filter(item => item.id.startsWith('favorite:')).map(item => item.id.slice(9))} onToggle={toggleFavorite} editing={favoriteEditing} setEditing={setFavoriteEditing} isPoc={state.isPoc} query={query} disabled={state.busy} />
    {dashboard && category === 'Pets' && <section className="quick-pet-food" aria-label="Our Pets’ Food"><h3>Our Pets’ Food</h3>{petFood.loading && <p>Loading saved pet food…</p>}{petFood.error && <><p role="alert">{petFood.error}</p><button type="button" className="text-action" onClick={petFood.retry}>Try again</button></>}{petFood.foods.filter(food => `${food.name} ${food.brand} ${food.petNames.join(' ')}`.toLocaleLowerCase().includes(query)).map(food => {
      const id = `petfood:${food.id}`;
      return <button type="button" className="quick-pet-food-item" key={id} aria-pressed={selected.some(item => item.id === id)} disabled={state.busy} onClick={() => setSelected(selected.some(item => item.id === id) ? selected.filter(item => item.id !== id) : [...selected, { id, name: food.name, notes: formatPetFoodDetails(food), petFoodId: food.id, petFoodPhoto: food.photo }])}><span className="favorite-thumb">{food.photo ? <img src={food.photo} alt="" /> : <ProductIllustration name={petFoodIllustrationName(food.name, food.food_type)} />}</span><span className="favorite-copy"><strong>{food.name}</strong><small>{[food.brand, food.package_size, `For ${food.petNames.join(' & ')}`].filter(Boolean).join(' · ')}</small></span><span aria-hidden="true">{selected.some(item => item.id === id) ? '✓' : '+'}</span></button>;
    })}</section>}
    {query && searchResults.length === 0 && !(dashboard && category === 'Pets' && petFood.foods.some(food => `${food.name} ${food.brand} ${food.petNames.join(' ')}`.toLocaleLowerCase().includes(query))) && !favorites.favorites.some(item => item.category === category && (`${item.name} ${item.brand} ${item.flavor} ${item.size} ${item.quantity} ${item.notes}`.toLocaleLowerCase().includes(query) || matchesProductSearch(item.name, query))) && <p className="quick-no-results" role="status">No products found. You can add a custom product below.</p>}
    {query && searchResults.length > 0 && <div className="quick-tiles quick-search-results">{searchResults.map(name => product(name))}</div>}
    {!query && groups.map(group => {
      const open = !!query || expanded.includes(group.title);
      return <div className="quick-group" data-group={group.title.toLowerCase()} data-category={category.toLowerCase()} key={group.title}><h3><button type="button" className="quick-group-toggle" aria-expanded={open} onClick={() => setExpanded(previous => previous.includes(group.title) ? previous.filter(title => title !== group.title) : [...previous, group.title])}><span>{group.title}</span><span className={`quick-chevron ${open ? 'is-open' : ''}`} aria-hidden="true">⌄</span></button></h3>{open && <div className="quick-tiles">{group.items.map(item => {
        if (!isCatalogSubgroup(item)) return product(item);
        const productOpen = !!query || expandedProducts.includes(item.title);
        const products = query && !item.title.toLocaleLowerCase().includes(query) ? item.items.filter(name => name.toLocaleLowerCase().includes(query)) : item.items;
        return <div className={`quick-subgroup${productOpen ? ' is-expanded' : ''}`} key={item.title}><button type="button" className="quick-tile quick-subgroup-toggle" aria-expanded={productOpen} disabled={state.busy} onClick={() => setExpandedProducts(previous => previous.includes(item.title) ? previous.filter(title => title !== item.title) : [...previous, item.title])}><ProductIllustration name={item.title} /><span>{item.title}</span><small className="quick-subgroup-label" aria-hidden="true">Browse</small><span className={`quick-chevron ${productOpen ? 'is-open' : ''}`} aria-hidden="true">⌄</span></button>{productOpen && <div className="quick-subtiles">{products.map(name => product(name))}</div>}</div>;
      })}</div>}</div>;
    })}
    {dashboard && !showCustom && !custom.trim() && <button type="button" className="favorite-custom quick-custom-toggle" onClick={() => setShowCustom(true)}>+ Custom item</button>}
    {(!dashboard || showCustom || !!custom.trim()) && <div className="quick-custom"><label htmlFor="quick-custom">Custom product</label><div><input id="quick-custom" maxLength={200} value={custom} disabled={state.busy} placeholder="Add something else" onChange={event => state.setQuickCustom(category, event.target.value)} /><button type="button" disabled={state.busy || !custom.trim()} onClick={addCustom}>Add</button></div></div>}
    {custom.trim() && <p className="quick-custom-hint">Tap Add to include your custom product.</p>}
    {selected.length > 0 && <div className="quick-selected"><h3>Selected ({selected.length})</h3>{selected.map((item, index) => <div className="quick-selection" key={item.id}><div><span className="quick-selected-product"><span className="quick-selected-thumb">{item.favoritePhoto || item.petFoodPhoto ? <img src={item.favoritePhoto || item.petFoodPhoto || undefined} alt="" /> : <ProductIllustration name={item.petFoodId ? petFoodIllustrationName(item.name, item.notes) : item.name} id={item.id} />}</span><strong>{item.name}</strong></span><button type="button" disabled={state.busy} aria-label={`Remove ${item.name} from selection`} onClick={() => setSelected(selected.filter(row => row.id !== item.id))}>×</button></div><label htmlFor={`quick-note-${index}`}>Details (optional)</label><input id={`quick-note-${index}`} maxLength={20000} value={item.notes} disabled={state.busy} placeholder="Brand, flavor, quantity, size or notes" onChange={event => setSelected(selected.map(row => row.id === item.id ? { ...row, notes: event.target.value } : row))} /></div>)}</div>}
    {state.error && <p className="feedback error-message" role="alert">{state.error}</p>}
    </div>
    <dialog ref={confirmDialog} className="quick-confirm" aria-labelledby="quick-confirm-title" aria-describedby="quick-confirm-message" onCancel={event => { event.preventDefault(); setConfirmClose(false); }}>
      <h2 id="quick-confirm-title">{favoriteEditing && !(total || hasCustomDraft) ? 'Discard changes?' : favoriteEditing ? 'Discard changes and selected items?' : 'Discard selected items?'}</h2>
      <p id="quick-confirm-message">{favoriteEditing && (total || hasCustomDraft) ? 'Your favorite hasn’t been saved, and your selected products haven’t been added to the shopping list yet.' : favoriteEditing ? 'Your favorite hasn’t been saved yet.' : hasCustomDraft && !total ? 'Your custom product hasn’t been added to the shopping list yet.' : 'Your selected products haven’t been added to the shopping list yet.'}</p>
      <div><button type="button" autoFocus onClick={() => setConfirmClose(false)}>{favoriteEditing ? 'Keep editing' : 'Keep selecting'}</button><button type="button" onClick={discardAndClose}>{favoriteEditing ? 'Discard changes' : 'Discard selection'}</button></div>
    </dialog>
    <div className="quick-footer"><div className="quick-selected-panel"><div className="quick-selected-panel-heading"><button type="button" aria-expanded={selectedOpen} onClick={() => setSelectedOpen(!selectedOpen)}>Selected items ({total}) <span aria-hidden="true">{selectedOpen ? '⌃' : '⌄'}</span></button><button type="button" disabled={!total || state.busy} onClick={() => (dashboard ? categories : [category]).forEach(name => state.setQuickItems(name, []))}>Clear</button></div>{selectedOpen && <div className="quick-selected-chips">{selectedRows.length === 0 && <span className="quick-selected-empty">No items selected yet.</span>}{selectedRows.map(item => <span className="quick-selected-chip" key={`${item.category}:${item.id}`}><span className="quick-chip-image">{item.favoritePhoto || item.petFoodPhoto ? <img src={item.favoritePhoto || item.petFoodPhoto || undefined} alt="" /> : <ProductIllustration name={item.petFoodId ? petFoodIllustrationName(item.name, item.notes) : item.name} id={item.id} />}</span><span>{item.name}</span><button type="button" disabled={state.busy} aria-label={`Remove ${item.name} from selected items`} onClick={() => state.setQuickItems(item.category, state.quickItems[item.category].filter(row => row.id !== item.id))}>×</button></span>)}</div>}</div>{dashboard && hasCustomDraft && <p className="quick-custom-hint">Finish or clear the custom item in {categories.filter(name => state.quickCustom[name].trim()).join(', ')}.</p>}<button className="primary quick-save" disabled={state.busy || favorites.busy || favoriteEditing || !total || hasCustomDraft || !navigator.onLine} onClick={() => { void (dashboard ? state.addQuickAll() : state.addQuick(category)).then(success => { if (success) onClose(); }); }}>{state.busy ? 'Adding…' : `Add ${total} ${total === 1 ? 'item' : 'items'}`}</button></div>
  </section>;
}
