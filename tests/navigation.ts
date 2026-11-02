import type { Page } from '@playwright/test';

export function mainNavigation(page: Page) {
  return page.getByRole('navigation', { name: 'Main navigation', exact: true });
}

export async function openHome(page: Page) {
  await mainNavigation(page).getByRole('button', { name: 'Home', exact: true }).click();
}

export async function openShopping(page: Page) {
  await openHome(page);
  await page.getByRole('button', { name: 'Shopping', exact: true }).click();
}

export async function openChildren(page: Page) {
  await openHome(page);
  await page.getByRole('button', { name: 'Children', exact: true }).click();
}

export async function openPets(page: Page) {
  await openHome(page);
  await page.getByRole('button', { name: 'Pets', exact: true }).click();
}
