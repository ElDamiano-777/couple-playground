import { expect, test } from '@playwright/test';
import { mainNavigation } from './navigation';

test.use({ serviceWorkers: 'block' });

test('mobile header greeting fits and Us stays centered in navigation', async ({ browser }) => {
  for (const width of [320, 375, 390, 430]) {
    for (const name of ['masha', 'damian']) {
      const context = await browser.newContext({ viewport: { width, height: 844 }, serviceWorkers: 'block' });
      await context.addInitScript(value => localStorage.setItem('together.profile.v1', value), name);
      const page = await context.newPage(); await page.goto('./');
      const greeting = page.locator('.header-profile');
      await expect(greeting).toContainText(name === 'masha' ? 'Hi, Masha' : 'Hi, Damian');
      expect(await greeting.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
      const geometry = await page.evaluate(() => {
        const rect = (selector: string) => document.querySelector(selector)!.getBoundingClientRect().toJSON();
        return { header: rect('.header'), logo: rect('.wordmark'), greeting: rect('.header-profile'), controls: [...document.querySelectorAll('.header-tools > button:not(.header-profile)')].map(item => item.getBoundingClientRect().toJSON()), heart: rect('.nav-us svg'), nav: rect('.bottom-nav'), width: innerWidth, overflow: document.documentElement.scrollWidth > innerWidth };
      });
      expect(geometry.overflow).toBe(false);
      expect(geometry.greeting.left).toBeGreaterThanOrEqual(geometry.header.left);
      expect(geometry.greeting.right).toBeLessThanOrEqual(geometry.header.right);
      expect(geometry.greeting.bottom).toBeLessThanOrEqual(geometry.header.bottom);
      const overlaps = (a: DOMRect, b: DOMRect) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
      expect(overlaps(geometry.greeting, geometry.logo)).toBe(false);
      for (const control of geometry.controls) expect(overlaps(geometry.greeting, control)).toBe(false);
      expect(Math.abs(geometry.heart.left + geometry.heart.width / 2 - geometry.width / 2)).toBeLessThan(1);
      const nav = mainNavigation(page);
      await expect(nav.getByRole('button')).toHaveText(['Home', 'Shopping', 'Us', 'Places', 'More']);
      for (const label of ['Shopping', 'Us', 'Places', 'More', 'Home']) {
        const tab = nav.getByRole('button', { name: label, exact: true }); await tab.click();
        await expect(tab).toHaveAttribute('aria-current', 'page');
      }
      await context.close();
    }
  }
});
