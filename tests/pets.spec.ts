import { test, expect } from '@playwright/test';
import { transport, pocPassword } from './helpers/sharedTransport';
import { openPets } from './navigation';

test.use({ serviceWorkers: 'block' });
test('partners share pet details and food', async ({ browser }) => {
  const server = transport();
  const a = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const b = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await server.attach(a); await server.attach(b);
  const first = await a.newPage(), second = await b.newPage();
  try {
    for (const [page, name] of [[first, 'Masha'], [second, 'Damian']] as const) {
      await page.goto('./'); await page.getByRole('button', { name, exact: true }).click();
      await page.getByLabel('Password', { exact: true }).fill(pocPassword);
      await page.getByRole('button', { name: 'Sign in', exact: true }).click();
      await openPets(page);
    }
    await first.getByRole('button', { name: '+ Add Pet' }).click();
    await first.getByLabel('Name', { exact: true }).fill('Test pet');
    await first.getByLabel('Pet type (optional)').selectOption('Cat');
    await first.getByLabel('Birthday (optional)').fill('2022-01-01');
    await first.getByRole('button', { name: 'Add pet', exact: true }).click();
    await first.getByRole('button', { name: 'View pets' }).click();
    await first.getByRole('button', { name: "Open Test pet's profile" }).click();
    const photo = 'public/icons/icon-192.png';
    await first.getByLabel('Photo', { exact: true }).setInputFiles(photo);
    await expect(first.locator('.pet-profile-photo')).toBeVisible();
    await first.getByLabel('Likes', { exact: true }).fill('Playing');
    await first.getByRole('button', { name: 'Save details' }).click();
    await first.getByRole('button', { name: 'My Food' }).click();
    await first.getByRole('button', { name: '+ Add Food' }).click();
    await first.getByLabel('Packaging photo').setInputFiles(photo);
    await expect(first.getByAltText('Food packaging preview')).toBeVisible();
    await first.getByLabel('Name', { exact: true }).fill('Dinner');
    await first.getByLabel('Brand').fill('Example');
    await first.getByRole('button', { name: 'Save food' }).click();
    await expect(first.getByText('Dinner')).toBeVisible();
    await second.evaluate(() => window.dispatchEvent(new Event('focus')));
    await expect(second.getByRole('button', { name: "Open Test pet's profile" })).toBeVisible();
    await second.getByRole('button', { name: "Open Test pet's profile" }).click();
    await expect(second.getByLabel('Likes', { exact: true })).toHaveValue('Playing');
    await expect(second.locator('.pet-profile-photo')).toBeVisible();
    await second.getByRole('button', { name: 'My Food →' }).click();
    await expect(second.getByText('Dinner')).toBeVisible();
    await expect(second.locator('.food-card img')).toBeVisible();
  } finally { await a.close(); await b.close(); }
});
