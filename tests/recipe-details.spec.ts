import { expect, test } from '@playwright/test';
import { ingredientDetails } from '../src/collections/recipeDetails';

test('formats ingredient units naturally without changing quantities', () => {
  const ingredients = ingredientDetails('180 milliliter(s) milk\n80 grams flour\n1 unit(s) Lime\n1 sachet(s) vanilla sugar\n½ tsp salt').ingredients;
  expect(ingredients.map(item => [item.quantity, item.name])).toEqual([
    ['180 ml', 'milk'], ['80 g', 'flour'], ['1', 'Lime'], ['1 sachet', 'vanilla sugar'], ['½ tsp', 'salt'],
  ]);
});
