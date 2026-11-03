import { expect, test, type Page } from '@playwright/test';
import { transport, pocPassword } from './helpers/sharedTransport';
import { mainNavigation, openPets, openShopping, openShoppingCategory } from './navigation';

test.use({ serviceWorkers: 'block' });
async function login(page: Page, name: 'Masha' | 'Damian') {
  await page.goto('./'); await page.getByRole('button', { name, exact: true }).click();
  await page.getByLabel('Password', { exact: true }).fill(pocPassword);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
}
async function createPetAndFood(page: Page, name: string, photo: boolean) {
  await openPets(page);
  await page.getByRole('button', { name: '+ Add Pet' }).click();
  await page.getByLabel('Name', { exact: true }).fill(name);
  await page.getByLabel('Pet type (optional)').selectOption('Cat');
  await page.getByRole('button', { name: 'Add pet', exact: true }).click();
  await page.getByRole('button', { name: 'View pets' }).click();
  await page.locator('.pet-card').filter({ hasText: name }).getByRole('button', { name: 'My Food' }).click();
  await page.getByRole('button', { name: '+ Add Food' }).click();
  await page.getByLabel('Name', { exact: true }).fill('Shared dinner');
  await page.getByLabel('Brand').fill('Example');
  await page.getByLabel('Food type').selectOption('Dry');
  await page.getByLabel('Package size (optional)').fill('1.8 kg');
  await page.getByLabel('Notes (optional)').fill('Store in a cool place');
  if (photo) {
    await page.getByLabel('Packaging photo').setInputFiles('public/icons/icon-192.png');
    await expect(page.getByAltText('Food packaging preview')).toBeVisible();
  }
  await page.getByRole('button', { name: 'Save food' }).click();
  await expect(page.getByText('Shared dinner', { exact: true })).toBeVisible();
}

test('pet food is shared, grouped by saved product and added without copying photos', async ({ browser }) => {
  test.setTimeout(150000);
  const server = transport();
  const a = await browser.newContext({ viewport: { width: 320, height: 844 }, serviceWorkers: 'block' });
  const b = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
  await server.attach(a); await server.attach(b);
  const first = await a.newPage(), second = await b.newPage();
  try {
    await login(first, 'Masha'); await login(second, 'Damian');
    await createPetAndFood(first, 'First pet', true);
    await createPetAndFood(first, 'Second pet', false);
    await openShopping(first); await openShoppingCategory(first, 'Pets');
    await expect(first.getByRole('heading', { name: 'Our Pets’ Food' })).toBeVisible();
    const card = first.locator('.pet-food-shopping-card').filter({ hasText: 'Shared dinner' });
    await expect(card).toHaveCount(1);
    await expect(card).toContainText('For First pet & Second pet');
    await expect(card).toContainText('Example'); await expect(card).toContainText('Dry Food'); await expect(card).toContainText('1.8 kg');
    await expect(card).toContainText('Store in a cool place');
    await expect(card.locator('img')).toBeVisible();
    const photo = await card.locator('img').getAttribute('src');
    expect(await first.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const adding = first.waitForRequest(request => request.url().includes('/shopping_items') && request.method() === 'POST');
    await card.getByRole('button', { name: /Add Shared dinner/ }).click();
    await expect(first.getByRole('status').filter({ hasText: 'Shared dinner added to your Pets list.' })).toBeVisible();
    const payload = (await adding).postDataJSON();
    expect(payload.pet_food_id).toBeTruthy(); expect(payload.photo).toBeUndefined(); expect(payload.category).toBe('Pets');
    const row = first.locator('.grocery-row').filter({ hasText: 'Shared dinner' });
    await expect(row.locator('img')).toHaveAttribute('src', photo!);
    await expect(row).toContainText('For: First pet & Second pet');
    await expect(row).toContainText('Brand: Example'); await expect(row).toContainText('Size: 1.8 kg'); await expect(row).toContainText('Store in a cool place');
    await mainNavigation(first).getByRole('button', { name: 'Us', exact: true }).click();
    const dashboardRow = first.locator('.us-shopping-item').filter({ hasText: 'Shared dinner' });
    await expect(dashboardRow.locator('img')).toHaveAttribute('src', photo!);
    await expect(dashboardRow).toContainText('Pets'); await expect(dashboardRow).toContainText('First pet & Second pet'); await expect(dashboardRow).toContainText('Brand: Example');
    await openShopping(first); await openShoppingCategory(first, 'Pets');
    await openShopping(second); await openShoppingCategory(second, 'Pets');
    await second.getByRole('button', { name: 'Refresh', exact: true }).click();
    const partnerRow = second.locator('.grocery-row').filter({ hasText: 'Shared dinner' });
    await expect(partnerRow.locator('img')).toHaveAttribute('src', photo!);
    await expect(partnerRow).toContainText('Added by your partner');
    await partnerRow.getByRole('checkbox').click(); await expect(partnerRow.getByRole('checkbox')).toBeChecked();
    await partnerRow.getByRole('button', { name: 'Edit Shared dinner' }).click();
    await second.getByLabel('Details (optional)').fill('For: First pet & Second pet · Example · 1.8 kg');
    await second.getByRole('button', { name: 'Save item' }).click();
    await expect(partnerRow.locator('img')).toHaveAttribute('src', photo!);
    await first.getByRole('button', { name: 'Refresh', exact: true }).click();
    await expect(row.getByRole('checkbox')).toBeChecked(); await expect(row.locator('img')).toHaveAttribute('src', photo!);
    await expect(row).toContainText('For: First pet & Second pet');
    await first.reload(); await openShopping(first); await openShoppingCategory(first, 'Pets');
    await expect(row.locator('img')).toHaveAttribute('src', photo!);
    await expect(row.getByRole('checkbox')).toBeChecked();
    await first.getByRole('button', { name: '✦ Quick Add' }).click();
    await first.getByRole('button', { name: 'Care & supplies' }).click();
    await first.getByRole('button', { name: 'Cat litter' }).click();
    await first.getByRole('button', { name: 'Add 1 item' }).click();
    await expect(first.getByText('Cat litter', { exact: true })).toBeVisible();
    await expect(row).toBeVisible();
  } finally { await a.close(); await b.close(); }
});
