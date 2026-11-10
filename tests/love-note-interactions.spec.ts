import { expect, test } from '@playwright/test';
import { mainNavigation } from './navigation';
import { pocPassword, transport } from './helpers/sharedTransport';

test.use({ serviceWorkers: 'block' });

test('reactions are shared and favorites stay private on phones', async ({ browser }) => {
  const server = transport();
  const contexts = await Promise.all([390, 360, 390].map(width => browser.newContext({ viewport: { width, height: 844 }, serviceWorkers: 'block' })));
  const pages = [];
  for (const [index, context] of contexts.entries()) {
    await server.attach(context); const page = await context.newPage(); pages.push(page);
    await page.goto('./'); await page.getByRole('button', { name: index === 1 ? 'Damian' : 'Masha', exact: true }).click();
    await page.getByLabel('Password', { exact: true }).fill(pocPassword); await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await mainNavigation(page).getByRole('button', { name: 'Us', exact: true }).click(); await page.getByRole('button', { name: /Open love notes/ }).click();
  }
  const [masha, damian, otherDevice] = pages;
  await masha.getByRole('button', { name: 'Favorites', exact: true }).click(); await expect(masha.getByText('Your favorite letters will appear here.')).toBeVisible();
  await masha.getByRole('button', { name: 'All', exact: true }).click();
  await damian.getByRole('button', { name: '+ Write a note' }).click(); await damian.getByLabel('Partner note').fill('A shared letter'); await damian.getByRole('button', { name: 'Send', exact: true }).click();
  const ownLetter = damian.locator('.note-open').filter({ hasText: 'A shared letter' });
  await ownLetter.getByRole('button', { name: 'React with Heart' }).click(); await expect(ownLetter).toContainText('You ❤️');
  await masha.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
  const envelope = masha.locator('.note-envelope'); await expect(envelope).toHaveCount(1); await expect(envelope.getByRole('group', { name: 'Reactions' })).toHaveCount(0);
  await envelope.getByRole('button', { name: 'Add to favorites' }).click(); await masha.getByRole('button', { name: 'Favorites', exact: true }).click();
  await expect(masha.locator('.note-envelope')).toHaveCount(1); await expect(masha.getByText('A shared letter')).toHaveCount(0);
  await masha.locator('.note-envelope').getByRole('button', { name: /Open note/ }).click();
  const letter = masha.locator('.note-open').filter({ hasText: 'A shared letter' }); await expect(letter).toContainText('Partner ❤️');
  await letter.getByRole('button', { name: 'React with Love' }).click(); await expect(letter).toContainText('You 🥰');
  await damian.evaluate(() => document.dispatchEvent(new Event('visibilitychange'))); await expect(ownLetter).toContainText('Partner 🥰');
  await expect(ownLetter.getByRole('button', { name: 'Add to favorites' })).toBeVisible();
  await letter.getByRole('button', { name: 'React with Laugh' }).click(); await expect(letter).toContainText('You 😂');
  await letter.getByRole('button', { name: 'React with Laugh' }).click(); await expect(letter).not.toContainText('You 😂');
  await letter.getByRole('button', { name: 'React with Love' }).click(); await expect(letter).toContainText('You 🥰');
  await otherDevice.evaluate(() => document.dispatchEvent(new Event('visibilitychange'))); await otherDevice.getByRole('button', { name: 'Favorites', exact: true }).click();
  await expect(otherDevice.getByText('A shared letter')).toBeVisible(); await otherDevice.reload(); await mainNavigation(otherDevice).getByRole('button', { name: 'Us', exact: true }).click(); await otherDevice.getByRole('button', { name: /Open love notes/ }).click(); await otherDevice.getByRole('button', { name: 'Favorites', exact: true }).click(); await expect(otherDevice.getByText('A shared letter')).toBeVisible(); await expect(otherDevice.locator('.note-open')).toContainText('You 🥰');
  await letter.getByRole('button', { name: 'Remove from favorites' }).click(); await expect(masha.getByText('Your favorite letters will appear here.')).toBeVisible();
  for (const page of pages) expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await Promise.all(contexts.map(context => context.close()));
});
