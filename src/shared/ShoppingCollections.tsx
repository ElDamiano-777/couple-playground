import { useState, type FormEvent } from 'react';
import type { SharedShoppingState } from './useSharedShopping';
import { ProductIllustration, petFoodIllustrationName } from './ProductIllustration';
import QuickAdd from './QuickAdd';
import { occasions, useShoppingCollections, type Collection, type CollectionItem } from './useShoppingCollections';
import './shopping-collections.css';

const icons: Record<string, string> = { heart: '♥', star: '★', gift: '🎁', home: '⌂', pet: '🐾' };
const suggestions: Record<string, string[]> = { party: ['Snacks', 'Dips', 'Soft drinks', 'Ice', 'Party supplies'], daily: ['Eggs', 'Milk', 'Rice', 'Toilet paper'], movie: ['Popcorn', 'Sweets', 'Snacks', 'Drinks'], weekend: ['Rolls', 'Croissants', 'Coffee', 'Tea', 'Treats'] };
const descriptions: Record<string, string> = { party: 'Snacks & party supplies', daily: 'Everyday staples', movie: 'Snacks & drinks', weekend: 'Breakfast & treats' };

export default function ShoppingCollections({ state }: { state: SharedShoppingState }) {
  const data = useShoppingCollections(state.session?.user.id, state.household);
  const [active, setActive] = useState<Collection | null>(null);
  const [quick, setQuick] = useState(false);
  const [editor, setEditor] = useState<{ id?: string; name: string; icon: string; color: string } | null>(null);
  const [editingItem, setEditingItem] = useState<{ item: CollectionItem; name: string; notes: string } | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const custom = data.collections.filter(row => row.archived === showArchived);
  const selected = active ? data.items.filter(item => active.builtin ? item.builtin_key === active.builtin : item.collection_id === active.id) : [];
  const count = (c: Collection) => data.items.filter(item => c.builtin ? item.builtin_key === c.builtin : item.collection_id === c.id);
  function save(event: FormEvent) {
    event.preventDefault();
    if (!editor?.name.trim()) return;
    void data.saveCollection({ name: editor.name.trim(), icon: editor.icon, color: editor.color }, editor.id).then(ok => { if (ok) setEditor(null); });
  }
  function card(c: Collection) {
    const entries = count(c), remaining = entries.filter(item => !item.bought).length;
    return <button className="occasion-card" data-color={c.color} key={c.id} onClick={() => setActive(c)}><span className="occasion-icon" aria-hidden="true">{c.builtin ? c.icon : icons[c.icon]}</span><span className="occasion-copy"><strong>{c.name}</strong><small>{c.builtin ? descriptions[c.id] : `${remaining} remaining · ${entries.length - remaining} purchased`}</small></span><span className="occasion-count">{remaining}</span></button>;
  }
  return <section className="shopping-collections" aria-label="Shopping collections">
    <div className="occasion-heading"><h2>Shop by occasion</h2></div>
    <div className="occasion-grid">{occasions.map(card)}</div>
    <div className="occasion-heading"><h2>Your collections</h2><button type="button" onClick={() => setEditor({ name: '', icon: 'heart', color: 'purple' })}>+ New Collection</button></div>
    <div className="occasion-grid">{custom.map(card)}</div>
    {!custom.length && <p className="occasion-empty">{showArchived ? 'No archived collections.' : 'Create a list for something special.'}</p>}
    {(showArchived || data.collections.some(c => c.archived)) && <button className="occasion-archive-toggle" onClick={() => setShowArchived(!showArchived)}>{showArchived ? 'Show active collections' : 'Show archived collections'}</button>}
    {data.error && <p className="feedback error-message" role="alert">{data.error}</p>}
    {editor && <div className="occasion-overlay"><form className="occasion-dialog" role="dialog" aria-modal="true" aria-label={editor.id ? 'Edit collection' : 'New collection'} onSubmit={save}><h2>{editor.id ? 'Edit collection' : 'New collection'}</h2><label htmlFor="occasion-name">Collection name</label><input id="occasion-name" value={editor.name} maxLength={100} required onChange={e => setEditor({ ...editor, name: e.target.value })} /><label htmlFor="occasion-icon">Icon</label><select id="occasion-icon" value={editor.icon} onChange={e => setEditor({ ...editor, icon: e.target.value })}>{Object.entries(icons).map(([key, icon]) => <option key={key} value={key}>{icon} {key}</option>)}</select><label htmlFor="occasion-color">Color</label><select id="occasion-color" value={editor.color} onChange={e => setEditor({ ...editor, color: e.target.value })}>{['purple', 'mint', 'peach', 'pink', 'blue'].map(color => <option key={color} value={color}>{color[0].toUpperCase() + color.slice(1)}</option>)}</select><div className="occasion-actions"><button className="primary" disabled={data.busy || !editor.name.trim()}>Save</button><button type="button" onClick={() => setEditor(null)}>Cancel</button></div></form></div>}
    {active && <div className="occasion-overlay"><section className="occasion-dialog occasion-list" role="dialog" aria-modal="true" aria-label={active.name}>
      <div className="occasion-title"><h2>{active.name}</h2><button onClick={() => setActive(null)}>Close</button></div>
      <p>{selected.filter(item => !item.bought).length} remaining · {selected.filter(item => item.bought).length} purchased</p>
      {!active.builtin && <div className="occasion-tools"><button onClick={() => { setEditor({ id: active.id, name: active.name, icon: active.icon, color: active.color }); setActive(null); }}>Edit</button><button onClick={() => { if (active.archived || window.confirm(`Archive “${active.name}”? Its items will be kept.`)) void data.archive(active).then(ok => { if (ok) setActive(null); }); }}>{active.archived ? 'Unarchive' : 'Archive'}</button><button onClick={() => { if (window.confirm('Delete this collection and its own items? Your main shopping list will stay unchanged.')) void data.removeCollection(active).then(ok => { if (ok) setActive(null); }); }}>Delete</button></div>}
      <button className="primary occasion-add" onClick={() => setQuick(true)}>+ Add products</button>
      {!selected.length && <p className="occasion-empty">No items yet. Add something to get started.</p>}
      {active.builtin && <div className="occasion-suggestions" aria-label="Suggested products">{suggestions[active.builtin].map(name => <button key={name} disabled={data.busy} onClick={() => void data.addItems(active, [{ id: `suggestion:${name}`, name, notes: '', category: 'Home' }])}>+ {name}</button>)}</div>}

      <div className="occasion-items">{[...selected.filter(i => !i.bought), ...selected.filter(i => i.bought)].map(item => <div className={`occasion-item${item.bought ? ' is-bought' : ''}`} key={item.id}><input type="checkbox" aria-label={`Mark ${item.name} ${item.bought ? 'not purchased' : 'purchased'}`} checked={item.bought} disabled={data.busy} onChange={() => void data.mark(item)} /><span className="occasion-item-image">{(item.favorite_id || item.pet_food_id) && data.photos[item.favorite_id ?? item.pet_food_id!] ? <img src={data.photos[item.favorite_id ?? item.pet_food_id!]!} alt="" /> : <ProductIllustration name={item.pet_food_id ? petFoodIllustrationName(item.name, item.notes) : item.name} />}</span><button className="occasion-item-copy" onClick={() => setEditingItem({ item, name: item.name, notes: item.notes })}><strong>{item.name}</strong><small>{[item.category, item.notes].filter(Boolean).join(' · ')}</small></button><button className="occasion-remove" aria-label={`Remove ${item.name}`} onClick={() => { if (window.confirm(`Remove “${item.name}” from this collection?`)) void data.removeItem(item); }}>×</button></div>)}</div>
      {data.error && <p role="alert">{data.error}</p>}
    </section></div>}
    {editingItem && <div className="occasion-overlay occasion-edit-overlay"><form className="occasion-dialog" role="dialog" aria-modal="true" aria-label="Edit collection item" onSubmit={e => { e.preventDefault(); void data.editItem(editingItem.item, editingItem.name, editingItem.notes).then(ok => { if (ok) setEditingItem(null); }); }}><h2>Edit item</h2><label htmlFor="occasion-item-name">Name</label><input id="occasion-item-name" required maxLength={200} value={editingItem.name} onChange={e => setEditingItem({ ...editingItem, name: e.target.value })} /><label htmlFor="occasion-item-notes">Quantity and notes (optional)</label><textarea id="occasion-item-notes" rows={3} maxLength={20000} value={editingItem.notes} onChange={e => setEditingItem({ ...editingItem, notes: e.target.value })} /><div className="occasion-actions"><button className="primary" disabled={data.busy || !editingItem.name.trim()}>Save</button><button type="button" onClick={() => setEditingItem(null)}>Cancel</button></div></form></div>}
    {quick && active && <QuickAdd category="Home" dashboard state={state} onClose={() => setQuick(false)} onAddSelected={items => data.addItems(active, items)} addError={data.error} />}
  </section>;
}
