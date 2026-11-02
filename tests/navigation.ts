import type { Page } from '@playwright/test';

export function mainNavigation(page: Page) {
  return page.getByRole('navigation', { name: 'Main navigation', exact: true });
}

export async function openHome(page: Page) {
  await mainNavigation(page).getByRole('button', { name: 'Home', exact: true }).click();
}

export async function openShopping(page: Page) {
  await openHome(page);
  await page.getByRole('navigation', { name: 'Home sections', exact: true }).getByRole('button', { name: 'Shopping', exact: true }).click();
}

export async function openChildren(page: Page, add = false) {
  await openHome(page);
  await page.getByRole('navigation', { name: 'Home sections', exact: true }).getByRole('button', { name: 'Children', exact: true }).click();
  if (add) await page.getByRole('button', { name: 'Add child', exact: true }).click();
}

export async function openPets(page: Page) {
  await openHome(page);
  await page.getByRole('navigation', { name: 'Home sections', exact: true }).getByRole('button', { name: 'Pets', exact: true }).click();
}

export async function closeAddForm(page: Page) {
  const close = page.locator('form.add-sheet').getByRole('button', { name: 'Close', exact: true });
  if (await close.isVisible()) await close.click();
}

export async function openShoppingCategory(page: Page, category: 'Home' | 'Pets' | 'Kids') {
  await page.locator('.shopping-categories').getByRole('button', { name: new RegExp(`^${category}\\b`) }).click();
}
