import { ingredientDetails } from '../collections/recipeDetails';
import type { FolderEntry } from '../collections/useFolderEntries';
import type { MealPlanItem } from './useMealPlan';

export type PlannedIngredient = { id: string; name: string; quantity: string; recipeTitle: string };
const quantityParts = (quantity: string) => /^([0-9]+(?:[.,][0-9]+)?)\s*(kg|g|mg|ml|l|oz|lb|tbsp|tsp)$/i.exec(quantity.trim());
const key = (name: string) => name.trim().replace(/\s+/g, ' ').toLocaleLowerCase();

export function plannedIngredients(meals: MealPlanItem[], recipes: FolderEntry[]): PlannedIngredient[] {
  const items = meals.flatMap(meal => {
    const recipe = meal.recipe_id ? recipes.find(entry => entry.id === meal.recipe_id) : null;
    return recipe ? ingredientDetails(recipe.recipe_ingredients).ingredients.filter(item => !item.heading).map((item, index) => ({ id: `${meal.id}:${index}`, name: item.name, quantity: item.quantity, recipeTitle: recipe.title })) : [];
  });
  const combined: PlannedIngredient[] = [];
  for (const item of items) {
    const parts = quantityParts(item.quantity); const match = parts && combined.find(candidate => {
      const candidateParts = quantityParts(candidate.quantity);
      return key(candidate.name) === key(item.name) && !!candidateParts && candidateParts[2].toLocaleLowerCase() === parts[2].toLocaleLowerCase();
    });
    if (match && parts) {
      const existing = quantityParts(match.quantity)!;
      const total = Number(existing[1].replace(',', '.')) + Number(parts[1].replace(',', '.'));
      match.quantity = `${Number.isInteger(total) ? total : total.toFixed(2).replace(/0+$/, '').replace(/\.$/, '')} ${parts[2]}`;
      match.recipeTitle = `${match.recipeTitle} + ${item.recipeTitle}`;
    } else combined.push({ ...item });
  }
  return combined;
}
