import { expect, test } from '@playwright/test';
import { mainNavigation } from './navigation';
import { pocPassword, transport } from './helpers/sharedTransport';

test.use({ serviceWorkers: 'block' });

test('search cannot reveal unread notes or scheduled surprises for either partner', async ({ browser }) => {
  const server = transport(); const start = Math.floor(Date.now() / 60000) * 60000; server.setServerTime(start);
  const contexts = await Promise.all([390, 360].map(width => browser.newContext({ viewport: { width, height: 844 }, serviceWorkers: 'block' })));
  const pages = [];
  for (const [index, context] of contexts.entries()) {
    await server.attach(context); const page = await context.newPage(); pages.push(page);
    await page.clock.setFixedTime(new Date(start)); await page.goto('./');
    await page.getByRole('button', { name: index ? 'Damian' : 'Masha', exact: true }).click();
    await page.getByLabel('Password', { exact: true }).fill(pocPassword); await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await mainNavigation(page).getByRole('button', { name: 'Us', exact: true }).click(); await page.getByRole('button', { name: /Open love notes/ }).click();
  }
  const [masha, damian] = pages;
  await masha.getByRole('button', { name: '+ Write a note' }).click(); await masha.getByLabel('Partner note').fill('violet synthetic letter'); await masha.getByRole('button', { name: 'Send', exact: true }).click();
  await masha.getByRole('button', { name: '+ Write a note' }).click(); await masha.getByLabel('Schedule a surprise 💌').check();
  await masha.getByLabel('Partner note').fill('sunbeam synthetic surprise');
  const future = await masha.evaluate(() => { const d = new Date(Date.now() + 600000), p = (n: number) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`; });
  await masha.getByLabel('Delivery date and time').fill(future); await masha.getByRole('button', { name: 'Schedule', exact: true }).click();
  async function search(page: typeof masha, value: string) {
    const response = page.waitForResponse(result => result.url().includes('/rpc/searchable_partner_notes') && result.ok());
    await page.getByLabel('Search Together').click(); const payload = await (await response).json();
    await page.locator('.search-page input').fill(value); return payload as { body: string | null }[];
  }
  const receivedPayload = await search(damian, 'violet synthetic letter');
  expect(receivedPayload.some(note => note.body === 'violet synthetic letter')).toBe(false);
  expect(receivedPayload).toHaveLength(0);
  expect(receivedPayload.some(note => note.body === 'sunbeam synthetic surprise')).toBe(false);
  await expect(damian.locator('.search-results')).toContainText('No matches');
  await damian.locator('.search-page input').fill('sunbeam synthetic surprise'); await expect(damian.locator('.search-results')).toContainText('No matches');
  const sentPayload = await search(masha, 'violet synthetic letter'); expect(sentPayload.some(note => note.body === 'violet synthetic letter')).toBe(true);
  await expect(masha.locator('.search-results')).toContainText('violet synthetic letter');
  await mainNavigation(damian).getByRole('button', { name: 'Us', exact: true }).click(); await damian.getByRole('button', { name: /Open love notes/ }).click();
  await expect(damian.getByText('violet synthetic letter')).toHaveCount(0); await damian.getByRole('button', { name: /Open note/ }).click(); await expect(damian.getByText('violet synthetic letter')).toBeVisible();
  const openedPayload = await search(damian, 'violet synthetic letter'); expect(openedPayload.some(note => note.body === 'violet synthetic letter')).toBe(true); await expect(damian.locator('.search-results')).toContainText('violet synthetic letter');
  await damian.reload(); const reopenedPayload = await search(damian, 'violet synthetic letter'); expect(reopenedPayload.some(note => note.body === 'violet synthetic letter')).toBe(true);
  await mainNavigation(damian).getByRole('button', { name: 'Us', exact: true }).click(); await damian.getByRole('button', { name: /Open love notes/ }).click(); await damian.getByRole('button', { name: '+ Write a note' }).click();
  await damian.getByLabel('Partner note').fill('coral synthetic letter'); await damian.getByRole('button', { name: 'Send', exact: true }).click();
  await mainNavigation(masha).getByRole('button', { name: 'Us', exact: true }).click(); await masha.getByRole('button', { name: /Open love notes/ }).click();
  const reversePayload = await search(masha, 'coral synthetic letter'); expect(reversePayload.some(note => note.body === 'coral synthetic letter')).toBe(false); await expect(masha.locator('.search-results')).toContainText('No matches');
  await mainNavigation(masha).getByRole('button', { name: 'Us', exact: true }).click(); await masha.getByRole('button', { name: /Open love notes/ }).click(); await masha.getByRole('button', { name: /Open note/ }).click();
  await expect(masha.getByText('coral synthetic letter')).toBeVisible(); await search(masha, 'coral synthetic letter'); await expect(masha.locator('.search-results')).toContainText('coral synthetic letter');
  await Promise.all(contexts.map(context => context.close()));
});
