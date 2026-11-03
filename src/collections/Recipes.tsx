import { useEffect, useRef, useState, type FormEvent } from 'react';
import { readPhoto } from '../family/petPhoto';
import { Symbol } from '../ui/Symbol';
import type { Draft, FolderEntriesState, FolderEntry } from './useFolderEntries';
import { extractSharedUrl, importRecipe, publicUrl } from './recipeImport';
import RecipeDetail from './RecipeDetail';
import type { SharedShoppingState } from '../shared/useSharedShopping';
import './collections.css';
import './recipes.css';

const categories = ['Breakfast', 'Lunch', 'Dinner', 'Snacks', 'Desserts'] as const;

function RecipeForm({ draft, setField, busy, online, onSave, onClose, editing, legacyNotes, error, imported, message }: {
  draft: Draft; setField: (field: keyof Draft, value: string) => void;
  busy: boolean; online: boolean; onSave: () => void; onClose: () => void; editing: boolean; legacyNotes?: boolean; error: string; imported?: boolean; message?: string;
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
    <h2>{editing ? 'Edit recipe' : imported ? 'Review recipe' : 'Add Recipe'}</h2>
    {imported && <p role="status">{message || 'Review and edit the details before saving.'}</p>}
    <label htmlFor="recipe-name">Recipe name</label>
    <input id="recipe-name" required maxLength={150} value={draft.title} disabled={busy} onChange={event => setField('title', event.target.value)} />
    <label htmlFor="recipe-category">Category</label>
    <select id="recipe-category" required={!editing && !imported} value={draft.recipe_category} disabled={busy} onChange={event => setField('recipe_category', event.target.value)}><option value="">Choose a category</option>{categories.map(category => <option key={category}>{category}</option>)}</select>
    <label htmlFor="recipe-time">Preparation time (minutes)</label>
    <input id="recipe-time" type="number" inputMode="numeric" min="1" max="10080" step="1" required={!editing && !imported} value={draft.preparation_minutes} disabled={busy} onChange={event => setField('preparation_minutes', event.target.value)} />
    <label htmlFor="recipe-servings">Servings or yield (optional)</label>
    <input id="recipe-servings" maxLength={150} value={draft.recipe_servings} disabled={busy} onChange={event => setField('recipe_servings', event.target.value)} />
    <label htmlFor="recipe-photo">Recipe photo (optional)</label>
    <input id="recipe-photo" type="file" accept="image/*" disabled={busy || photoBusy} onChange={event => void choosePhoto(event.target.files?.[0])} />
    {draft.recipe_photo && <><img className="recipe-photo-preview" src={draft.recipe_photo} alt="Recipe photo preview" /><button className="text-action" type="button" onClick={() => setField('recipe_photo', '')}>Remove photo</button></>}
    {photoError && <p className="error-message" role="alert">{photoError}</p>}
    {(imported || !!draft.recipe_source_url || !!draft.recipe_caption || !!draft.recipe_ingredients || !!draft.recipe_instructions) && <>
      <label htmlFor="recipe-source">Original link</label><input id="recipe-source" type="url" maxLength={4096} value={draft.recipe_source_url} disabled={busy} onChange={event => setField('recipe_source_url', event.target.value)} />
      <label htmlFor="recipe-image-link">Photo link (optional)</label><p className="small-print">Imported photos stay on their original website.</p><input id="recipe-image-link" type="url" maxLength={4096} value={draft.recipe_image_url} disabled={busy} onChange={event => setField('recipe_image_url', event.target.value)} />
      {!draft.recipe_photo && publicUrl(draft.recipe_image_url) && <img className="recipe-photo-preview" src={publicUrl(draft.recipe_image_url)!} referrerPolicy="no-referrer" alt="Imported recipe photo preview" />}
      <label htmlFor="recipe-ingredients">Ingredients</label><textarea id="recipe-ingredients" rows={5} maxLength={20000} value={draft.recipe_ingredients} disabled={busy} placeholder="One ingredient per line" onChange={event => setField('recipe_ingredients', event.target.value)} />
      <label htmlFor="recipe-caption">Original caption (optional)</label><textarea id="recipe-caption" rows={4} maxLength={20000} value={draft.recipe_caption} disabled={busy} onChange={event => setField('recipe_caption', event.target.value)} />
      <label htmlFor="recipe-instructions">Instructions</label><textarea id="recipe-instructions" rows={5} maxLength={20000} value={draft.recipe_instructions} disabled={busy} onChange={event => setField('recipe_instructions', event.target.value)} />
      <label htmlFor="recipe-import-notes">Notes (optional)</label><textarea id="recipe-import-notes" rows={3} maxLength={20000} value={draft.notes} disabled={busy} onChange={event => setField('notes', event.target.value)} />
    </>}
    {editing && legacyNotes && !draft.recipe_source_url && !draft.recipe_caption && !draft.recipe_ingredients && !draft.recipe_instructions && <><label htmlFor="recipe-saved-notes">Previously saved notes</label><textarea id="recipe-saved-notes" rows={4} maxLength={20000} value={draft.notes} disabled={busy} onChange={event => setField('notes', event.target.value)} /></>}
    {error && <p className="feedback error-message" role="alert">{error}</p>}
    <button className="primary" type="submit" disabled={busy || photoBusy || !online || !draft.title.trim() || (!editing && !imported && (!draft.recipe_category || !draft.preparation_minutes)) || (!!draft.recipe_source_url && !publicUrl(draft.recipe_source_url)) || (!!draft.recipe_image_url && !publicUrl(draft.recipe_image_url))}>{busy ? 'Saving…' : editing ? 'Save changes' : 'Save recipe'}</button>
  </form>;
}

function RecipeImage({ recipe }: { recipe: FolderEntry }) {
  const photo = recipe.recipe_photo || (recipe.recipe_image_url ? publicUrl(recipe.recipe_image_url) : null);
  return <span className="recipe-image">{photo ? <img src={photo} referrerPolicy="no-referrer" alt="" /> : <span aria-hidden="true"><Symbol name="recipe" /></span>}</span>;
}

export default function Recipes({ state, shopping, sharedRecipe, onClearSharedRecipe, onSignIn }: { state: FolderEntriesState; shopping: SharedShoppingState; sharedRecipe: string | null; onClearSharedRecipe: () => void; onSignIn: () => void }) {
  const [filter, setFilter] = useState('All');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [importing, setImporting] = useState(!!sharedRecipe);
  const [imported, setImported] = useState(false);
  const [source, setSource] = useState(sharedRecipe || '');
  const [importBusy, setImportBusy] = useState(false);
  const [importMessage, setImportMessage] = useState('');
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  async function previewImport(event: FormEvent) {
    event.preventDefault();
    const url = extractSharedUrl(source);
    if (!url) { setImportMessage('Enter a public http or https link.'); return; }
    const previous = state.drafts.recipe;
    if ((previous.title || previous.notes || previous.recipe_photo || previous.recipe_category || previous.preparation_minutes || previous.recipe_image_url || previous.recipe_servings || previous.recipe_caption || previous.recipe_source_url || previous.recipe_ingredients || previous.recipe_instructions) && !window.confirm('Replace your unfinished recipe draft?')) return;
    setImportBusy(true); setImportMessage('');
    let result = null;
    try { result = await importRecipe(url); } catch { /* A link-only recipe is still useful. */ }
    if (!mounted.current) return;
    const values: Partial<Draft> = { title: result?.title || `Recipe from ${new URL(url).hostname.replace(/^www\./, '')}`, notes: result?.notes || '', recipe_caption: result?.caption || '', recipe_servings: result?.servings || '', recipe_category: result?.category || '', preparation_minutes: result?.minutes || '', recipe_photo: '', recipe_source_url: url, recipe_image_url: result?.image || '', recipe_ingredients: result?.ingredients || '', recipe_instructions: result?.instructions || '' };
    for (const [field, value] of Object.entries(values)) state.setDraft(field as keyof Draft, value);
    setImportBusy(false); setImporting(false); setImported(true); setAdding(true);
    if (sharedRecipe) onClearSharedRecipe();
    setImportMessage(result ? 'Check the imported details before saving.' : 'Details could not be imported. You can save the link and add details yourself.');
  }
  const recipes = state.entries.filter(entry => entry.kind === 'recipe');
  const selected = recipes.find(entry => entry.id === selectedId);
  const shown = recipes.filter(entry => filter === 'All' || entry.recipe_category === filter);
  const isEditing = !!state.edit && state.edit.id === selectedId;
  return <section className="preview-page collection-page recipes-page" lang="en">
    {selected ? <>
      <RecipeDetail key={selected.id} recipe={selected} shopping={shopping} busy={state.busy} online={state.online} onBack={() => setSelectedId(null)} onEdit={() => state.startEdit(selected)} onDelete={() => { if (window.confirm(`Remove “${selected.title}” from your shared recipes?`)) void state.remove(selected)?.then(success => { if (success) setSelectedId(null); }); }} />
      {isEditing && state.edit && <RecipeForm draft={state.edit} setField={state.setEditField} busy={state.busy} online={state.online} editing legacyNotes={!!selected.notes} error={state.error} onClose={state.cancelEdit} onSave={() => { void state.saveEdit(); }} />}
    </> : <>
      <div className="recipe-heading"><div><p className="eyebrow">SAVED TOGETHER</p><h1>Our Recipes<span>.</span></h1></div>{state.userId && state.household && <div className="recipe-heading-actions"><button className="primary recipe-add" onClick={() => { setSource(sharedRecipe || ''); setImportMessage(''); setImporting(true); }}>Import from Link</button><button className="text-action recipe-manual" onClick={() => { setImported(!!state.drafts.recipe.recipe_source_url); setAdding(true); }}>+ Add Recipe manually</button></div>}</div>
      {!state.authReady || state.contextLoading ? <p role="status">Opening your recipes…</p> : !state.userId || !state.household ? <section className="dashboard-card"><h2>{state.userId ? 'Connect your home' : 'Sign in to your account'}</h2><p>Recipes are shared with both people in your home.</p><button className="primary" onClick={onSignIn}>{state.userId ? 'Connect home' : 'Sign in through Shopping'}</button></section> : <>
        {state.isPoc && <p className="notice">POC test space. Don’t add sensitive personal information or private photos.</p>}
        {!state.online && <p className="notice" role="status">You’re offline. Your text stays here. Connect to save it.</p>}
        <div className="recipe-filters" role="group" aria-label="Recipe categories">{['All', ...categories].map(category => <button key={category} type="button" aria-pressed={filter === category} onClick={() => setFilter(category)}>{category}</button>)}</div>
        {state.loading ? <p role="status">Loading your recipes…</p> : recipes.length === 0 ? <div className="recipe-empty"><Symbol name="recipe" /><h2>Your recipe collection starts here</h2><p>Add a recipe to save it for both of you.</p></div> : shown.length === 0 ? <div className="recipe-empty"><p>No recipes in this category yet.</p></div> : <div className="recipe-grid">{shown.map(recipe => <button className="recipe-card" key={recipe.id} onClick={() => setSelectedId(recipe.id)}><RecipeImage recipe={recipe} /><span className="recipe-card-copy"><span className="recipe-category">{recipe.recipe_category || 'Uncategorized'}</span><strong>{recipe.title}</strong><small>{recipe.preparation_minutes ? `${recipe.preparation_minutes} min` : 'Time not set'}</small></span></button>)}</div>}
        {importing && <form className="note-form add-sheet recipe-form" onSubmit={event => void previewImport(event)}><button className="text-action recipe-form-close" type="button" disabled={importBusy} onClick={() => { setImporting(false); if (sharedRecipe) onClearSharedRecipe(); }}>Close</button><h2>Import from Link</h2><p>On iPhone, choose Share → Copy Link, then paste it here.</p><label htmlFor="recipe-import-url">Recipe link</label><input id="recipe-import-url" type="text" inputMode="url" required maxLength={5000} placeholder="https://…" value={source} disabled={importBusy} onChange={event => setSource(event.target.value)} /><button type="button" className="text-action recipe-paste" disabled={importBusy} onClick={() => { const clipboard = navigator.clipboard; if (!clipboard?.readText) { setImportMessage('Touch and hold the field above, then tap Paste.'); return; } void clipboard.readText().then(text => { setSource(extractSharedUrl(text) || text); setImportMessage(''); }).catch(() => setImportMessage('Touch and hold the field above, then tap Paste.')); }}>Paste copied link</button><p className="small-print">Public links are sent to Jina Reader, and TikTok links may also be sent to TikTok, to find available details.</p>{importMessage && <p className="error-message" role="alert">{importMessage}</p>}<button className="primary" disabled={importBusy || !source.trim()}>{importBusy ? 'Finding recipe…' : 'Preview recipe'}</button></form>}
        {adding && <RecipeForm imported={imported} message={importMessage} draft={state.drafts.recipe} setField={state.setDraft} busy={state.busy} online={state.online} editing={false} error={state.error} onClose={() => { setAdding(false); setImportMessage(''); }} onSave={() => { void state.add()?.then(success => { if (success) { setAdding(false); setImportMessage(''); } }); }} />}
      </>}
    </>}
    {state.error && !adding && !isEditing && <p className="feedback error-message recipe-feedback" role="alert">{state.error}</p>}
    {state.notice && <p className="feedback" role="status">{state.notice}</p>}
  </section>;
}
