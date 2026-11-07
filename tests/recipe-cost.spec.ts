import { expect, test } from '@playwright/test';
import { lineCost, recipeCost } from '../src/pricing/recipeCost';

test('estimates ingredient lines from amounts and units', () => {
  expect(lineCost('250 g Nudeln (Reisnudeln)').cost).toBeCloseTo(0.645, 2);
  expect(lineCost('3 Zehe/n Knoblauch (klein geschnitten)').cost).toBeCloseTo(0.207, 2);
  expect(lineCost('1 Dose/n Kokosmilch').cost).toBeCloseTo(1.49, 2);
  expect(lineCost('1/2 Zwiebel').cost).toBeCloseTo(0.125, 3);
  expect(lineCost('2 Becher Sahne').cost).toBeCloseTo(1.98, 2);
  expect(lineCost('Salz und Pfeffer')).toMatchObject({ cost: 0, staple: true });
  expect(lineCost('1 Prise Zimtpulver')).toMatchObject({ cost: 0, staple: true });
  expect(lineCost('1 Stück(e) Unbekanntes Zeug')).toMatchObject({ product: null, cost: null });
});

test('sums a recipe, divides by servings and counts unpriced lines', () => {
  const result = recipeCost(['500 g Penne', '2 Eier', 'Salz', 'Drachenfrucht'], '4 Portionen');
  expect(result.total).toBeCloseTo(0.5 * 1.29 * 2 + 2 * 0.349, 2);
  expect(result.perServing).toBeCloseTo(result.total / 4, 5);
  expect(result.missing).toBe(1);
  expect(recipeCost(['1 Ei'], null).perServing).toBeNull();
});
