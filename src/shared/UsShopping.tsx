import { useEffect, useState } from 'react';
import { Symbol } from '../ui/Symbol';
import QuickAdd from './QuickAdd';
import type { ShoppingItem, SharedShoppingState } from './useSharedShopping';
import ShoppingItemDetail, { shoppingPhoto } from './ShoppingItemDetail';

export default function UsShopping({ state, onCategory, onSignIn }: { state: SharedShoppingState; onCategory: (category: ShoppingItem['category']) => void; onSignIn: () => void }) {
  const [adding, setAdding] = useState(false);
  const [detail, setDetail] = useState<ShoppingItem | null>(null);
  const [undoItem, setUndoItem] = useState<ShoppingItem | null>(null);
  const [purchasedOpen, setPurchasedOpen] = useState(false);
  const active = state.items.filter(item => !item.bought);
  const purchased = state.items.filter(item => item.bought);
  useEffect(() => { if (!undoItem) return; const timer = window.setTimeout(() => setUndoItem(null), 5000); return () => clearTimeout(timer); }, [undoItem]);
  return <section className="dashboard-card us-shopping" aria-labelledby="us-shopping-title">
    <div className="us-shopping-heading"><h2 id="us-shopping-title">Shopping</h2>{state.household && <span>{active.length} to buy</span>}</div>
    {!state.authReady || state.loading ? <p role="status">Opening your shopping list…</p> : !state.session || !state.household ? <><p>{state.session ? 'Connect your home to see your shared list.' : 'Sign in to see your shared shopping list.'}</p><button className="text-action" onClick={onSignIn}>{state.session ? 'Connect home' : 'Sign in'} →</button></> : <>
      <div className="us-shopping-shortcuts" role="group" aria-label="Shopping categories">{(['Home', 'Pets', 'Kids'] as const).map(category => <button key={category} onClick={() => onCategory(category)}><span>{category}</span><strong>{active.filter(item => item.category === category).length}</strong></button>)}</div>
      <button className="primary us-shopping-add" onClick={() => setAdding(true)}>+ Add shopping item</button>
      {adding && <div className="shared-shopping"><QuickAdd category="Home" state={state} onClose={() => setAdding(false)} dashboard /></div>}
      {state.error && <p className="feedback error-message" role="alert">{state.error}</p>}
      {state.notice && <p className="feedback" role="status">{state.notice}</p>}
      {active.length === 0 ? !state.error && <p className="us-shopping-empty">All caught up! Your shopping list is empty.</p> : <div className="us-shopping-list">{active.map(item => <div className="us-shopping-item" key={item.id}>
        <input aria-label={`Mark ${item.name} as purchased`} type="checkbox" checked={item.bought} disabled={state.busy || !navigator.onLine} onChange={() => { void state.markBought(item).then(success => { if (success) setUndoItem(item); }); }} />
        <button type="button" className="us-shopping-open" onClick={() => setDetail(item)}><span className="shopping-thumb" aria-hidden="true">{shoppingPhoto(item, state.favoritePhotos, state.petFoodPhotos) ? <img src={shoppingPhoto(item, state.favoritePhotos, state.petFoodPhotos)!} alt="" /> : <Symbol name="shopping" />}</span><span className="us-shopping-copy"><strong>{item.name}</strong><small>{item.category}</small>{item.notes && <small className="us-shopping-details">{item.notes}</small>}</span></button>
      </div>)}</div>}
      {purchased.length > 0 && <details className="purchased-list" open={purchasedOpen} onToggle={event => setPurchasedOpen((event.currentTarget as HTMLDetailsElement).open)}><summary>Purchased ({purchased.length})</summary><div className="us-shopping-list">{purchased.map(item => <div className="us-shopping-item is-bought" key={item.id}><input aria-label={`Return ${item.name} to active list`} type="checkbox" checked disabled={state.busy || !navigator.onLine} onChange={() => { void state.markBought(item); }} /><button type="button" className="us-shopping-open" onClick={() => setDetail(item)}><span className="shopping-thumb" aria-hidden="true">{shoppingPhoto(item, state.favoritePhotos, state.petFoodPhotos) ? <img src={shoppingPhoto(item, state.favoritePhotos, state.petFoodPhotos)!} alt="" /> : <Symbol name="shopping" />}</span><span className="us-shopping-copy"><strong>{item.name}</strong><small>{item.category}</small></span></button></div>)}</div></details>}
      {detail && <ShoppingItemDetail item={detail} photo={shoppingPhoto(detail, state.favoritePhotos, state.petFoodPhotos)} onClose={() => setDetail(null)} />}
      {undoItem && <div className="purchase-toast" role="status">Marked as purchased.<button type="button" onClick={() => { void state.markBought(undoItem).then(success => { if (success) setUndoItem(null); }); }}>Undo</button></div>}
    </>}
  </section>;
}
