import { useState } from "react";
import type { SharedShoppingState } from "./useSharedShopping";
import PushSettings from './PushSettings';

export default function SharedShopping({
  state,
}: {
  state: SharedShoppingState;
}) {
  const [mode, setMode] = useState<`poc` | `signin` | `signup`>(`poc`);
  const [filter, setFilter] = useState(`All`);
  const [copied, setCopied] = useState(false);
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
              !state.dirty ||
              window.confirm(
                `Sign out and discard unfinished shopping text? Your saved purchases stay in your home.`,
              )
            )
              void state.signOut();
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
      {state.household && <PushSettings key={state.session.user.id} userId={state.session.user.id} />}
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
          <form
            className="note-form"
            onSubmit={(event) => {
              event.preventDefault();
              void state.add();
            }}
          >
            <h2>Add a little something</h2>
            <label htmlFor="purchase-name">What do we need?</label>
            <input
              id="purchase-name"
              value={state.draft}
              onChange={(event) => state.setDraft(event.target.value)}
              maxLength={200}
              required
              placeholder="Milk, bread, pet food…"
            />
            <label htmlFor="purchase-category">For whom?</label>
            <select
              id="purchase-category"
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
          </form>
          <div className="filter-tabs" aria-label="Shared shopping categories">
            {[`All`, `Home`, `Kids`, `Pets`].map((value) => (
              <button
                key={value}
                aria-pressed={filter === value}
                onClick={() => setFilter(value)}
              >
                {value}
              </button>
            ))}
          </div>
          <section className="dashboard-card">
            <div className="card-heading">
              <h2>Our shopping list</h2>
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
            {state.items.length === 0 && (
              <p className="page-intro">
                Your list is empty. Add the first thing you need.
              </p>
            )}
            {state.items.length > 0 &&
              !state.items.some(
                (item) => filter === `All` || filter === item.category,
              ) && <p className="page-intro">Nothing in this category yet.</p>}
            <div className="grocery-list">
              {state.items
                .filter((item) => filter === `All` || filter === item.category)
                .sort((a, b) => Number(a.bought) - Number(b.bought))
                .map((item) => (
                  <div
                    className={`grocery-row ${item.bought ? `is-bought` : ``}`}
                    key={item.id}
                  >
                    <label className="shared-item-label">
                      <input
                        type="checkbox"
                        checked={item.bought}
                        disabled={state.busy || !navigator.onLine}
                        onChange={() => {
                          void state.markBought(item);
                        }}
                      />
                      <span className="grocery-copy">
                        <strong>{item.name}</strong>
                        <small>
                          {item.bought
                            ? `Bought`
                            : item.created_by === state.session?.user.id
                              ? `Added by you`
                              : `Added by your partner`}
                        </small>
                      </span>
                    </label>
                    <span
                      className={`category-tag ${item.category.toLowerCase()}`}
                    >
                      {item.category}
                    </span>
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
                  </div>
                ))}
            </div>
            <p className="preview-hint">
              {state.isPoc
                ? `Both POC accounts share this test list. Don’t enter sensitive information.`
                : `Only the accounts in your home can open this list.`}{" "}
              Saved online. You’ll need a connection to change this list.
            </p>
          </section>
        </>
      )}
      {feedback}
      {!state.isPoc && (
        <details className="account-options">
          <summary>Account options</summary>
          <p>
            Deleting your account removes your sign-in and membership. Purchases
            remain for your partner; if you are the last person, the home and
            its purchases are deleted. Personal notes on this phone are kept.
          </p>
          <button
            className="text-action"
            disabled={state.busy}
            onClick={() => {
              if (
                window.confirm(
                  `Permanently delete your account? Your partner keeps the shared purchases. If you are the last person, the home and purchases will also be deleted. This cannot be undone.`,
                )
              )
                void state.deleteAccount();
            }}
          >
            Delete my account
          </button>
        </details>
      )}
    </section>
  );
}
