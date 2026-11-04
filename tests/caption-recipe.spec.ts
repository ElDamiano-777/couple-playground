import { expect, test } from '@playwright/test';
import { captionRecipe } from '../src/collections/captionRecipe';

test('parses structured English, German and Russian captions without inventing missing fields', () => {
  expect(captionRecipe('Berry pasta\nIngredients:\n200 g pasta\n180 milliliter(s) stock\nInstructions:\n1. Cook pasta.\n2. Add stock.\nPrep time: 20 min\nServes 2\n#dinner')).toMatchObject({ title: 'Berry pasta', ingredients: '200 g pasta\n180 milliliter(s) stock', instructions: '1. Cook pasta.\n2. Add stock.', minutes: '20', servings: '2 servings' });
  expect(captionRecipe('Kartoffelsuppe\nZutaten:\n500 g Kartoffeln\nZubereitung:\n1. Kartoffeln schneiden.\n2. Kochen.\nKochzeit: 30 Min\n4 Portionen')).toMatchObject({ title: 'Kartoffelsuppe', ingredients: '500 g Kartoffeln', instructions: '1. Kartoffeln schneiden.\n2. Kochen.', minutes: '30', servings: '4 servings' });
  expect(captionRecipe('Сырники\nИнгредиенты:\n200 г творога\nПриготовление:\n1. Смешайте ингредиенты.\n2. Обжарьте.\nВремя: 15 мин\n2 порции')).toMatchObject({ title: 'Сырники', ingredients: '200 г творога', instructions: '1. Смешайте ингредиенты.\n2. Обжарьте.', minutes: '15', servings: '2 servings' });
  expect(captionRecipe('Follow for more\n#food\nSo tasty')).toMatchObject({ title: '', ingredients: '', instructions: '', minutes: '', servings: '' });
});
