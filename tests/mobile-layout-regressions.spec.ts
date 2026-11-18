import { expect, test } from '@playwright/test';
import { mainNavigation } from './navigation';
import { pocPassword, transport } from './helpers/sharedTransport';
import { localToday, relationshipDates } from '../src/couple/relationshipDates';

test.use({ serviceWorkers: 'block', isMobile: true, hasTouch: true });

test('sticky header, floating navigation and offers remain usable on narrow phones', async ({ browser }) => {
  for (const width of [320, 390]) {
    const context = await browser.newContext({ viewport: { width, height: 844 }, isMobile: true, hasTouch: true, serviceWorkers: 'block' });
    const server = transport();
    server.seedShopping('Milk', '');
    await server.attach(context);
    await context.route('**/rest/v1/offers?*', route => route.fulfill({ json: [{ id: 'offer-1', store: 'kaufland', origin: 'import', household_id: null, title: 'Milk', brand: '', quantity_text: '1 l', price_cents: 99, regular_price_cents: null, base_price_text: '', category: 'Dairy', valid_from: '2020-01-01', valid_to: '2099-12-31' }] }));
    await context.route('**/rest/v1/offer_import_runs?*', route => route.fulfill({ json: [] }));
    await context.route('**/rest/v1/offer_match_rejections?*', route => route.fulfill({ json: [] }));
    const page = await context.newPage();
    await page.goto('./');
    await page.getByRole('button', { name: 'Masha', exact: true }).click();
    await page.getByLabel('Password', { exact: true }).fill(pocPassword);
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    const nav = mainNavigation(page);
    await nav.getByRole('button', { name: 'Us', exact: true }).click();
    await page.getByRole('button', { name: 'Set our date' }).click();
    await page.getByLabel('The day you got together').fill('2020-02-29');
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    const header = page.locator('.header');
    expect((await page.getByRole('heading', { name: 'Us.' }).boundingBox())!.y).toBeGreaterThanOrEqual((await header.boundingBox())!.y + (await header.boundingBox())!.height);
    const duration = relationshipDates('2020-02-29', localToday());
    await expect(page.locator('.our-time')).toContainText(`${duration.years} years`);
    expect(await page.locator('.our-time-duration').evaluate(el => el.getBoundingClientRect().height / parseFloat(getComputedStyle(el).lineHeight))).toBeLessThan(1.2);
    await nav.getByRole('button', { name: 'Shopping', exact: true }).click();
    expect((await page.getByRole('heading', { name: 'Shopping.' }).boundingBox())!.y).toBeGreaterThanOrEqual((await header.boundingBox())!.y + (await header.boundingBox())!.height);
    await page.locator('.app').evaluate(el => el.scrollTo(0, el.scrollHeight));
    const row = page.locator('.shopping-list-row').filter({ hasText: 'Milk' });
    expect((await row.boundingBox())!.y + (await row.boundingBox())!.height).toBeLessThan((await nav.boundingBox())!.y);
    await page.getByRole('button', { name: /This week’s offers/ }).click();
    const search = page.getByRole('searchbox', { name: 'Search offers' });
    const searchBox = await search.boundingBox(), filters = await page.getByRole('group', { name: 'Stores' }).boundingBox();
    expect(Math.abs(searchBox!.width - filters!.width)).toBeLessThan(2);
    expect(filters!.x + filters!.width).toBeLessThanOrEqual(width);
    await search.fill('Milk');
    await expect(page.locator('.offer-card').filter({ hasText: 'Milk' }).first()).toBeVisible();
    await page.getByRole('group', { name: 'Stores' }).getByRole('button', { name: /ALDI/ }).click();
    await expect(page.getByText('No offers match your search.')).toBeVisible();
    for (const name of ['Home', 'Us', 'Shopping', 'Places', 'More']) {
      await nav.getByRole('button', { name, exact: true }).click();
      await expect(nav.getByRole('button', { name, exact: true })).toHaveAttribute('aria-current', 'page');
      await expect(page.locator('.bottom-nav')).toHaveCount(1);
      const app = page.locator('.app');
      await app.evaluate(el => el.scrollTo(0, 0));
      const initial = await nav.boundingBox();
      for (let pass = 0; pass < 3; pass++) {
        await app.evaluate(el => el.scrollTo(0, el.scrollHeight));
        expect(Math.abs((await nav.boundingBox())!.y - initial!.y)).toBeLessThan(1);
        const last = page.locator('main button:visible, main a:visible, main input:visible').last();
        if (await last.count()) {
          const box = await last.boundingBox();
          expect(box!.y + box!.height).toBeLessThanOrEqual(initial!.y);
        }
        await app.evaluate(el => el.scrollTo(0, 0));
        expect(Math.abs((await nav.boundingBox())!.y - initial!.y)).toBeLessThan(1);
      }
    }
    // Viewport scroll events must not reposition the navigation during page scrolling.
    const beforeViewportEvent = await nav.boundingBox();
    await page.evaluate(() => {
      const viewport = window.visualViewport!;
      Object.defineProperty(viewport, 'height', { configurable: true, value: 640 });
      Object.defineProperty(viewport, 'offsetTop', { configurable: true, value: 20 });
      viewport.dispatchEvent(new Event('resize'));
    });
    expect(Math.abs((await nav.boundingBox())!.y - beforeViewportEvent!.y)).toBeLessThan(1);
    await page.evaluate(() => {
      const viewport = window.visualViewport!;
      delete (viewport as unknown as Record<string, unknown>).height;
      delete (viewport as unknown as Record<string, unknown>).offsetTop;
      viewport.dispatchEvent(new Event('resize'));
    });
    expect((await nav.boundingBox())!.y + (await nav.boundingBox())!.height).toBeLessThanOrEqual(844);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await context.close();
  }
});
