import { Symbol } from '../ui/Symbol';
import { ProductIllustration, petFoodIllustrationName } from './ProductIllustration';
import { useEffect, useState } from "react";
import { euro, packPrice } from '../pricing/recipeCost';
import type { ShoppingItem, SharedShoppingState } from "./useSharedShopping";
import QuickAdd from "./QuickAdd";
import PetFoodShopping from "./PetFoodShopping";
import ShoppingCollections from './ShoppingCollections';
import ShoppingItemDetail, { shoppingPhoto, shoppingDisplayName } from './ShoppingItemDetail';
import './shopping-unified.css';

export default function SharedShopping({
  state,
  initialCategory = null,
}: {
  state: SharedShoppingState;
  initialCategory?: ShoppingItem[`category`] | null;
}) {
  const [mode, setMode] = useState<`poc` | `signin` | `signup`>(`poc`);
  const [resumeDraft, setResumeDraft] = useState(false);
  const [search, setSearch] = useState('');
  const [quickOpen, setQuickOpen] = useState(false);
  const [filter, setFilter] = useState<ShoppingItem[`category`] | null>(initialCategory);
  const [copied, setCopied] = useState(false);
  const [detail, setDetail] = useState<ShoppingItem | null>(null);
  const [undoItem, setUndoItem] = useState<ShoppingItem | null>(null);
  const [purchasedOpen, setPurchasedOpen] = useState(false);
  useEffect(() => {
    if (!undoItem) return;
    const timer = window.setTimeout(() => setUndoItem(null), 5000);
    return () => clearTimeout(timer);
  }, [undoItem]);
  const feedback = (
    <>
      {state.error && (
        <p className="feedback error-message" role="alert">
          {state.error}
        </p>
      )}
      {state.notice && (
        <p className="feedback" role="status">
          {state.notice}
        </p>
      )}
    </>
  );
  if (!state.authReady)
    return (
      <section className="preview-page">
        <h1>
          Shopping<span>.</span>
        </h1>
        <p role="status">Opening your space…</p>
      </section>
    );
  if (!state.session)
    return (
      <section className="preview-page shared-shopping">
        <p className="eyebrow">A REAL SPACE FOR THE TWO OF YOU</p>
        <h1>
          Shopping<span>.</span>
        </h1>
        <p className="page-intro">
          {mode === `poc`
            ? `Sign in as masha or damian with your POC password. Both accounts share the same test shopping list.`
            : `Sign in with your own account. Your partner uses a separate account, and an invitation brings your lists together.`}
        </p>
        <form
          className="note-form"
          onSubmit={(event) => {
            event.preventDefault();
            if (mode === `poc`) void state.authenticatePoc();
            else void state.authenticate(mode === `signup`);
          }}
        >
          <h2>{mode === `signup` ? `Create your account` : `Welcome back`}</h2>
          {mode === `poc` ? (
            <>
              <label htmlFor="account-username">Username</label>
              <input
                id="account-username"
                type="text"
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                placeholder="masha or damian"
                required
                value={state.username}
                onChange={(event) => state.setUsername(event.target.value)}
              />
            </>
          ) : (
            <>
              <label htmlFor="account-email">Your email</label>
              <input
                id="account-email"
                type="email"
                autoComplete="email"
                required
                value={state.email}
                onChange={(event) => state.setEmail(event.target.value)}
              />
            </>
          )}
          <label htmlFor="account-password">Password</label>
          <input
            id="account-password"
            type="password"
            minLength={mode === `signup` ? 8 : undefined}
            autoComplete={
              mode === `signup` ? `new-password` : `current-password`
            }
            required
            value={state.password}
            onChange={(event) => state.setPassword(event.target.value)}
          />
          <button className="primary" disabled={state.busy} type="submit">
            {state.busy
              ? `Please wait…`
              : mode === `signup`
                ? `Create account`
                : `Sign in`}
          </button>
          <button
            className="text-action"
            type="button"
            disabled={state.busy}
            onClick={() => {
              state.setPassword(``);
              setMode(
                mode === `poc`
                  ? `signin`
                  : mode === `signup`
                    ? `signin`
                    : `signup`,
              );
            }}
          >
            {mode === `poc`
              ? `Use a personal email account`
              : mode === `signup`
                ? `I already have an account`
                : `I’m new here — create an account`}
          </button>
          {mode !== `poc` && (
            <button
              className="text-action"
              type="button"
              disabled={state.busy}
              onClick={() => {
                state.setPassword(``);
                setMode(`poc`);
              }}
            >
              Use masha / damian login
            </button>
          )}
          <p className="small-print">
            {mode === `poc`
              ? `POC test accounts — don’t enter sensitive information. No email confirmation is needed.`
              : `Your personal purchases are visible only to the accounts in your home.`}{" "}
            Personal notes stay on this phone and are never uploaded.
          </p>
        </form>
        {feedback}
      </section>
    );
  return (
    <section className="preview-page shared-shopping shopping-unified">
      <div className="shopping-page-heading"><div><h1>Shopping<span>.</span></h1><p className="page-intro">{state.household ? 'Our shared shopping list' : 'One of you creates a home. The other joins with an invitation code.'}</p></div>{state.household && <button className="shopping-refresh" aria-label="Refresh shopping list" disabled={state.busy} onClick={() => void state.refresh()}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 7v5h-5M4 17v-5h5"/><path d="M6.5 9A7 7 0 0 1 19 7l1 5M4 12l1 5a7 7 0 0 0 12.5-2"/></svg></button>}</div>
      {state.isPoc && (
        <p className="notice">
          POC test space shared by the Masha and Damian accounts. Don’t enter
          sensitive personal information.
        </p>
      )}
      {state.loading ? (
        <p role="status">Opening your shared list…</p>
      ) : !state.household ? (
        <>
          <section className="dashboard-card">
            <h2>Start your home</h2>
            <p className="page-intro">
              Create it once, then invite your partner.
            </p>
            <button
              className="primary"
              disabled={state.busy}
              onClick={() => {
                void state.createHome();
              }}
            >
              Create our home
            </button>
          </section>
          <form
            className="note-form"
            onSubmit={(event) => {
              event.preventDefault();
              void state.joinHome();
            }}
          >
            <h2>Have an invitation?</h2>
            <label htmlFor="partner-code">
              Invitation code from your partner
            </label>
            <input
              id="partner-code"
              value={state.code}
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              onChange={(event) => state.setCode(event.target.value)}
              required
              pattern="[a-fA-F0-9]{64}"
            />
            <button className="primary" disabled={state.busy}>
              Join our home
            </button>
          </form>
        </>
      ) : (
        <>
          {state.memberCount < 2 && (
            <section className="invite-card">
              <h2>Invite your partner</h2>
              <p>
                They create their own account and enter your code. It works once
                and expires after 48 hours. A new code replaces the old one.
              </p>
              <button
                className="primary"
                disabled={state.busy}
                onClick={() => {
                  setCopied(false);
                  void state.createInvite();
                }}
              >
                {state.invite ? `Create a new code` : `Create invitation code`}
              </button>
              {state.invite && (
                <>
                  <label htmlFor="your-invitation">
                    Your private invitation code
                  </label>
                  <textarea
                    id="your-invitation"
                    readOnly
                    value={state.invite}
                    rows={3}
                  />
                  <button
                    className="text-action"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(state.invite);
                        setCopied(true);
                      } catch {
                        setCopied(false);
                      }
                    }}
                  >
                    {copied ? `Copied` : `Copy code`}
                  </button>
                  <p className="small-print">
                    Share this code only with your partner. If copying doesn’t
                    work, select the code above.
                  </p>
                </>
              )}
            </section>
          )}
          <div className="shopping-toolbar">
            <button className="primary shopping-quick-primary" aria-label="+ Quick Add Item" onClick={() => setQuickOpen(true)}><span aria-hidden="true">＋</span> Quick Add Item</button>
            <label className="shopping-search-label" htmlFor="shopping-search">Search shopping list</label>
            <div className="shopping-search"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4 4"/></svg><input id="shopping-search" type="search" placeholder="Search shopping list" value={search} onChange={event => setSearch(event.target.value)} /></div>
            <div className="shopping-filters" role="group" aria-label="Shopping categories">{([null, 'Home', 'Pets', 'Kids'] as const).map(category => <button type="button" key={category ?? 'All'} data-category={(category ?? 'All').toLowerCase()} aria-pressed={filter === category} onClick={() => setFilter(category)}><span className="shopping-filter-icon"><Symbol name={category === 'Home' ? 'home' : category === 'Pets' ? 'pet' : category === 'Kids' ? 'family' : 'shopping'} /></span><span className="shopping-filter-copy"><span>{category ?? 'All'}</span><small>{category === 'Home' ? 'Kitchen & living' : category === 'Pets' ? 'Pet essentials' : category === 'Kids' ? 'Essentials' : 'Everything'}</small></span><strong>{state.items.filter(item => !item.bought && (category === null || item.category === category)).length}</strong></button>)}</div>
          </div>
          <ShoppingCollections state={state} />
          {(state.draft.trim() || state.draftNotes.trim() || resumeDraft) && <section className="shopping-existing-draft">
            {!resumeDraft ? <button className="text-action" onClick={() => setResumeDraft(true)}>Resume unfinished item</button> : <form className="note-form" onSubmit={event => { event.preventDefault(); void state.add().then(success => { if (success) setResumeDraft(false); }); }}>
              <h2>Unfinished item</h2><label htmlFor="purchase-name">Item name</label><input id="purchase-name" value={state.draft} maxLength={200} required disabled={state.busy} onChange={event => state.setDraft(event.target.value)} />
              <label htmlFor="purchase-notes">Details (optional)</label><input id="purchase-notes" value={state.draftNotes} maxLength={2000} disabled={state.busy} onChange={event => state.setDraftNotes(event.target.value)} />
              <label htmlFor="purchase-category">Category</label><select id="purchase-category" value={state.category} disabled={state.busy} onChange={event => state.setCategory(event.target.value as ShoppingItem['category'])}><option>Home</option><option>Pets</option><option>Kids</option></select>
              <button className="primary" disabled={state.busy || !state.draft.trim() || !navigator.onLine}>Add purchase</button><button type="button" className="text-action" onClick={() => setResumeDraft(false)}>Close</button>
            </form>}
          </section>}
          {filter === 'Pets' && <details className="shopping-pet-essentials"><summary>Pet Essentials</summary><PetFoodShopping state={state} /></details>}
          {(() => {
            const query = search.trim().toLocaleLowerCase();
            const visible = state.items.filter(item => (filter === null || item.category === filter) && (!query || `${item.name} ${item.notes}`.toLocaleLowerCase().includes(query)));
            const active = visible.filter(item => !item.bought);
            const purchased = visible.filter(item => item.bought);
            const prices = active.map(item => packPrice(item.name));
            const total = prices.reduce<number>((sum, price) => sum + (price ?? 0), 0);
            const unpriced = prices.filter(price => price === null).length;
            const row = (item: ShoppingItem) => <div className={`shopping-list-row${item.bought ? ' is-bought' : ''}`} key={item.id}>
              <input aria-label={item.bought ? `Return ${item.name} to active list` : `Mark ${item.name} as purchased`} type="checkbox" checked={item.bought} disabled={state.busy || !navigator.onLine} onChange={() => { void state.markBought(item).then(success => { if (success && !item.bought) setUndoItem(item); }); }} />
              <button type="button" className="shopping-row-open" onClick={() => setDetail(item)}><span className="shopping-thumb" aria-hidden="true">{shoppingPhoto(item, state.favoritePhotos, state.petFoodPhotos) ? <img src={shoppingPhoto(item, state.favoritePhotos, state.petFoodPhotos)!} alt="" /> : <ProductIllustration name={item.pet_food_id ? petFoodIllustrationName(item.name, item.notes) : item.name} />}</span><span className="shopping-row-copy"><strong>{shoppingDisplayName(item)}</strong><small><span className="shopping-row-category" data-category={item.category.toLowerCase()}>{item.category}</span>{item.notes && <span className="shopping-row-details">{item.notes}</span>}</small></span></button>
            </div>;
            return <><h2 className="shopping-list-heading">Shopping list <span>{active.length}</span></h2>{total > 0 && <p className="shopping-total">Estimated total: <strong>≈ {euro(total)}</strong>{unpriced ? ` · ${unpriced} without price` : ''}</p>}<section className="shopping-active-list" aria-label="Items to buy">{active.length ? active.map(row) : <p className="shopping-empty">{query ? 'No items match your search.' : 'Your shopping list is empty.'}</p>}</section>
              {purchased.length > 0 && <details className="purchased-list shopping-purchased" open={purchasedOpen} onToggle={event => setPurchasedOpen(event.currentTarget.open)}><summary>Purchased ({purchased.length})</summary><div className="shopping-active-list">{purchased.map(row)}</div></details>}</>;
          })()}
          {quickOpen && <QuickAdd category={filter ?? 'Home'} dashboard state={state} onClose={() => setQuickOpen(false)} />}
          {detail && <ShoppingItemDetail item={detail} photo={shoppingPhoto(detail, state.favoritePhotos, state.petFoodPhotos)} addedBy={detail.created_by === state.session.user.id ? 'You' : detail.created_by ? 'Your partner' : 'A former member'} onClose={() => setDetail(null)} onEdit={() => { state.startEdit(detail); setDetail(null); }} onDelete={() => { if (window.confirm(`Remove “${detail.name}” from your shared list?`)) void state.remove(detail).then(success => { if (success) setDetail(null); }); }} busy={state.busy} />}
          {state.edit && <div className="shopping-detail-overlay"><form className="shopping-detail-card shopping-edit" role="dialog" aria-modal="true" aria-labelledby="shopping-edit-title" onSubmit={event => { event.preventDefault(); void state.saveEdit(); }}><h2 id="shopping-edit-title">Edit item</h2>
            <label htmlFor="edit-purchase">Item name</label><input id="edit-purchase" value={state.edit.name} maxLength={200} required onChange={event => state.setEditName(event.target.value)} />
            <label htmlFor="edit-notes">Details (optional)</label><textarea id="edit-notes" rows={3} maxLength={20000} value={state.edit.notes} onChange={event => state.setEditNotes(event.target.value)} />
            <label htmlFor="edit-category">Category</label><select id="edit-category" value={state.edit.category} onChange={event => state.setEditCategory(event.target.value as ShoppingItem['category'])}><option>Home</option><option>Pets</option><option>Kids</option></select>
            {state.error && <p className="feedback error-message" role="alert">{state.error}</p>}<div className="shopping-edit-actions"><button className="primary" disabled={state.busy || !state.edit.name.trim() || !navigator.onLine}>Save item</button><button type="button" className="text-action" disabled={state.busy} onClick={state.cancelEdit}>Cancel</button></div>
          </form></div>}
          {undoItem && <div className="purchase-toast" role="status">Marked as purchased.<button type="button" onClick={() => { void state.markBought(undoItem).then(success => { if (success) setUndoItem(null); }); }}>Undo</button></div>}

        </>
      )}
      {!quickOpen && feedback}
    </section>
  );
}
