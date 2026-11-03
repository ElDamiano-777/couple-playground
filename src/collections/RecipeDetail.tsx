import { useState } from 'react';
import type { FolderEntry } from './useFolderEntries';
import type { SharedShoppingState } from '../shared/useSharedShopping';
import { Symbol } from '../ui/Symbol';
import { publicUrl, recipeSourceUrl } from './recipeImport';
import { captionSections } from './captionRecipe';
import { ingredientDetails, instructionSteps, shoppingIngredient, type Ingredient } from './recipeDetails';

export default function RecipeDetail({ recipe, shopping, onBack, onEdit, onDelete, busy, online }: {
  recipe: FolderEntry; shopping: SharedShoppingState; onBack: () => void; onEdit: () => void; onDelete: () => void; busy: boolean; online: boolean;
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
  function openShopping() { setChoices(ingredients); setSelected(ingredients.map((_, index) => index)); setMessage(''); setSelecting(true); }
  function toggle(value: number, values: number[], update: (values: number[]) => void) { update(values.includes(value) ? values.filter(item => item !== value) : [...values, value]); }
  return <>
    <button className="text-action recipe-back" onClick={onBack}>← Our Recipes</button>
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
        <div className="collection-actions"><button className="text-action" disabled={busy} aria-label={`Edit ${recipe.title}`} onClick={onEdit}>Edit</button><button className="text-action" disabled={busy || !online} aria-label={`Delete ${recipe.title}`} onClick={onDelete}>Delete</button></div>
      </div>
    </article>
    {selecting && <div className="recipe-shopping-overlay"><section className="recipe-shopping-sheet" role="dialog" aria-labelledby="recipe-shopping-title">
      <div className="recipe-shopping-head"><div><h2 id="recipe-shopping-title">Add to Shopping</h2><p>Choose ingredients for your shared Home list.</p></div><button type="button" className="text-action" disabled={shopping.busy} onClick={() => setSelecting(false)}>Close</button></div>
      <div className="recipe-shopping-list">{choices.map((item, index) => <label className="recipe-ingredient" key={index}><input type="checkbox" checked={selected.includes(index)} disabled={shopping.busy} onChange={() => toggle(index, selected, setSelected)} />{item.quantity && <strong className="recipe-quantity">{item.quantity} </strong>}<span className="recipe-ingredient-name">{item.name}</span></label>)}</div>
      {shopping.error && <p className="feedback error-message" role="alert">{shopping.error}</p>}
      <div className="recipe-shopping-footer"><button className="primary" type="button" disabled={shopping.busy || !selected.length || !online} onClick={() => { void shopping.addRecipeIngredients(selected.map(index => shoppingIngredient(choices[index]))).then(success => { if (success) { setSelecting(false); setMessage(`${selected.length} ${selected.length === 1 ? 'ingredient' : 'ingredients'} added to your shared Home list.`); } }); }}>{shopping.busy ? 'Adding…' : `Add ${selected.length} ${selected.length === 1 ? 'item' : 'items'}`}</button></div>
    </section></div>}
  </>;
}
