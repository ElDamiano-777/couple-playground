import { useEffect, useState, type FormEvent } from 'react';
import type { SharedShoppingState } from './useSharedShopping';
import { ProductIllustration, petFoodIllustrationName } from './ProductIllustration';
import CollectionPicker from './CollectionPicker';
import { occasions, useShoppingCollections, type Collection, type CollectionItem } from './useShoppingCollections';
import './shopping-collections.css';

const icons: Record<string, string> = { heart: '♥', star: '★', gift: '🎁', home: '⌂', pet: '🐾' };

export default function ShoppingCollections({ state }: { state: SharedShoppingState }) {
  const data = useShoppingCollections(state.session?.user.id, state.household);
  const [active, setActive] = useState<Collection | null>(null);
  const [pickerFooter, setPickerFooter] = useState<HTMLDivElement | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [copyMode, setCopyMode] = useState(false);
  const [copyIds, setCopyIds] = useState<string[]>([]);
  const [copyResult, setCopyResult] = useState(false);
  const [editor, setEditor] = useState<{ id?: string; name: string; icon: string; color: string; event_date: string } | null>(null);
  const [editingItem, setEditingItem] = useState<{ item: CollectionItem; name: string; notes: string } | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [keyboardBounds, setKeyboardBounds] = useState<{ top: number; bottom: number } | null>(null);
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    const update = () => {
      const bottom = Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop);
      setKeyboardBounds(bottom > 100 ? { top: viewport.offsetTop, bottom } : null);
    };
    viewport.addEventListener('resize', update); viewport.addEventListener('scroll', update);
    return () => { viewport.removeEventListener('resize', update); viewport.removeEventListener('scroll', update); };
  }, []);
  const custom = data.collections.filter(row => row.archived === showArchived);
  const recovered = showArchived ? [] : occasions.filter(row => data.items.some(item => item.builtin_key === row.builtin));
  const selected = active ? data.items.filter(item => active.builtin ? item.builtin_key === active.builtin : item.collection_id === active.id) : [];
  const count = (c: Collection) => data.items.filter(item => c.builtin ? item.builtin_key === c.builtin : item.collection_id === c.id);
  function save(event: FormEvent) {
    event.preventDefault();
    if (!editor?.name.trim()) return;
    const previousDate = data.collections.find(collection => collection.id === editor.id)?.event_date;
    void data.saveCollection({ name: editor.name.trim(), icon: editor.icon, color: editor.color, ...(editor.event_date || previousDate ? { event_date: editor.event_date || null } : {}) }, editor.id).then(ok => { if (ok) setEditor(null); });
  }
  function card(c: Collection) {
    const entries = count(c), remaining = entries.filter(item => !item.bought).length;
    return <button className="occasion-card" data-color={c.color} key={c.id} onClick={() => { setPickerOpen(false); setCopyMode(false); setCopyIds([]); setCopyResult(false); setActive(c); }}><span className="occasion-icon" aria-hidden="true">{c.builtin ? c.icon : icons[c.icon]}</span><span className="occasion-copy"><strong>{c.name}</strong><small>{remaining} remaining · {entries.length - remaining} purchased{c.event_date ? ` · ${new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${c.event_date}T00:00:00Z`))}` : ''}</small></span><span className="occasion-count">{remaining}</span></button>;
  }
  return <section className="shopping-collections" aria-label="Shopping collections">
    <div className="occasion-heading"><h2>Our Collections</h2><button type="button" onClick={() => setEditor({ name: '', icon: 'heart', color: 'purple', event_date: '' })}>+ New Collection</button></div>
    <div className="occasion-grid">{[...custom, ...recovered].map(card)}</div>
    {!custom.length && !recovered.length && (showArchived ? <p className="occasion-empty">No archived collections.</p> : <button type="button" className="occasion-empty-invite" onClick={() => setEditor({ name: '', icon: 'heart', color: 'purple', event_date: '' })}><span aria-hidden="true">✦</span><span><strong>Make it yours</strong><small>Create a list for something special</small></span><span aria-hidden="true">＋</span></button>)}
    {(showArchived || data.collections.some(c => c.archived)) && <button className="occasion-archive-toggle" onClick={() => setShowArchived(!showArchived)}>{showArchived ? 'Show active collections' : 'Show archived collections'}</button>}
    {data.error && <p className="feedback error-message" role="alert">{data.error}</p>}
    {editor && <div className="occasion-overlay" style={keyboardBounds ?? undefined}><form className="occasion-dialog" role="dialog" aria-modal="true" aria-label={editor.id ? 'Edit collection' : 'New collection'} onSubmit={save}><h2>{editor.id ? 'Edit collection' : 'New collection'}</h2><label htmlFor="occasion-name">Collection name</label><input id="occasion-name" value={editor.name} maxLength={100} required onChange={e => setEditor({ ...editor, name: e.target.value })} /><label htmlFor="occasion-icon">Icon</label><select id="occasion-icon" value={editor.icon} onChange={e => setEditor({ ...editor, icon: e.target.value })}>{Object.entries(icons).map(([key, icon]) => <option key={key} value={key}>{icon} {key}</option>)}</select><label htmlFor="occasion-color">Color</label><select id="occasion-color" value={editor.color} onChange={e => setEditor({ ...editor, color: e.target.value })}>{['purple', 'mint', 'peach', 'pink', 'blue'].map(color => <option key={color} value={color}>{color[0].toUpperCase() + color.slice(1)}</option>)}</select><label htmlFor="occasion-date">Date (optional)</label><input id="occasion-date" type="date" value={editor.event_date} onChange={e => setEditor({ ...editor, event_date: e.target.value })} /><div className="occasion-actions"><button className="primary" disabled={data.busy || !editor.name.trim()}>Save</button><button type="button" onClick={() => setEditor(null)}>Cancel</button></div></form></div>}
    {active && <div className="occasion-overlay occasion-panel-overlay" style={keyboardBounds ?? undefined}><section className="occasion-dialog occasion-list" data-color={active.color} role="dialog" aria-modal="true" aria-label={active.name}>
      <div className="occasion-panel-header"><div className="occasion-title"><span className="occasion-title-icon" data-color={active.color} aria-hidden="true">{active.builtin ? active.icon : icons[active.icon]}</span><h2>{pickerOpen ? 'Add products' : active.name}</h2><button onClick={() => { if (pickerOpen) setPickerOpen(false); else setActive(null); }}>{pickerOpen ? 'Back' : 'Close'}</button></div>
      <div className="occasion-panel-summary"><p>{pickerOpen ? active.name : `${selected.filter(item => !item.bought).length} remaining · ${selected.filter(item => item.bought).length} purchased`}</p></div></div>
      {pickerOpen ? <><CollectionPicker key={active.id} builtin={active.builtin} state={state} busy={data.busy} error={data.error} footer={pickerFooter} onAdd={items => data.addItems(active, items).then(ok => { if (ok) setPickerOpen(false); return ok; })} /><div ref={setPickerFooter} className="occasion-panel-footer" /></> : <>
      <div className="occasion-items">{[...selected.filter(i => !i.bought), ...selected.filter(i => i.bought)].map(item => <div className={`occasion-item${item.bought ? ' is-bought' : ''}`} key={item.id}>{copyMode && <input type="checkbox" aria-label={`Select ${item.name} to copy`} checked={copyIds.includes(item.id)} onChange={() => { setCopyResult(false); setCopyIds(previous => previous.includes(item.id) ? previous.filter(id => id !== item.id) : [...previous, item.id]); }} />}<input type="checkbox" aria-label={`Mark ${item.name} ${item.bought ? 'not purchased' : 'purchased'}`} checked={item.bought} disabled={data.busy} onChange={() => void data.mark(item)} /><span className="occasion-item-image">{(item.favorite_id || item.pet_food_id) && data.photos[item.favorite_id ?? item.pet_food_id!] ? <img src={data.photos[item.favorite_id ?? item.pet_food_id!]!} alt="" /> : <ProductIllustration name={item.pet_food_id ? petFoodIllustrationName(item.name, item.notes) : item.name} />}</span><button className="occasion-item-copy" onClick={() => setEditingItem({ item, name: item.name, notes: item.notes })}><strong>{item.name}</strong><small>{[item.category, item.notes].filter(Boolean).join(' · ')}</small></button><button className="occasion-remove" aria-label={`Remove ${item.name}`} onClick={() => { if (window.confirm(`Remove “${item.name}” from this collection?`)) void data.removeItem(item); }}>×</button></div>)}</div>
      {!selected.length && <p className="occasion-panel-empty">No items yet. Choose products to get started.</p>}
      <button className="primary occasion-add-products" onClick={() => { setCopyMode(false); setPickerOpen(true); }}>+ Add products</button>
      {selected.length > 0 && <div className="occasion-copy-actions">{copyMode ? <><button disabled={!copyIds.length || state.busy} onClick={() => { const chosen = selected.filter(item => copyIds.includes(item.id)).map(item => ({ id: item.id, name: item.name, notes: item.notes, category: item.category, favoriteId: item.favorite_id ?? undefined, petFoodId: item.pet_food_id ?? undefined, favoritePhoto: item.favorite_id ? data.photos[item.favorite_id] : null, petFoodPhoto: item.pet_food_id ? data.photos[item.pet_food_id] : null })); void state.copyCollectionItems(chosen).then(ok => { setCopyResult(true); if (ok) { setCopyMode(false); setCopyIds([]); } }); }}>Copy {copyIds.length} to Shopping</button><button onClick={() => { setCopyMode(false); setCopyIds([]); }}>Cancel</button></> : <button onClick={() => { setCopyResult(false); setCopyMode(true); }}>Select items to copy to Shopping</button>}</div>}
      {copyResult && (state.error ? <p role="alert">{state.error}</p> : state.notice && <p role="status">{state.notice}</p>)}
      {!active.builtin && <details className="occasion-management"><summary>Collection options</summary><div className="occasion-tools"><button onClick={() => { setEditor({ id: active.id, name: active.name, icon: active.icon, color: active.color, event_date: active.event_date ?? '' }); setActive(null); }}>Edit</button><button onClick={() => { if (active.archived || window.confirm(`Archive “${active.name}”? Its items will be kept.`)) void data.archive(active).then(ok => { if (ok) setActive(null); }); }}>{active.archived ? 'Unarchive' : 'Archive'}</button><button onClick={() => { if (window.confirm('Delete this collection and its own items? Your main shopping list will stay unchanged.')) void data.removeCollection(active).then(ok => { if (ok) setActive(null); }); }}>Delete</button></div></details>}
      {data.error && <p role="alert">{data.error}</p>}
      </>}
    </section></div>}
    {editingItem && <div className="occasion-overlay occasion-edit-overlay" style={keyboardBounds ?? undefined}><form className="occasion-dialog" role="dialog" aria-modal="true" aria-label="Edit collection item" onSubmit={e => { e.preventDefault(); void data.editItem(editingItem.item, editingItem.name, editingItem.notes).then(ok => { if (ok) setEditingItem(null); }); }}><h2>Edit item</h2><label htmlFor="occasion-item-name">Name</label><input id="occasion-item-name" required maxLength={200} value={editingItem.name} onChange={e => setEditingItem({ ...editingItem, name: e.target.value })} /><label htmlFor="occasion-item-notes">Quantity and notes (optional)</label><textarea id="occasion-item-notes" rows={3} maxLength={20000} value={editingItem.notes} onChange={e => setEditingItem({ ...editingItem, notes: e.target.value })} /><div className="occasion-actions"><button className="primary" disabled={data.busy || !editingItem.name.trim()}>Save</button><button type="button" onClick={() => setEditingItem(null)}>Cancel</button></div></form></div>}
  </section>;
}
