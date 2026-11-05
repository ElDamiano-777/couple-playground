import { expect, test } from '@playwright/test';
import { plannedIngredients } from '../src/meals/mealIngredients';

test('combines identical ingredients only when their units match', () => {
  const recipes: any[] = [
    { id: 'a', title: 'A', recipe_ingredients: '200 g pasta\n1 lime' },
    { id: 'b', title: 'B', recipe_ingredients: '300 g pasta\n200 ml stock\n1 lime' },
  ];
  const meals: any[] = [
    { id: 'one', recipe_id: 'a' }, { id: 'two', recipe_id: 'b' },
  ];
  expect(plannedIngredients(meals, recipes)).toEqual([
    expect.objectContaining({ name: 'pasta', quantity: '500 g' }),
    expect.objectContaining({ name: 'lime', quantity: '1' }),
    expect.objectContaining({ name: 'stock', quantity: '200 ml' }),
    expect.objectContaining({ name: 'lime', quantity: '1' }),
  ]);
});
