import { ProductIllustration, petFoodIllustrationName } from './ProductIllustration';
import { useEffect, useState } from 'react';
import { Symbol } from '../ui/Symbol';
import type { ShoppingItem, SharedShoppingState } from './useSharedShopping';
import ShoppingItemDetail, { shoppingPhoto } from './ShoppingItemDetail';

export default function UsShopping({ state, onCategory, onSignIn, onAdd }: { state: SharedShoppingState; onCategory: (category: ShoppingItem['category']) => void; onSignIn: () => void; onAdd: () => void }) {
  const [showAll, setShowAll] = useState(false);
  const [detail, setDetail] = useState<ShoppingItem | null>(null);
  const [undoItem, setUndoItem] = useState<ShoppingItem | null>(null);
  const active = state.items.filter(item => !item.bought);
  useEffect(() => { if (!undoItem) return; const timer = window.setTimeout(() => setUndoItem(null), 5000); return () => clearTimeout(timer); }, [undoItem]);
  return <section className={`dashboard-card us-shopping${active.length ? ' dashboard-active' : ''}`} aria-labelledby="us-shopping-title">
    <div className="us-shopping-heading"><h2 id="us-shopping-title"><span className="dashboard-icon"><Symbol name="shopping" /></span>Shared Shopping</h2><button className="home-view-all" onClick={onSignIn}>View all</button></div>
    {state.household && <p className="shopping-count">{active.length} {active.length === 1 ? 'item' : 'items'} to buy</p>}
    {!state.authReady || state.loading ? <p role="status">Opening your shopping list…</p> : !state.session || !state.household ? <><p>{state.session ? 'Connect your home to see your shared list.' : 'Sign in to see your shared shopping list.'}</p><button className="text-action" onClick={onSignIn}>{state.session ? 'Connect home' : 'Sign in'} →</button></> : <>
      {active.length === 0 ? !state.error && <p className="us-shopping-empty">All caught up! Your shopping list is empty.</p> : <div className="us-shopping-list">{(showAll ? active : active.slice(0, 3)).map(item => <div className="us-shopping-item" key={item.id}>
        <input aria-label={`Mark ${item.name} as purchased`} type="checkbox" checked={item.bought} disabled={state.busy || !navigator.onLine} onChange={() => { void state.markBought(item).then(success => { if (success) setUndoItem(item); }); }} />
        <button type="button" className="us-shopping-open" onClick={() => setDetail(item)}><span className="shopping-thumb" aria-hidden="true">{shoppingPhoto(item, state.favoritePhotos, state.petFoodPhotos) ? <img src={shoppingPhoto(item, state.favoritePhotos, state.petFoodPhotos)!} alt="" /> : <ProductIllustration name={item.pet_food_id ? petFoodIllustrationName(item.name, item.notes) : item.name} />}</span><span className="us-shopping-copy"><strong>{item.name}</strong><small className="us-shopping-details">{[item.category, item.notes].filter(Boolean).join(' · ')}</small></span></button>
      </div>)}{active.length > 3 && <button className="dashboard-show-all" onClick={() => setShowAll(!showAll)}>{showAll ? 'Show less' : `Show all (${active.length})`}</button>}</div>}
      <div className="us-shopping-shortcuts" role="group" aria-label="Shopping categories">{(['Home', 'Pets', 'Kids'] as const).map(category => <button key={category} onClick={() => onCategory(category)}><span>{category}</span><strong>{active.filter(item => item.category === category).length}</strong></button>)}</div>
      {state.error && <p className="feedback error-message" role="alert">{state.error}</p>}
      {state.notice && <p className="feedback" role="status">{state.notice}</p>}
      <button type="button" className="home-shopping-add" onClick={onAdd}>+ Add item</button>
      {detail && <ShoppingItemDetail item={detail} photo={shoppingPhoto(detail, state.favoritePhotos, state.petFoodPhotos)} onClose={() => setDetail(null)} />}
    </>}
    {undoItem && <div className="purchase-toast" role="status">Marked as purchased.<button type="button" onClick={() => { void state.markBought(undoItem).then(success => { if (success) setUndoItem(null); }); }}>Undo</button></div>}
  </section>;
}
