import { useState } from 'react';
import type { FolderEntry } from './useFolderEntries';
import type { SharedShoppingState } from '../shared/useSharedShopping';
import { Symbol } from '../ui/Symbol';
import { publicUrl, recipeSourceUrl } from './recipeImport';
import { captionSections } from './captionRecipe';
import { ingredientDetails, instructionSteps, shoppingIngredient, type Ingredient } from './recipeDetails';

export default function RecipeDetail({ recipe, shopping, onBack, onEdit, onDelete, busy, online, backLabel = '← Our Recipes' }: {
  recipe: FolderEntry; shopping: SharedShoppingState; onBack: () => void; onEdit?: () => void; onDelete?: () => void; busy: boolean; online: boolean; backLabel?: string;
}) {
  const parsed = ingredientDetails(recipe.recipe_ingredients || '');
  const ingredients = parsed.ingredients.filter(item => !item.heading);
  const steps = instructionSteps(recipe.recipe_instructions || '');
  const caption = recipe.recipe_caption ? captionSections(recipe.recipe_caption) : null;
  const comparable = (value: string) => value.replace(/\s+/g, ' ').trim();
  const represented = !!(caption?.ingredients && caption.instructions && comparable(caption.ingredients) === comparable(recipe.recipe_ingredients || '') && comparable(caption.instructions) === comparable(recipe.recipe_instructions || ''));
  const notes = [recipe.notes?.trim(), ...parsed.notes, represented ? caption?.remainder : ''].filter(Boolean);
  const source = recipe.recipe_source_url && recipeSourceUrl(recipe.recipe_source_url);
  const social = source && /(^|\.)(instagram\.com|instagr\.am|tiktok\.com)$/i.test(new URL(source).hostname);
  const photo = recipe.recipe_photo || (recipe.recipe_image_url && publicUrl(recipe.recipe_image_url));
  const linkOnly = !!source && !ingredients.length && !steps.length;
  const [checked, setChecked] = useState<number[]>([]);
  const [selecting, setSelecting] = useState(false);
  const [choices, setChoices] = useState<Ingredient[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [message, setMessage] = useState('');
  const [duplicateActions, setDuplicateActions] = useState<Record<number, 'skip' | 'update'>>({});
  const duplicateFor = (item: Ingredient) => shopping.items.find(row => !row.bought && row.category === 'Home' && row.name.trim().toLowerCase() === shoppingIngredient(item).name.trim().toLowerCase());
  function openShopping() { setChoices(ingredients); setSelected(ingredients.map((_, index) => index)); setDuplicateActions({}); setMessage(''); setSelecting(true); void shopping.refresh(); }
  const selectedChoices = selected.map(index => {
    const item = choices[index]; const duplicate = duplicateFor(item);
    return { ...shoppingIngredient(item), quantity: item.quantity, existingId: duplicate?.id ?? null, existingNotes: duplicate?.notes ?? '', action: duplicate ? duplicateActions[index] ?? 'skip' : 'add' as const };
  });
  const uniqueChoices = selectedChoices.reduce<typeof selectedChoices>((all, item) => {
    if (item.action === 'skip') return all;
    const existing = all.find(other => other.name.trim().toLowerCase() === item.name.trim().toLowerCase());
    if (existing) { existing.notes = [existing.notes, item.notes].filter(Boolean).join('\n'); existing.quantity = [existing.quantity, item.quantity].filter(Boolean).join('; '); }
    else all.push({ ...item });
    return all;
  }, []);
  const addedCount = uniqueChoices.filter(item => item.action === 'add').length;
  const updatedCount = uniqueChoices.filter(item => item.action === 'update' && item.quantity).length;
  const skippedCount = selectedChoices.filter(item => item.action === 'skip').length;
  function toggle(value: number, values: number[], update: (values: number[]) => void) { update(values.includes(value) ? values.filter(item => item !== value) : [...values, value]); }
  return <>
    <button className="text-action recipe-back" onClick={onBack}>{backLabel}</button>
    <article className="recipe-detail">
      <div className="recipe-image">{photo ? <img src={photo} referrerPolicy="no-referrer" alt="" /> : <span aria-hidden="true"><Symbol name="recipe" /></span>}</div>
      <div className="recipe-detail-copy">
        <h1>{recipe.title}</h1>
        <div className="recipe-meta">{recipe.recipe_category && <span>{recipe.recipe_category}</span>}{recipe.preparation_minutes && <span>{recipe.preparation_minutes} min</span>}{recipe.recipe_servings && <span>Yield: {recipe.recipe_servings}</span>}</div>
        {linkOnly && <div className="recipe-link-only"><Symbol name="recipe" /><h2>Saved recipe link</h2><p>Open the original to see this recipe.</p>{source && <a className="primary" href={source} target={social ? undefined : "_blank"} rel="noopener noreferrer">Open Original ↗</a>}</div>}
        {ingredients.length > 0 && <section className="recipe-details-section" aria-labelledby="recipe-ingredients-heading">
          <div className="recipe-section-header"><div><h2 id="recipe-ingredients-heading">Ingredients</h2><p>Check off ingredients as you cook.</p></div></div>
          <div className="recipe-ingredient-list">{(() => { let index = -1; return parsed.ingredients.map((item, position) => {
            if (item.heading) return <h3 className="recipe-ingredient-heading" key={position}>{item.name}</h3>;
            index += 1; const current = index;
            return <label className="recipe-ingredient" key={position}><input type="checkbox" checked={checked.includes(current)} onChange={() => toggle(current, checked, setChecked)} />{item.quantity && <strong className="recipe-quantity">{item.quantity} </strong>}<span className="recipe-ingredient-name">{item.name}</span></label>;
          }); })()}</div>
          <button className="recipe-shopping-button" type="button" disabled={busy || shopping.busy || !online} onClick={openShopping}>+ Add ingredients to Shopping</button>
          {message && <p className="feedback" role="status">{message}</p>}
        </section>}
        {steps.length > 0 && <section className="recipe-details-section"><h2>Instructions</h2><ol className="recipe-steps">{steps.map((step, index) => <li key={index}><span>{index + 1}</span><p>{step}</p></li>)}</ol></section>}
        {recipe.recipe_caption && !represented && <details className="recipe-caption"><summary>Original caption or description</summary><p>{recipe.recipe_caption}</p></details>}
        {notes.length > 0 && <section className="recipe-details-section recipe-notes"><h2>Notes</h2>{notes.map((note, index) => <p className="collection-notes" key={index}>{note}</p>)}</section>}
        {recipe.recipe_source_url && !source && <p className="small-print">Original post link unavailable. Edit this recipe to add it.</p>}
        {source && !linkOnly && <a className="recipe-original" href={source} target={social ? undefined : "_blank"} rel="noopener noreferrer">Open Original Recipe ↗</a>}
        {(onEdit || onDelete) && <div className="collection-actions">{onEdit && <button className="text-action" disabled={busy} aria-label={`Edit ${recipe.title}`} onClick={onEdit}>Edit</button>}{onDelete && <button className="text-action" disabled={busy || !online} aria-label={`Delete ${recipe.title}`} onClick={onDelete}>Delete</button>}</div>}
      </div>
    </article>
    {selecting && <div className="recipe-shopping-overlay"><section className="recipe-shopping-sheet" role="dialog" aria-modal="true" aria-labelledby="recipe-shopping-title">
      <div className="recipe-shopping-head"><div className="recipe-shopping-title-row"><h2 id="recipe-shopping-title">Add to Shopping</h2><button type="button" className="text-action" aria-label="Close Add to Shopping" disabled={shopping.busy} onClick={() => setSelecting(false)}>Close</button></div><p>Choose ingredients for your shared Home list.</p></div>
      <div className="recipe-shopping-list"><div className="recipe-select-actions"><button type="button" disabled={shopping.busy} onClick={() => setSelected(choices.map((_, index) => index))}>Select all</button><button type="button" disabled={shopping.busy} onClick={() => setSelected([])}>Deselect all</button></div>{choices.map((item, index) => { const duplicate = duplicateFor(item); return <div className="recipe-shopping-choice" key={index}><label className="recipe-ingredient"><input type="checkbox" checked={selected.includes(index)} disabled={shopping.busy} onChange={() => toggle(index, selected, setSelected)} />{item.quantity && <strong className="recipe-quantity">{item.quantity} </strong>}<span className="recipe-ingredient-name">{item.name}</span></label>{duplicate && selected.includes(index) && <div className="recipe-duplicate"><p>Already in Home Shopping{duplicate.notes ? `: ${duplicate.notes}` : '.'}</p><label>For {item.name}<select value={duplicateActions[index] ?? 'skip'} disabled={shopping.busy} onChange={event => setDuplicateActions(previous => ({ ...previous, [index]: event.target.value as 'skip' | 'update' }))}><option value="skip">Skip existing item</option>{item.quantity && <option value="update">Update recipe quantity to {item.quantity}</option>}</select></label>{!item.quantity ? <small>No quantity was provided in this recipe.</small> : duplicateActions[index] === 'update' && <small>The recipe quantity is saved separately; quantities are not added together.</small>}</div>}</div>; })}</div>
      {shopping.error && <p className="feedback error-message" role="alert">{shopping.error}</p>}
      <div className="recipe-shopping-footer"><button className="primary" type="button" disabled={shopping.busy || !selected.length || !online} onClick={() => { void shopping.addRecipeSelection(uniqueChoices).then(success => { if (success) { setSelecting(false); setMessage([addedCount ? `${addedCount} ${addedCount === 1 ? 'ingredient' : 'ingredients'} added` : '', updatedCount ? `${updatedCount} ${updatedCount === 1 ? 'quantity' : 'quantities'} updated` : '', skippedCount ? `${skippedCount} skipped` : ''].filter(Boolean).join(' · ') + ' in your shared Home list.'); } }); }}>{shopping.busy ? 'Adding…' : `Add ${selected.length} ${selected.length === 1 ? 'item' : 'items'}`}</button></div>
    </section></div>}
  </>;
}
