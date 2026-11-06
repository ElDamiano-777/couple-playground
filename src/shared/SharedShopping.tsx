import { useEffect, useState } from "react";
import type { ShoppingItem, SharedShoppingState } from "./useSharedShopping";
import QuickAdd from "./QuickAdd";
import { Symbol } from "../ui/Symbol";
import PetFoodShopping from "./PetFoodShopping";
import ShoppingItemDetail, { shoppingPhoto } from './ShoppingItemDetail';

export default function SharedShopping({
  state,
  hasOtherDraft = false,
  initialCategory = null,
}: {
  state: SharedShoppingState;
  hasOtherDraft?: boolean;
  initialCategory?: ShoppingItem[`category`] | null;
}) {
  const [mode, setMode] = useState<`poc` | `signin` | `signup`>(`poc`);
  const [adding, setAdding] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);
  const [filter, setFilter] = useState<ShoppingItem[`category`] | null>(initialCategory);
  const [copied, setCopied] = useState(false);
  const [detail, setDetail] = useState<ShoppingItem | null>(null);
  const [undoItem, setUndoItem] = useState<ShoppingItem | null>(null);
  const [purchasedOpen, setPurchasedOpen] = useState(true);
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
    <section className="preview-page shared-shopping">
      <p className="eyebrow">THE LITTLE THINGS WE NEED</p>
      <h1>
        Shopping<span>.</span>
      </h1>
      <p className="page-intro">
        {state.household
          ? `Your shared list. Changes appear automatically while the app is open.`
          : `One of you creates a home. The other joins with an invitation code.`}
      </p>
      <div className="account-line">
        <span>
          Signed in as{" "}
          {state.isPoc
            ? `${state.pocUsername === `masha` ? `Masha` : `Damian`} · POC`
            : state.session.user.email}
        </span>
        <button
          disabled={state.busy}
          onClick={() => {
            if (
              !(state.dirty || hasOtherDraft) ||
              window.confirm(
                `Sign out and discard unfinished text? Your saved items stay in your home.`,
              )
            )
              void state.signOut().then(success => { if (success) { setFilter(null); setAdding(false); setQuickOpen(false); } });
          }}
        >
          Sign out
        </button>
      </div>
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
          {!filter ? <div className="shopping-categories" role="group" aria-label="Shopping categories">
            {([
              { name: `Home`, icon: `🏠`, description: `Household and everyday shopping`, style: `home` },
              { name: `Pets`, icon: `🐾`, description: `Food, treats, litter and pet supplies`, style: `pets` },
              { name: `Kids`, icon: `🧸`, description: `Children’s products and essentials`, style: `kids` },
            ] as const).map(item => <button className={`shopping-category shopping-category-${item.style}`} key={item.name} onClick={() => { if (!state.draft.trim() && !state.draftNotes.trim()) state.setCategory(item.name); setFilter(item.name); }}>
              <span className="shopping-category-icon" aria-hidden="true">{item.icon}</span><span className="shopping-category-copy"><strong>{item.name}</strong><small>{item.description}</small></span><span className="shopping-category-arrow" aria-hidden="true">→</span>
            </button>)}
          </div> : <>
          <button className="text-action shopping-back" disabled={state.busy} onClick={() => { setAdding(false); setQuickOpen(false); setFilter(null); }}>← Shopping</button>
          {quickOpen ? <QuickAdd category={filter} state={state} onClose={() => setQuickOpen(false)} /> : <>
          {filter === `Pets` && <PetFoodShopping state={state} />}
          <button className="quick-open" onClick={() => setQuickOpen(true)}>✦ Quick Add</button>
          <button className="add-fab" aria-label="Add purchase" onClick={() => { if (!state.draft.trim() && !state.draftNotes.trim()) state.setCategory(filter); setAdding(true); }}>+</button>
          {adding && <form
            className="note-form add-sheet"
            onSubmit={(event) => {
              event.preventDefault();
              const target = state.category;
              void state.add().then(success => { if (success) { setFilter(target); setAdding(false); } });
            }}
          >
            <button className="text-action" type="button" onClick={() => setAdding(false)}>Close</button>
            <h2>Add a little something</h2>
            <label htmlFor="purchase-name">What do we need?</label>
            <input
              id="purchase-name"
              disabled={state.busy}
              value={state.draft}
              onChange={(event) => state.setDraft(event.target.value)}
              maxLength={200}
              required
              placeholder="Milk, bread, pet food…"
            />
            <label htmlFor="purchase-notes">Details (optional)</label>
            <input id="purchase-notes" maxLength={2000} disabled={state.busy} value={state.draftNotes} placeholder="Brand, flavor, quantity, size or notes" onChange={event => state.setDraftNotes(event.target.value)} />
            <label htmlFor="purchase-category">For whom?</label>
            <select
              id="purchase-category"
              disabled={state.busy}
              value={state.category}
              onChange={(event) =>
                state.setCategory(event.target.value as typeof state.category)
              }
            >
              <option>Home</option>
              <option>Kids</option>
              <option>Pets</option>
            </select>
            <button
              className="primary"
              disabled={state.busy || !state.draft.trim() || !navigator.onLine}
            >
              Add purchase
            </button>
          </form>}
          <section className="dashboard-card">
            <div className="card-heading">
              <h2>{filter} shopping</h2>
              <button
                className="refresh-list"
                disabled={state.busy}
                onClick={() => {
                  void state.refresh();
                }}
              >
                Refresh
              </button>
            </div>
            {!state.items.some(item => item.category === filter) && (
              <p className="page-intro">
                Your list is empty. Add the first thing you need.
              </p>
            )}

            <div className="grocery-list">
              {state.items
                .filter((item) => filter === item.category && !item.bought)
                .map((item) => (
                  <div
                    className="grocery-row"
                    key={item.id}
                  >
                    {state.edit?.id === item.id ? <form className="shopping-edit" onSubmit={event => { event.preventDefault(); void state.saveEdit(); }}>
                      <label htmlFor={`edit-purchase-${item.id}`}>Item name</label>
                      <input id={`edit-purchase-${item.id}`} value={state.edit.name} maxLength={200} required onChange={event => state.setEditName(event.target.value)} />
                      <label htmlFor={`edit-notes-${item.id}`}>Details (optional)</label>
                      <textarea id={`edit-notes-${item.id}`} rows={3} maxLength={20000} value={state.edit.notes} onChange={event => state.setEditNotes(event.target.value)} />
                      <label htmlFor={`edit-category-${item.id}`}>Category</label>
                      <select id={`edit-category-${item.id}`} value={state.edit.category} onChange={event => state.setEditCategory(event.target.value as ShoppingItem[`category`])}><option>Home</option><option>Pets</option><option>Kids</option></select>
                      <button className="primary" disabled={state.busy || !state.edit.name.trim() || !navigator.onLine}>Save item</button>
                      <button type="button" className="text-action" disabled={state.busy} onClick={state.cancelEdit}>Cancel</button>
                    </form> : <>
                    <input
                        aria-label={`Mark ${item.name} as purchased`}
                        type="checkbox"
                        checked={item.bought}
                        disabled={state.busy || !navigator.onLine}
                        onChange={() => {
                          void state.markBought(item).then(success => { if (success) { setPurchasedOpen(true); setUndoItem(item); } });
                        }}
                      />
                    <button type="button" className="shared-item-label shopping-item-open" onClick={() => setDetail(item)}>
                      <span className="shopping-thumb" aria-hidden="true">{item.pet_food_id && state.petFoodPhotos[item.pet_food_id] ? <img src={state.petFoodPhotos[item.pet_food_id]!} alt="" /> : item.favorite_id && state.favoritePhotos[item.favorite_id] ? <img src={state.favoritePhotos[item.favorite_id]!} alt="" /> : <Symbol name="shopping" />}</span>
                      <span className="grocery-copy">
                        <strong>{item.name}</strong>
                        {item.notes && <small className="shopping-item-notes">{item.notes}</small>}
                        <small>
                          {item.bought ? `Bought · ` : ``}{item.created_by === state.session?.user.id ? `Added by you` : item.created_by ? `Added by your partner` : `Added by a former member`}
                        </small>
                      </span>
                    </button>
                    <span
                      className={`category-tag ${item.category.toLowerCase()}`}
                    >
                      {item.category}
                    </span>
                    <button className="text-action shopping-edit-button" disabled={state.busy || !!state.edit} aria-label={`Edit ${item.name}`} onClick={() => state.startEdit(item)}>Edit</button>
                    <button
                      className="remove-purchase"
                      aria-label={`Remove ${item.name}`}
                      disabled={state.busy || !navigator.onLine}
                      onClick={() => {
                        if (
                          window.confirm(
                            `Remove “${item.name}” from your shared list?`,
                          )
                        )
                          void state.remove(item);
                      }}
                    >
                      ×
                    </button>
                    </>}
                  </div>
                ))}
            </div>
            {(() => {
              const purchased = state.items.filter(item => filter === item.category && item.bought);
              return purchased.length ? <details className="purchased-list" open={purchasedOpen} onToggle={event => setPurchasedOpen((event.currentTarget as HTMLDetailsElement).open)}><summary>Purchased ({purchased.length})</summary><div className="grocery-list">{purchased.map(item => <div className="grocery-row is-bought" key={item.id}><input aria-label={`Return ${item.name} to active list`} type="checkbox" checked disabled={state.busy || !navigator.onLine} onChange={() => { void state.markBought(item); }} /><button type="button" className="shared-item-label shopping-item-open" onClick={() => setDetail(item)}><span className="shopping-thumb" aria-hidden="true">{shoppingPhoto(item, state.favoritePhotos, state.petFoodPhotos) ? <img src={shoppingPhoto(item, state.favoritePhotos, state.petFoodPhotos)!} alt="" /> : <Symbol name="shopping" />}</span><span className="grocery-copy"><strong>{item.name}</strong>{item.notes && <small className="shopping-item-notes">{item.notes}</small>}<small>Bought · {item.created_by === state.session?.user.id ? `Added by you` : item.created_by ? `Added by your partner` : `Added by a former member`}</small></span></button><span className={`category-tag ${item.category.toLowerCase()}`}>{item.category}</span><button className="text-action shopping-edit-button" disabled={state.busy || !!state.edit} aria-label={`Edit ${item.name}`} onClick={() => state.startEdit(item)}>Edit</button><button className="remove-purchase" aria-label={`Remove ${item.name}`} disabled={state.busy || !navigator.onLine} onClick={() => { if (window.confirm(`Remove “${item.name}” from your shared list?`)) void state.remove(item); }}>×</button></div>)}</div></details> : null;
            })()}
            <p className="preview-hint">
              {state.isPoc
                ? `Both POC accounts share this test list. Don’t enter sensitive information.`
                : `Only the accounts in your home can open this list.`}{" "}
              Saved online. You’ll need a connection to change this list.
            </p>
          </section>
          {detail && <ShoppingItemDetail item={detail} photo={shoppingPhoto(detail, state.favoritePhotos, state.petFoodPhotos)} onClose={() => setDetail(null)} />}
          {undoItem && <div className="purchase-toast" role="status">Marked as purchased.<button type="button" onClick={() => { void state.markBought(undoItem).then(success => { if (success) setUndoItem(null); }); }}>Undo</button></div>}
          </>}
          </>}
        </>
      )}
      {!quickOpen && feedback}
    </section>
  );
}
