import { defineConfig, devices } from '@playwright/test';
import { existsSync } from 'node:fs';

// Codex Cloud provides Chromium but no administrator access to install WebKit's OS libraries.
// GitHub Actions always uses the pinned Playwright browsers and runs both projects.
const systemChromium = process.env.GITHUB_ACTIONS !== `true` && process.platform === `linux` && existsSync(`/usr/bin/chromium`)
  ? `/usr/bin/chromium` : undefined;

export default defineConfig({
  testDir: `./tests`,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: process.env.CI ? `github` : `list`,
  use: {
    baseURL: `http://127.0.0.1:4173/couple-playground/`,
    trace: `retain-on-failure`,
  },
  projects: [
    { name: `chromium`, use: { ...devices[`Desktop Chrome`], browserName: `chromium`, launchOptions: { executablePath: systemChromium } } },
    { name: `iphone-webkit`, use: { ...devices[`iPhone 13`], browserName: `webkit` } },
  ],
  webServer: {
    command: `npm run preview`,
    url: `http://127.0.0.1:4173/couple-playground/`,
    reuseExistingServer: !process.env.CI,
    timeout: 20_000,
  },
});
