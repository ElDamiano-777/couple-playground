import { devices, expect, test } from '@playwright/test';
import { mainNavigation } from './navigation';
import { pocPassword, transport } from './helpers/sharedTransport';

test.use({ viewport: devices['iPhone 13'].viewport, userAgent: devices['iPhone 13'].userAgent, deviceScaleFactor: 3, isMobile: true, hasTouch: true, serviceWorkers: 'block' });

for (const theme of ['dark', 'light']) {
  test(`last cards clear the docked ${theme} navigation and a reduced visible viewport`, async ({ page, context }) => {
    await context.addInitScript(theme => localStorage.setItem('together.theme.v1.masha', theme), theme);
    const server = transport();
    for (let i = 0; i < 10; i++) {
      server.seedShopping(`Item ${i}`, '');
      server.seedTask(`Task ${i}`, null, 'normal');
    }
    await server.attach(context);
    await page.goto('./');
    await page.getByRole('button', { name: 'Masha', exact: true }).click();
    await page.getByLabel('Password', { exact: true }).fill(pocPassword);
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    const nav = mainNavigation(page), scroll = page.locator('.page-scroll');
    const checkBottom = async (selector: string) => {
      await scroll.evaluate(el => el.scrollTo(0, el.scrollHeight));
      const bounds = await page.evaluate(selector => {
        const card = document.querySelector(selector)!.getBoundingClientRect();
        const scrollBox = document.querySelector('.page-scroll')!.getBoundingClientRect();
        const heart = document.querySelector('.bottom-nav .nav-us svg')!.getBoundingClientRect();
        const viewport = window.visualViewport!;
        return { cardTop: card.top, cardBottom: card.bottom, scrollTop: scrollBox.top, limit: Math.min(heart.top, viewport.offsetTop + viewport.height) };
      }, selector);
      expect(bounds.cardTop).toBeGreaterThanOrEqual(bounds.scrollTop);
      expect(bounds.cardBottom).toBeLessThanOrEqual(bounds.limit - 12);
    };
    await checkBottom('.dinner-dashboard');
    const position = await nav.boundingBox();
    await page.evaluate(() => {
      Object.defineProperty(window.visualViewport!, 'height', { configurable: true, value: 650 });
      window.visualViewport!.dispatchEvent(new Event('resize'));
    });
    await checkBottom('.dinner-dashboard');
    expect((await nav.boundingBox())!.y).toBe(position!.y);
    await page.evaluate(() => {
      delete (window.visualViewport as unknown as { height?: number }).height;
      window.visualViewport!.dispatchEvent(new Event('resize'));
    });
    await nav.getByRole('button', { name: 'Shopping', exact: true }).click();
    await checkBottom('.shopping-list-row:last-child');
    const dock = await page.evaluate(() => {
      const scroll = document.querySelector('.page-scroll')!.getBoundingClientRect();
      const nav = document.querySelector('.bottom-nav')!.getBoundingClientRect();
      return { scrollBottom: scroll.bottom, navBottom: nav.bottom, screenBottom: innerHeight };
    });
    expect(dock.scrollBottom).toBe(dock.screenBottom);
    expect(dock.navBottom).toBe(dock.screenBottom);
    // A real list row must continue below the bar's top instead of being clipped above it.
    await scroll.evaluate(el => el.scrollTo(0, 0));
    await page.evaluate(() => {
      const scroll = document.querySelector('.page-scroll')!;
      const nav = document.querySelector('.bottom-nav')!.getBoundingClientRect();
      const row = document.querySelector('.shopping-list-row')!.getBoundingClientRect();
      scroll.scrollTop += row.bottom - nav.top - 25;
    });
    const overlap = await page.locator('.shopping-list-row').first().evaluate(el => {
      const row = el.getBoundingClientRect();
      const nav = document.querySelector('.bottom-nav')!.getBoundingClientRect();
      const scroll = document.querySelector('.page-scroll')!.getBoundingClientRect();
      return { rowTop: row.top, rowBottom: row.bottom, navTop: nav.top, scrollBottom: scroll.bottom };
    });
    expect(overlap.rowTop).toBeLessThan(overlap.navTop);
    expect(overlap.rowBottom).toBeGreaterThan(overlap.navTop);
    expect(overlap.rowBottom).toBeLessThanOrEqual(overlap.scrollBottom);
    for (const name of ['Us', 'Places', 'More', 'Home']) {
      await nav.getByRole('button', { name, exact: true }).click();
      await scroll.evaluate(el => el.scrollTo(0, el.scrollHeight));
      expect((await nav.boundingBox())!.y).toBe(position!.y);
    }
    await page.locator('.task-dashboard').getByRole('button', { name: 'View all' }).click();
    await checkBottom('.task-row:last-child');
  });
}
