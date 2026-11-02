import type { FolderEntriesState } from './useFolderEntries';
import './collections.css';

const labels = {
  recipe: { heading: `Recipes`, title: `Recipe name`, notes: `Recipe (optional)`, add: `Add recipe` },
  wish: { heading: `Wishlist`, title: `Wish`, notes: `Note (optional)`, add: `Add wish` },
  place: { heading: `Places`, title: `Place name`, notes: `Address or note (optional)`, add: `Add place` },
};
export function FolderEntries({ state, onSignIn }: { state: FolderEntriesState; onSignIn: () => void }) {
  const copy = labels[state.kind];
  const disabled = state.busy || !state.online;
  const draft = state.drafts[state.kind];
  return <section className="preview-page collection-page" lang="en">
    <p className="eyebrow">YOUR SHARED FOLDER</p><h1>{copy.heading}<span>.</span></h1>
    {!state.authReady || state.contextLoading ? <p role="status">Opening your folder…</p>
      : !state.userId || !state.household ? <section className="dashboard-card">
        <h2>{state.userId ? `Connect your home` : `Sign in to your account`}</h2>
        <p>This folder is shared by both accounts in your home. {state.userId ? `Connect your home in Shopping to save entries.` : `Sign in through Shopping to save entries.`}</p>
        <button className="primary" onClick={onSignIn}>{state.userId ? `Connect home` : `Sign in through Shopping`}</button>
      </section> : <>
        <p className="page-intro">Saved entries are shared with both members of your home. Changes appear on both phones.</p>
        {state.isPoc && <p className="notice">Shared POC test space. Please don’t add sensitive personal information.</p>}
        {!state.online && <p className="notice" role="status">You’re offline. Your text stays here. Connect to save it.</p>}
        {state.error && <p className="feedback error-message" role="alert">{state.error}</p>}
        {state.notice && <p className="feedback" role="status">{state.notice}</p>}
        {state.loading ? <p role="status">Loading saved entries…</p> : state.entries.filter((entry) => entry.kind === state.kind).length === 0 && <section className="dashboard-card collection-empty"><h2>This folder is empty for now.</h2><p>Add your first entry below.</p></section>}
        <div className="collection-list">
          {state.entries.filter((entry) => entry.kind === state.kind).map((entry) => <article key={entry.id} className="dashboard-card">
            {state.edit?.id === entry.id ? <form className="note-form" onSubmit={(event) => { event.preventDefault(); void state.saveEdit(); }}>
              <h2>Edit entry</h2>
              <label htmlFor="collection-edit-title">{copy.title}</label>
              <input id="collection-edit-title" required maxLength={150} disabled={state.busy} value={state.edit.title} onChange={(event) => state.setEditField(`title`, event.target.value)} />
              <label htmlFor="collection-edit-notes">{copy.notes}</label>
              <textarea id="collection-edit-notes" rows={6} maxLength={20000} disabled={state.busy} value={state.edit.notes} onChange={(event) => state.setEditField(`notes`, event.target.value)} />
              <button className="primary" type="submit" disabled={disabled || !state.edit.title.trim()}>Save changes</button>
              <button className="text-action" type="button" disabled={state.busy} onClick={state.cancelEdit}>Cancel changes</button>
            </form> : <>
              <h2>{entry.title}</h2>
              {entry.notes && <p className="collection-notes">{entry.notes}</p>}
              <div className="collection-actions"><button className="text-action" disabled={state.busy} aria-label={`Edit ${entry.title}`} onClick={() => state.startEdit(entry)}>Edit</button>
                <button className="text-action" disabled={disabled} aria-label={`Delete ${entry.title}`} onClick={() => {
                  if (window.confirm(`Remove “${entry.title}” from the shared folder for both of you?`)) void state.remove(entry);
                }}>Delete</button></div>
            </>}
          </article>)}
        </div>
        <form className="note-form" onSubmit={(event) => { event.preventDefault(); void state.add(); }}>
          <h2>{copy.add}</h2>
          <label htmlFor="collection-add-title">{copy.title}</label>
          <input id="collection-add-title" required maxLength={150} disabled={state.busy} value={draft.title} onChange={(event) => state.setDraft(`title`, event.target.value)} />
          <label htmlFor="collection-add-notes">{copy.notes}</label>
          <textarea id="collection-add-notes" rows={6} maxLength={20000} disabled={state.busy} value={draft.notes} onChange={(event) => state.setDraft(`notes`, event.target.value)} />
          <button className="primary" disabled={disabled || !draft.title.trim()} type="submit">{state.busy ? `Saving…` : copy.add}</button>
          <p className="small-print">This entry is saved online in your home’s shared folder.</p>
        </form>
      </>}
  </section>;
}
export default FolderEntries;
