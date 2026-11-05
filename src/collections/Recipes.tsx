import { useEffect, useRef, useState, type FormEvent } from 'react';
import { createWorker } from 'tesseract.js';
import { readPhoto } from '../family/petPhoto';
import { Symbol } from '../ui/Symbol';
import type { Draft, FolderEntriesState, FolderEntry } from './useFolderEntries';
import { extractSharedUrl, importRecipe, publicUrl, recipeSourceUrl } from './recipeImport';
import { captionRecipe } from './captionRecipe';
import { ingredientDetails, instructionSteps } from './recipeDetails';
import RecipeDetail from './RecipeDetail';
import { importedSocialPhoto } from './importedPhoto';
import type { SharedShoppingState } from '../shared/useSharedShopping';
import './collections.css';
import './recipes.css';

const categories = ['Breakfast', 'Lunch', 'Dinner', 'Snacks', 'Desserts'] as const;

function ScreenshotImport({ onCancel, onExtract }: { onCancel: () => void; onExtract: (text: string) => void }) {
  const [shots, setShots] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  async function choose(files: FileList | null) {
    if (!files?.length) return;
    setMessage('');
    try {
      const photos = await Promise.all(Array.from(files).slice(0, 6).map(readPhoto));
      setShots(previous => [...previous, ...photos]);
    } catch { setMessage('Could not open one of these screenshots. Try a JPEG or PNG screenshot.'); }
  }
  async function extract() {
    if (!shots.length) return;
    setBusy(true); setMessage('Preparing local text recognition…');
    let worker: Awaited<ReturnType<typeof createWorker>> | null = null;
    try {
      worker = await createWorker('eng+deu+rus');
      const text: string[] = [];
      for (let index = 0; index < shots.length; index++) {
        setMessage(`Reading screenshot ${index + 1} of ${shots.length}…`);
        const result = await worker.recognize(shots[index]);
        if (result.data.text.trim()) text.push(result.data.text.trim());
        await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
      }
      if (!text.length) { setMessage('No readable text found. Try clearer screenshots or enter the recipe manually.'); return; }
      onExtract(text.join('\n\n'));
    } catch { setMessage('Text could not be read. Try a clearer screenshot.'); }
    finally { await worker?.terminate(); setBusy(false); }
  }
  return <section className="preview-page collection-page recipes-page recipe-editor-page" lang="en"><div className="note-form recipe-form recipe-editor-form"><div className="recipe-editor-header"><button className="text-action" type="button" onClick={onCancel}>← Recipes</button><h1>Import screenshots</h1><button className="text-action" type="button" onClick={onCancel}>Cancel</button></div><p>Text stays on this device while Together reads it.</p><label htmlFor="recipe-screenshots">Screenshots</label><input id="recipe-screenshots" type="file" accept="image/jpeg,image/png,image/heic,image/heif" multiple disabled={busy} onChange={event => void choose(event.target.files)} />{shots.length > 0 && <div className="recipe-screenshot-previews">{shots.map((shot, index) => <figure key={`${index}-${shot.slice(-12)}`}><img src={shot} alt={`Selected screenshot ${index + 1}`} /><button type="button" disabled={busy} onClick={() => setShots(previous => previous.filter((_, item) => item !== index))}>Remove</button></figure>)}</div>}{message && <p className={message.startsWith('No ') || message.startsWith('Could') ? 'error-message' : 'feedback'} role="status">{message}</p>}<button className="primary" type="button" disabled={busy || !shots.length} onClick={() => void extract()}>{busy ? 'Extracting text…' : 'Extract Text'}</button></div></section>;
}

function RecipeForm({ draft, setField, busy, online, onSave, onClose, editing, error, imported, message }: {
  draft: Draft; setField: (field: keyof Draft, value: string) => void;
  busy: boolean; online: boolean; onSave: () => void; onClose: () => void; editing: boolean; error: string; imported?: boolean; message?: string;
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
  const previewIngredients = ingredientDetails(draft.recipe_ingredients).ingredients;
  const previewSteps = instructionSteps(draft.recipe_instructions);
  const previewPhoto = draft.recipe_photo || (draft.recipe_image_url && publicUrl(draft.recipe_image_url));
  return <form className="note-form recipe-form recipe-editor-form" onSubmit={submit}>
    <div className="recipe-editor-header"><button className="text-action" type="button" disabled={busy || photoBusy} onClick={onClose}>← Recipes</button><h1>{editing ? 'Edit recipe' : imported ? 'Review recipe' : 'Add Recipe'}</h1><button className="text-action" type="button" disabled={busy || photoBusy} onClick={onClose}>Cancel</button></div>
    {imported && <><p role="status">{message || 'Review and edit the details before saving.'}</p><section className="recipe-import-preview" aria-label="Recipe preview"><h3>Preview</h3>{previewPhoto && <img src={previewPhoto} referrerPolicy="no-referrer" alt="" />}<strong>{draft.title || 'Recipe name needed'}</strong>{previewIngredients.length > 0 && <><h4>Ingredients</h4><ul>{previewIngredients.map((item, index) => <li key={index}>{[item.quantity, item.name, item.alternative].filter(Boolean).join(' ')}</li>)}</ul></>}{previewSteps.length > 0 && <><h4>Instructions</h4><ol>{previewSteps.map((step, index) => <li key={index}>{step}</li>)}</ol></>}{!previewIngredients.length && !previewSteps.length && <p>No ingredients or instructions recognized yet.</p>}</section>{!draft.title.trim() && <p>Add a recipe name before saving.</p>}</>}
    <label htmlFor="recipe-name">Recipe name</label>
    <input id="recipe-name" required maxLength={150} value={draft.title} disabled={busy} onChange={event => setField('title', event.target.value)} />
    <label htmlFor="recipe-category">Category</label>
    <select id="recipe-category" value={draft.recipe_category} disabled={busy} onChange={event => setField('recipe_category', event.target.value)}><option value="">Choose a category</option>{categories.map(category => <option key={category}>{category}</option>)}</select>
    <label htmlFor="recipe-time">Preparation time (minutes)</label>
    <input id="recipe-time" type="number" inputMode="numeric" min="1" max="10080" step="1" value={draft.preparation_minutes} disabled={busy} onChange={event => setField('preparation_minutes', event.target.value)} />
    <label htmlFor="recipe-servings">Servings or yield (optional)</label>
    <input id="recipe-servings" maxLength={150} value={draft.recipe_servings} disabled={busy} onChange={event => setField('recipe_servings', event.target.value)} />
    <label htmlFor="recipe-photo">Recipe photo (optional)</label>
    <input id="recipe-photo" type="file" accept="image/*" disabled={busy || photoBusy} onChange={event => void choosePhoto(event.target.files?.[0])} />
    {draft.recipe_photo && <><img className="recipe-photo-preview" src={draft.recipe_photo} alt="Recipe photo preview" /><button className="text-action" type="button" onClick={() => setField('recipe_photo', '')}>Remove photo</button></>}
    {photoError && <p className="error-message" role="alert">{photoError}</p>}
    <>
      <label htmlFor="recipe-source">Original link</label><input id="recipe-source" type="url" maxLength={4096} value={draft.recipe_source_url} disabled={busy} onChange={event => setField('recipe_source_url', event.target.value)} />
      {!!draft.recipe_source_url && !recipeSourceUrl(draft.recipe_source_url) && <p className="error-message" role="alert">Use a link to the original post, not its photo.</p>}
      <label htmlFor="recipe-image-link">Photo link (optional)</label><p className="small-print">{draft.recipe_photo ? 'A copy will be saved with your recipe.' : 'The imported photo stays on its original website.'}</p><input id="recipe-image-link" type="url" maxLength={4096} value={draft.recipe_image_url} disabled={busy} onChange={event => setField('recipe_image_url', event.target.value)} />
      {!draft.recipe_photo && publicUrl(draft.recipe_image_url) && <img className="recipe-photo-preview" src={publicUrl(draft.recipe_image_url)!} referrerPolicy="no-referrer" alt="Imported recipe photo preview" />}
      <label htmlFor="recipe-ingredients">Ingredients</label><textarea id="recipe-ingredients" rows={9} maxLength={20000} value={draft.recipe_ingredients} disabled={busy} placeholder="One ingredient per line" onChange={event => setField('recipe_ingredients', event.target.value)} />
      <label htmlFor="recipe-instructions">Instructions</label><textarea id="recipe-instructions" rows={9} maxLength={20000} value={draft.recipe_instructions} disabled={busy} onChange={event => setField('recipe_instructions', event.target.value)} />
      <label htmlFor="recipe-caption">Original caption (optional)</label><textarea id="recipe-caption" rows={8} maxLength={20000} value={draft.recipe_caption} disabled={busy} onChange={event => setField('recipe_caption', event.target.value)} />
      <label htmlFor="recipe-import-notes">Notes (optional)</label><textarea id="recipe-import-notes" rows={3} maxLength={20000} value={draft.notes} disabled={busy} onChange={event => setField('notes', event.target.value)} />
    </>
    {error && <p className="feedback error-message" role="alert">{error}</p>}
    <button className="primary" type="submit" disabled={busy || photoBusy || !online || !draft.title.trim() || (!!draft.recipe_source_url && !recipeSourceUrl(draft.recipe_source_url)) || (!!draft.recipe_image_url && !publicUrl(draft.recipe_image_url))}>{busy ? 'Saving…' : editing ? 'Save changes' : 'Save recipe'}</button>
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
  const [screenshotImporting, setScreenshotImporting] = useState(false);
  const [importing, setImporting] = useState(!!sharedRecipe);
  const [imported, setImported] = useState(false);
  const [source, setSource] = useState(sharedRecipe || '');
  const [importBusy, setImportBusy] = useState(false);
  const [importMessage, setImportMessage] = useState('');
  const [needsCaption, setNeedsCaption] = useState(() => !!sharedRecipe && state.drafts.recipe.recipe_source_url === sharedRecipe && (!state.drafts.recipe.recipe_ingredients || !state.drafts.recipe.recipe_instructions));
  const [captionChanged, setCaptionChanged] = useState(false);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  function isSocial(url: string) {
    try { return /(^|\.)(instagram\.com|instagr\.am|tiktok\.com)$/i.test(new URL(url).hostname); } catch { return false; }
  }
  function importedTitle(value: string, social: boolean) {
    if (!social) return value;
    const title = value
      .replace(/^\s*(?:instagram|tiktok)\s*[-:|]\s*/iu, '')
      .replace(/\s*(?:[-·|]\s*)?@?[\w.-]+\s+(?:on|auf|в)\s+(?:instagram|tiktok)\b.*$/iu, '')
      .replace(/\s*[·|]\s*(?:\d[\d.,]*\s*)?(?:likes?|comments?|views?|gefällt mir|kommentare|лайков|просмотров).*$/iu, '')
      .trim();
    return /(?:\bon instagram\b|\bon tiktok\b|\blikes?\b|\bcomments?\b|\bviews?\b|\bgefällt mir\b|\bлайков\b|\bпросмотров\b)/iu.test(title) ? '' : title;
  }
  function pasteDescription() {
    const clipboard = navigator.clipboard;
    if (!clipboard?.readText) { setImportMessage('Touch and hold the description field, then tap Paste.'); return; }
    void clipboard.readText().then(text => { state.setDraft('recipe_caption', Array.from(text).slice(0, 20000).join('')); setCaptionChanged(true); setImportMessage('Review the copied description below.'); }).catch(() => setImportMessage('Touch and hold the description field, then tap Paste.'));
  }
  function parseDescription(event: FormEvent) {
    event.preventDefault();
    const caption = state.drafts.recipe.recipe_caption.trim();
    const parsed = captionRecipe(caption);
    const title = captionChanged || !state.drafts.recipe.title ? parsed.title : '';
    if (title) state.setDraft('title', title);
    if (parsed.ingredients) state.setDraft('recipe_ingredients', parsed.ingredients);
    if (parsed.instructions) state.setDraft('recipe_instructions', parsed.instructions);
    if (parsed.minutes) state.setDraft('preparation_minutes', parsed.minutes);
    if (parsed.servings) state.setDraft('recipe_servings', parsed.servings);
    const hasIngredients = !!(parsed.ingredients || state.drafts.recipe.recipe_ingredients);
    const hasInstructions = !!(parsed.instructions || state.drafts.recipe.recipe_instructions);
    setNeedsCaption(false); setImporting(false); setImported(true); setAdding(true);
    if (sharedRecipe) onClearSharedRecipe();
    setImportMessage(hasIngredients && hasInstructions ? 'Parsed caption. Review and edit before saving.' : 'Some recipe details could not be recognized. No complete recipe found; add missing ingredients or instructions manually.');
  }
  async function previewImport(event: FormEvent) {
    if (needsCaption) { parseDescription(event); return; }
    event.preventDefault();
    const url = extractSharedUrl(source);
    if (!url) { setImportMessage('Enter a public recipe or post link, not a photo link.'); return; }
    const previous = state.drafts.recipe;
    if ((previous.title || previous.notes || previous.recipe_photo || previous.recipe_category || previous.preparation_minutes || previous.recipe_image_url || previous.recipe_servings || previous.recipe_caption || previous.recipe_source_url || previous.recipe_ingredients || previous.recipe_instructions) && !window.confirm('Replace your unfinished recipe draft?')) return;
    setImportBusy(true); setImportMessage('');
    let result = null;
    try { result = await importRecipe(url); } catch { /* A link-only recipe is still useful. */ }
    const photo = result?.image ? await importedSocialPhoto(result.image) : null;
    if (!mounted.current) return;
    const social = isSocial(url);
    const values: Partial<Draft> = { title: importedTitle(result?.title || (social ? '' : `Recipe from ${new URL(url).hostname.replace(/^www\./, '')}`), social), notes: result?.notes || '', recipe_caption: result?.caption || '', recipe_servings: result?.servings || '', recipe_category: result?.category || '', preparation_minutes: result?.minutes || '', recipe_photo: photo || '', recipe_source_url: url, recipe_image_url: result?.image || '', recipe_ingredients: result?.ingredients || '', recipe_instructions: result?.instructions || '' };
    for (const [field, value] of Object.entries(values)) state.setDraft(field as keyof Draft, value);
    setImportBusy(false);
    if (!result?.ingredients || !result?.instructions) {
      setNeedsCaption(true); setCaptionChanged(false);
      setImportMessage(`${/tiktok\.com/i.test(url) ? 'TikTok' : social ? 'Instagram' : 'This page'} did not provide the full recipe. Copy the post description and paste it below.`);
      return;
    }
    if (sharedRecipe) onClearSharedRecipe();
    setImporting(false); setImported(true); setAdding(true);
    setImportMessage(result ? 'Check the imported details before saving.' : 'Details could not be imported. You can save the link and add details yourself.');
  }
  const recipes = state.entries.filter(entry => entry.kind === 'recipe');
  const selected = recipes.find(entry => entry.id === selectedId);
  const shown = recipes.filter(entry => filter === 'All' || entry.recipe_category === filter);
  const isEditing = !!state.edit && state.edit.id === selectedId;
  if (screenshotImporting) return <ScreenshotImport onCancel={() => setScreenshotImporting(false)} onExtract={text => { const parsed = captionRecipe(text); state.setDraft('title', parsed.title); state.setDraft('recipe_ingredients', parsed.ingredients); state.setDraft('recipe_instructions', parsed.instructions); state.setDraft('preparation_minutes', parsed.minutes); state.setDraft('recipe_servings', parsed.servings); state.setDraft('recipe_caption', text); setScreenshotImporting(false); setImported(true); setImportMessage(parsed.ingredients || parsed.instructions ? 'Text extracted locally. Review and edit before saving.' : 'No recipe sections found. Raw text is kept below; add details manually.'); setAdding(true); }} />;
  if (adding || (isEditing && state.edit)) return <section className="preview-page collection-page recipes-page recipe-editor-page" lang="en"><RecipeForm draft={isEditing && state.edit ? state.edit : state.drafts.recipe} setField={isEditing ? state.setEditField : state.setDraft} busy={state.busy} online={state.online} editing={isEditing} imported={imported} message={importMessage} error={state.error} onClose={() => { if (isEditing) state.cancelEdit(); else { setAdding(false); setImportMessage(''); } }} onSave={() => { if (isEditing) { void state.saveEdit(); } else void state.add()?.then(success => { if (success) { setAdding(false); setImportMessage(''); } }); }} /></section>;
  return <section className="preview-page collection-page recipes-page" lang="en">
    {selected ? <>
      <RecipeDetail key={selected.id} recipe={selected} shopping={shopping} busy={state.busy} online={state.online} onBack={() => setSelectedId(null)} onEdit={() => state.startEdit(selected)} onDelete={() => { if (window.confirm(`Remove “${selected.title}” from your shared recipes?`)) void state.remove(selected)?.then(success => { if (success) setSelectedId(null); }); }} />
      {isEditing && state.edit && <RecipeForm draft={state.edit} setField={state.setEditField} busy={state.busy} online={state.online} editing error={state.error} onClose={state.cancelEdit} onSave={() => { void state.saveEdit(); }} />}
    </> : <>
      <div className="recipe-heading"><div><p className="eyebrow">SAVED TOGETHER</p><h1>Our Recipes<span>.</span></h1></div>{state.userId && state.household && <div className="recipe-heading-actions"><button className="primary recipe-add" onClick={() => { const draft = state.drafts.recipe; const resume = !sharedRecipe && !!draft.recipe_source_url && isSocial(draft.recipe_source_url) && (!draft.recipe_ingredients || !draft.recipe_instructions); setSource(sharedRecipe || (resume ? draft.recipe_source_url : '')); setNeedsCaption(resume); setCaptionChanged(false); setImportMessage(resume ? 'Your copied description is still here. Review it below.' : ''); setImporting(true); }}>Import from Link</button><button className="text-action recipe-manual" onClick={() => setScreenshotImporting(true)}>Import from Screenshots</button><button className="text-action recipe-manual" onClick={() => { setImported(!!state.drafts.recipe.recipe_source_url); setAdding(true); }}>+ Add Recipe manually</button></div>}</div>
      {!state.authReady || state.contextLoading ? <p role="status">Opening your recipes…</p> : !state.userId || !state.household ? <section className="dashboard-card"><h2>{state.userId ? 'Connect your home' : 'Sign in to your account'}</h2><p>Recipes are shared with both people in your home.</p><button className="primary" onClick={onSignIn}>{state.userId ? 'Connect home' : 'Sign in through Shopping'}</button></section> : <>
        {state.isPoc && <p className="notice">POC test space. Don’t add sensitive personal information or private photos.</p>}
        {!state.online && <p className="notice" role="status">You’re offline. Your text stays here. Connect to save it.</p>}
        <div className="recipe-filters" role="group" aria-label="Recipe categories">{['All', ...categories].map(category => <button key={category} type="button" aria-pressed={filter === category} onClick={() => setFilter(category)}>{category}</button>)}</div>
        {state.loading ? <p role="status">Loading your recipes…</p> : recipes.length === 0 ? <div className="recipe-empty"><Symbol name="recipe" /><h2>Your recipe collection starts here</h2><p>Add a recipe to save it for both of you.</p></div> : shown.length === 0 ? <div className="recipe-empty"><p>No recipes in this category yet.</p></div> : <div className="recipe-grid">{shown.map(recipe => { const minutes = Number(recipe.preparation_minutes); return <button className="recipe-card" key={recipe.id} onClick={() => setSelectedId(recipe.id)}><RecipeImage recipe={recipe} /><span className="recipe-card-copy"><span className="recipe-category">{recipe.recipe_category || 'Uncategorized'}</span><strong>{recipe.title}</strong>{Number.isInteger(minutes) && minutes > 0 && <small>{minutes} min</small>}</span></button>; })}</div>}
        {importing && <form className="note-form add-sheet recipe-form" onSubmit={event => void previewImport(event)}><button className="text-action recipe-form-close" type="button" disabled={importBusy} onClick={() => { setImporting(false); if (sharedRecipe) onClearSharedRecipe(); }}>Close</button><h2>Import from Link</h2><p>On iPhone, choose Share → Copy Link, then paste it here.</p><label htmlFor="recipe-import-url">Recipe link</label><input id="recipe-import-url" type="text" inputMode="url" required maxLength={5000} placeholder="https://…" value={source} disabled={importBusy} onChange={event => { setSource(event.target.value); setNeedsCaption(false); setImportMessage(''); }} />{!needsCaption && <button type="button" className="text-action recipe-paste" disabled={importBusy} onClick={() => { const clipboard = navigator.clipboard; if (!clipboard?.readText) { setImportMessage('Touch and hold the field above, then tap Paste.'); return; } void clipboard.readText().then(text => { setSource(extractSharedUrl(text) || text); setNeedsCaption(false); setImportMessage(''); }).catch(() => setImportMessage('Touch and hold the field above, then tap Paste.')); }}>Paste copied link</button>}<p className="small-print">Public links are sent to Jina Reader, and TikTok links may also be sent to TikTok, to find available details.</p>{importMessage && <p className="error-message" role="alert">{importMessage}</p>}{needsCaption && <><label htmlFor="instagram-caption">Post description</label><textarea id="instagram-caption" rows={7} maxLength={20000} value={state.drafts.recipe.recipe_caption} onChange={event => { state.setDraft('recipe_caption', event.target.value); setCaptionChanged(true); }} placeholder="Paste the original post description" /><button type="button" className="text-action recipe-paste" onClick={pasteDescription}>Paste description</button><p className="small-print">Together only extracts information explicitly present in this description. Review every field before saving.</p></>}<button className="primary" disabled={importBusy || !source.trim() || (needsCaption && !state.drafts.recipe.recipe_caption.trim())}>{importBusy ? 'Finding recipe…' : 'Preview recipe'}</button>{needsCaption && <><button type="button" className="text-action" disabled={importBusy || !state.drafts.recipe.recipe_caption.trim()} onClick={event => parseDescription(event)}>Parse Description</button><button type="button" className="text-action" onClick={event => parseDescription(event)}>Continue without description</button></>}</form>}
        {adding && <RecipeForm imported={imported} message={importMessage} draft={state.drafts.recipe} setField={state.setDraft} busy={state.busy} online={state.online} editing={false} error={state.error} onClose={() => { setAdding(false); setImportMessage(''); }} onSave={() => { void state.add()?.then(success => { if (success) { setAdding(false); setImportMessage(''); } }); }} />}
      </>}
    </>}
    {state.error && !adding && !isEditing && <p className="feedback error-message recipe-feedback" role="alert">{state.error}</p>}
    {state.notice && <p className="feedback" role="status">{state.notice}</p>}
  </section>;
}
