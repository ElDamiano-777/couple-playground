import { useState } from 'react';
import { Symbol } from '../ui/Symbol';
import type { ShoppingItem, SharedShoppingState } from './useSharedShopping';

export default function UsShopping({ state, onCategory, onSignIn }: { state: SharedShoppingState; onCategory: (category: ShoppingItem['category']) => void; onSignIn: () => void }) {
  const [adding, setAdding] = useState(false);
  const active = state.items.filter(item => !item.bought);
  return <section className="dashboard-card us-shopping" aria-labelledby="us-shopping-title">
    <div className="us-shopping-heading"><h2 id="us-shopping-title">Shopping</h2>{state.household && <span>{active.length} to buy</span>}</div>
    {!state.authReady || state.loading ? <p role="status">Opening your shopping list…</p> : !state.session || !state.household ? <><p>{state.session ? 'Connect your home to see your shared list.' : 'Sign in to see your shared shopping list.'}</p><button className="text-action" onClick={onSignIn}>{state.session ? 'Connect home' : 'Sign in'} →</button></> : <>
      <div className="us-shopping-shortcuts" role="group" aria-label="Shopping categories">{(['Home', 'Pets', 'Kids'] as const).map(category => <button key={category} onClick={() => onCategory(category)}><span>{category}</span><strong>{active.filter(item => item.category === category).length}</strong></button>)}</div>
      <button className="primary us-shopping-add" onClick={() => setAdding(true)}>+ Add shopping item</button>
      {adding && <form className="note-form us-shopping-form" onSubmit={event => { event.preventDefault(); void state.add().then(success => { if (success) setAdding(false); }); }}>
        <h3>Add shopping item</h3>
        <label htmlFor="us-item-name">Item name</label><input id="us-item-name" required maxLength={200} disabled={state.busy} value={state.draft} onChange={event => state.setDraft(event.target.value)} />
        <label htmlFor="us-item-details">Details (optional)</label><input id="us-item-details" maxLength={2000} disabled={state.busy} value={state.draftNotes} onChange={event => state.setDraftNotes(event.target.value)} placeholder="Brand, size or notes" />
        <label htmlFor="us-item-category">Category</label><select id="us-item-category" disabled={state.busy} value={state.category} onChange={event => state.setCategory(event.target.value as ShoppingItem['category'])}><option>Home</option><option>Pets</option><option>Kids</option></select>
        <button className="primary" disabled={state.busy || !state.draft.trim() || !navigator.onLine}>Add item</button><button type="button" className="text-action" disabled={state.busy} onClick={() => setAdding(false)}>Close</button>
      </form>}
      {state.error && <p className="feedback error-message" role="alert">{state.error}</p>}
      {state.notice && <p className="feedback" role="status">{state.notice}</p>}
      {active.length === 0 ? !state.error && <p className="us-shopping-empty">All caught up! Your shopping list is empty.</p> : <div className="us-shopping-list">{active.map(item => <label className="us-shopping-item" key={item.id}>
        <input type="checkbox" checked={item.bought} disabled={state.busy || !navigator.onLine} onChange={() => { void state.markBought(item); }} />
        <span className="shopping-thumb" aria-hidden="true">{item.pet_food_id && state.petFoodPhotos[item.pet_food_id] ? <img src={state.petFoodPhotos[item.pet_food_id]!} alt="" /> : item.favorite_id && state.favoritePhotos[item.favorite_id] ? <img src={state.favoritePhotos[item.favorite_id]!} alt="" /> : <Symbol name="shopping" />}</span>
        <span className="us-shopping-copy"><strong>{item.name}</strong><small>{item.category}</small>{item.notes && <small className="us-shopping-details">{item.notes}</small>}</span>
      </label>)}</div>}
    </>}
  </section>;
}
