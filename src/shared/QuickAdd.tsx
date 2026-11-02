import type { ShoppingItem, SharedShoppingState } from './useSharedShopping';

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
  const selected = state.quickItems[category];
  const custom = state.quickCustom[category];
  const setSelected = (items: typeof selected) => state.setQuickItems(category, items);
  function toggle(name: string) {
    const id = `catalog:${name}`;
    const existing = selected.find(item => item.id === id);
    setSelected(existing ? selected.filter(item => item.id !== id) : [...selected, { id, name, notes: '' }]);
  }
  function addCustom() {
    const name = custom.trim();
    if (!name) return;
    setSelected([...selected, { id: crypto.randomUUID(), name, notes: '' }]);
    state.setQuickCustom(category, '');
  }
  return <section className="quick-add" aria-label={`${category} Quick Add`}>
    <div className="quick-heading"><div><h2>Quick Add</h2><p>Choose items for {category}.</p></div><button className="quick-close" disabled={state.busy} onClick={onClose}>Close</button></div>
    {catalog[category].map(group => <div className="quick-group" key={group.title}><h3>{group.title}</h3><div className="quick-tiles">{group.items.map(name => <button key={name} type="button" className="quick-tile" aria-pressed={selected.some(item => item.id === `catalog:${name}`)} disabled={state.busy} onClick={() => toggle(name)}>{name}</button>)}</div></div>)}
    <div className="quick-custom"><label htmlFor="quick-custom">Custom product</label><div><input id="quick-custom" maxLength={200} value={custom} disabled={state.busy} placeholder="Add something else" onChange={event => state.setQuickCustom(category, event.target.value)} /><button type="button" disabled={state.busy || !custom.trim()} onClick={addCustom}>Add</button></div></div>
    {custom.trim() && <p className="quick-custom-hint">Tap Add to include your custom product.</p>}
    {selected.length > 0 && <div className="quick-selected"><h3>Selected ({selected.length})</h3>{selected.map((item, index) => <div className="quick-selection" key={item.id}><div><strong>{item.name}</strong><button type="button" disabled={state.busy} aria-label={`Remove ${item.name} from selection`} onClick={() => setSelected(selected.filter(row => row.id !== item.id))}>×</button></div><label htmlFor={`quick-note-${index}`}>Details (optional)</label><input id={`quick-note-${index}`} maxLength={1000} value={item.notes} disabled={state.busy} placeholder="Brand, flavor, quantity, size or notes" onChange={event => setSelected(selected.map(row => row.id === item.id ? { ...row, notes: event.target.value } : row))} /></div>)}</div>}
    {state.error && <p className="feedback error-message" role="alert">{state.error}</p>}
    <button className="primary quick-save" disabled={state.busy || !selected.length || !!custom.trim() || !navigator.onLine} onClick={() => { void state.addQuick(category).then(success => { if (success) onClose(); }); }}>{state.busy ? 'Adding…' : `Add ${selected.length || ''} ${selected.length === 1 ? 'item' : 'items'}`}</button>
  </section>;
}
