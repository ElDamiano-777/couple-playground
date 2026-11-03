import { useState, type FormEvent } from 'react';
import { readPhoto } from '../family/petPhoto';
import { Symbol } from '../ui/Symbol';
import type { FolderEntriesState, FolderEntry } from './useFolderEntries';
import './collections.css';
import './recipes.css';

const categories = ['Breakfast', 'Lunch', 'Dinner', 'Snacks', 'Desserts'] as const;

type RecipeDraft = { title: string; notes: string; recipe_category: string; preparation_minutes: string; recipe_photo: string };

function RecipeForm({ draft, setField, busy, online, onSave, onClose, editing, legacyNotes, error }: {
  draft: RecipeDraft; setField: (field: keyof RecipeDraft, value: string) => void;
  busy: boolean; online: boolean; onSave: () => void; onClose: () => void; editing: boolean; legacyNotes?: boolean; error: string;
}) {
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoError, setPhotoError] = useState('');
  async function choosePhoto(file?: File) {
    if (!file) return;
    setPhotoBusy(true); setPhotoError('');
    try {
      const photo = await readPhoto(file);
      if (photo.length > 1400000) throw new Error('Photo too large');
      setField('recipe_photo', photo);
    } catch { setPhotoError('Could not use that photo. Try another image.'); }
    finally { setPhotoBusy(false); }
  }
  function submit(event: FormEvent) { event.preventDefault(); onSave(); }
  return <form className="note-form add-sheet recipe-form" onSubmit={submit}>
    <button className="text-action recipe-form-close" type="button" disabled={busy || photoBusy} onClick={onClose}>Close</button>
    <h2>{editing ? 'Edit recipe' : 'Add Recipe'}</h2>
    <label htmlFor="recipe-name">Recipe name</label>
    <input id="recipe-name" required maxLength={150} value={draft.title} disabled={busy} onChange={event => setField('title', event.target.value)} />
    <label htmlFor="recipe-category">Category</label>
    <select id="recipe-category" required={!editing} value={draft.recipe_category} disabled={busy} onChange={event => setField('recipe_category', event.target.value)}><option value="">Choose a category</option>{categories.map(category => <option key={category}>{category}</option>)}</select>
    <label htmlFor="recipe-time">Preparation time (minutes)</label>
    <input id="recipe-time" type="number" inputMode="numeric" min="1" max="10080" step="1" required={!editing} value={draft.preparation_minutes} disabled={busy} onChange={event => setField('preparation_minutes', event.target.value)} />
    <label htmlFor="recipe-photo">Recipe photo (optional)</label>
    <input id="recipe-photo" type="file" accept="image/*" disabled={busy || photoBusy} onChange={event => void choosePhoto(event.target.files?.[0])} />
    {draft.recipe_photo && <><img className="recipe-photo-preview" src={draft.recipe_photo} alt="Recipe photo preview" /><button className="text-action" type="button" onClick={() => setField('recipe_photo', '')}>Remove photo</button></>}
    {photoError && <p className="error-message" role="alert">{photoError}</p>}
    {editing && legacyNotes && <><label htmlFor="recipe-saved-notes">Previously saved notes</label><textarea id="recipe-saved-notes" rows={4} maxLength={20000} value={draft.notes} disabled={busy} onChange={event => setField('notes', event.target.value)} /></>}
    {error && <p className="feedback error-message" role="alert">{error}</p>}
    <button className="primary" type="submit" disabled={busy || photoBusy || !online || !draft.title.trim() || (!editing && (!draft.recipe_category || !draft.preparation_minutes))}>{busy ? 'Saving…' : editing ? 'Save changes' : 'Save recipe'}</button>
  </form>;
}

function RecipeImage({ recipe }: { recipe: FolderEntry }) {
  return <span className="recipe-image">{recipe.recipe_photo ? <img src={recipe.recipe_photo} alt="" /> : <span aria-hidden="true"><Symbol name="recipe" /></span>}</span>;
}

export default function Recipes({ state, onSignIn }: { state: FolderEntriesState; onSignIn: () => void }) {
  const [filter, setFilter] = useState('All');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const recipes = state.entries.filter(entry => entry.kind === 'recipe');
  const selected = recipes.find(entry => entry.id === selectedId);
  const shown = recipes.filter(entry => filter === 'All' || entry.recipe_category === filter);
  const isEditing = !!state.edit && state.edit.id === selectedId;
  return <section className="preview-page collection-page recipes-page" lang="en">
    {selected ? <>
      <button className="text-action recipe-back" onClick={() => setSelectedId(null)}>← Our Recipes</button>
      <div className="recipe-detail"><RecipeImage recipe={selected} /><div className="recipe-detail-copy"><p className="recipe-category">{selected.recipe_category || 'Uncategorized'}</p><h1>{selected.title}</h1><p>{selected.preparation_minutes ? `${selected.preparation_minutes} min` : 'Preparation time not set'}</p>{selected.notes && <p className="collection-notes">{selected.notes}</p>}
      <div className="collection-actions"><button className="text-action" disabled={state.busy} aria-label={`Edit ${selected.title}`} onClick={() => state.startEdit(selected)}>Edit</button><button className="text-action" disabled={state.busy || !state.online} aria-label={`Delete ${selected.title}`} onClick={() => { if (window.confirm(`Remove “${selected.title}” from your shared recipes?`)) void state.remove(selected)?.then(success => { if (success) setSelectedId(null); }); }}>Delete</button></div></div></div>
      {isEditing && state.edit && <RecipeForm draft={state.edit} setField={state.setEditField} busy={state.busy} online={state.online} editing legacyNotes={!!selected.notes} error={state.error} onClose={state.cancelEdit} onSave={() => { void state.saveEdit(); }} />}
    </> : <>
      <div className="recipe-heading"><div><p className="eyebrow">SAVED TOGETHER</p><h1>Our Recipes<span>.</span></h1></div>{state.userId && state.household && <button className="primary recipe-add" onClick={() => setAdding(true)}>+ Add Recipe</button>}</div>
      {!state.authReady || state.contextLoading ? <p role="status">Opening your recipes…</p> : !state.userId || !state.household ? <section className="dashboard-card"><h2>{state.userId ? 'Connect your home' : 'Sign in to your account'}</h2><p>Recipes are shared with both people in your home.</p><button className="primary" onClick={onSignIn}>{state.userId ? 'Connect home' : 'Sign in through Shopping'}</button></section> : <>
        {state.isPoc && <p className="notice">POC test space. Don’t add sensitive personal information or private photos.</p>}
        {!state.online && <p className="notice" role="status">You’re offline. Your text stays here. Connect to save it.</p>}
        <div className="recipe-filters" role="group" aria-label="Recipe categories">{['All', ...categories].map(category => <button key={category} type="button" aria-pressed={filter === category} onClick={() => setFilter(category)}>{category}</button>)}</div>
        {state.loading ? <p role="status">Loading your recipes…</p> : recipes.length === 0 ? <div className="recipe-empty"><Symbol name="recipe" /><h2>Your recipe collection starts here</h2><p>Add a recipe to save it for both of you.</p></div> : shown.length === 0 ? <div className="recipe-empty"><p>No recipes in this category yet.</p></div> : <div className="recipe-grid">{shown.map(recipe => <button className="recipe-card" key={recipe.id} onClick={() => setSelectedId(recipe.id)}><RecipeImage recipe={recipe} /><span className="recipe-card-copy"><span className="recipe-category">{recipe.recipe_category || 'Uncategorized'}</span><strong>{recipe.title}</strong><small>{recipe.preparation_minutes ? `${recipe.preparation_minutes} min` : 'Time not set'}</small></span></button>)}</div>}
        {adding && <RecipeForm draft={state.drafts.recipe} setField={state.setDraft} busy={state.busy} online={state.online} editing={false} error={state.error} onClose={() => setAdding(false)} onSave={() => { void state.add()?.then(success => { if (success) setAdding(false); }); }} />}
      </>}
    </>}
    {state.error && !adding && !isEditing && <p className="feedback error-message recipe-feedback" role="alert">{state.error}</p>}
    {state.notice && <p className="feedback" role="status">{state.notice}</p>}
  </section>;
}
