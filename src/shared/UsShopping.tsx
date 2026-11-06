import { useEffect, useRef, useState } from 'react';
import { Symbol } from '../ui/Symbol';
import QuickAdd from './QuickAdd';
import type { ShoppingItem, SharedShoppingState } from './useSharedShopping';
import ShoppingItemDetail, { shoppingPhoto } from './ShoppingItemDetail';

export default function UsShopping({ state, onCategory, onSignIn }: { state: SharedShoppingState; onCategory: (category: ShoppingItem['category']) => void; onSignIn: () => void }) {
  const [adding, setAdding] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [detail, setDetail] = useState<ShoppingItem | null>(null);
  const [undoItem, setUndoItem] = useState<ShoppingItem | null>(null);
  const [purchasedOpen, setPurchasedOpen] = useState(true);
  const active = state.items.filter(item => !item.bought);
  const purchased = state.items.filter(item => item.bought);
  const previousActive = useRef(active.length);
  useEffect(() => { if (previousActive.current > 0 && active.length === 0) setExpanded(false); previousActive.current = active.length; }, [active.length]);
  useEffect(() => { if (!undoItem) return; const timer = window.setTimeout(() => setUndoItem(null), 5000); return () => clearTimeout(timer); }, [undoItem]);
  return <section className={`dashboard-card us-shopping${active.length ? ' dashboard-active' : ''}`} aria-labelledby="us-shopping-title">
    <div className="us-shopping-heading"><h2 id="us-shopping-title"><button className="dashboard-heading-button" aria-expanded={state.session && state.household && !active.length ? expanded : undefined} onClick={() => { if (state.session && state.household && !active.length) setExpanded(value => !value); else onSignIn(); }}><span className="dashboard-icon"><Symbol name="shopping" /></span>Shopping{state.session && state.household && !active.length && <span className="shopping-expand-indicator" aria-hidden="true">{expanded ? '⌃' : '⌄'}</span>}</button></h2>{state.household && <span>{active.length} {active.length === 1 ? 'item' : 'items'}</span>}</div>
    {!state.authReady || state.loading ? <p role="status">Opening your shopping list…</p> : !state.session || !state.household ? <><p>{state.session ? 'Connect your home to see your shared list.' : 'Sign in to see your shared shopping list.'}</p><button className="text-action" onClick={onSignIn}>{state.session ? 'Connect home' : 'Sign in'} →</button></> : (active.length > 0 || expanded) ? <>
      {!active.length && <button className="text-action" onClick={onSignIn}>Open Shopping →</button>}
      <div className="us-shopping-shortcuts" role="group" aria-label="Shopping categories">{(['Home', 'Pets', 'Kids'] as const).map(category => <button key={category} onClick={() => onCategory(category)}><span>{category}</span><strong>{active.filter(item => item.category === category).length}</strong></button>)}</div>
      <button className="primary us-shopping-add" onClick={() => setAdding(true)}>+ Add item</button>
      {adding && <div className="shared-shopping"><QuickAdd category="Home" state={state} onClose={() => setAdding(false)} dashboard /></div>}
      {state.error && <p className="feedback error-message" role="alert">{state.error}</p>}
      {state.notice && <p className="feedback" role="status">{state.notice}</p>}
      {active.length === 0 ? !state.error && <p className="us-shopping-empty">All caught up! Your shopping list is empty.</p> : <div className="us-shopping-list">{(showAll ? active : active.slice(0, 3)).map(item => <div className="us-shopping-item" key={item.id}>
        <input aria-label={`Mark ${item.name} as purchased`} type="checkbox" checked={item.bought} disabled={state.busy || !navigator.onLine} onChange={() => { void state.markBought(item).then(success => { if (success) { setPurchasedOpen(true); setUndoItem(item); } }); }} />
        <button type="button" className="us-shopping-open" onClick={() => setDetail(item)}><span className="shopping-thumb" aria-hidden="true">{shoppingPhoto(item, state.favoritePhotos, state.petFoodPhotos) ? <img src={shoppingPhoto(item, state.favoritePhotos, state.petFoodPhotos)!} alt="" /> : <Symbol name="shopping" />}</span><span className="us-shopping-copy"><strong>{item.name}</strong><small className="us-shopping-details">{[item.category, item.notes].filter(Boolean).join(' · ')}</small></span></button>
      </div>)}{active.length > 3 && <button className="dashboard-show-all" onClick={() => setShowAll(!showAll)}>{showAll ? 'Show less' : `Show all (${active.length})`}</button>}</div>}
      {purchased.length > 0 && <details className="purchased-list" open={purchasedOpen} onToggle={event => setPurchasedOpen((event.currentTarget as HTMLDetailsElement).open)}><summary>Purchased ({purchased.length})</summary><div className="us-shopping-list">{purchased.map(item => <div className="us-shopping-item is-bought" key={item.id}><input aria-label={`Return ${item.name} to active list`} type="checkbox" checked disabled={state.busy || !navigator.onLine} onChange={() => { void state.markBought(item); }} /><button type="button" className="us-shopping-open" onClick={() => setDetail(item)}><span className="shopping-thumb" aria-hidden="true">{shoppingPhoto(item, state.favoritePhotos, state.petFoodPhotos) ? <img src={shoppingPhoto(item, state.favoritePhotos, state.petFoodPhotos)!} alt="" /> : <Symbol name="shopping" />}</span><span className="us-shopping-copy"><strong>{item.name}</strong><small>{item.category}</small></span></button></div>)}</div></details>}
      {detail && <ShoppingItemDetail item={detail} photo={shoppingPhoto(detail, state.favoritePhotos, state.petFoodPhotos)} onClose={() => setDetail(null)} />}
    </> : state.error ? <p className="feedback error-message" role="alert">{state.error}</p> : null}
    {undoItem && <div className="purchase-toast" role="status">Marked as purchased.<button type="button" onClick={() => { void state.markBought(undoItem).then(success => { if (success) setUndoItem(null); }); }}>Undo</button></div>}
  </section>;
}
