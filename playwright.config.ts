import { defineConfig, devices } from '@playwright/test';

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
    { name: `chromium`, use: { ...devices[`Desktop Chrome`] } },
    { name: `iphone-webkit`, use: { ...devices[`iPhone 13`], defaultBrowserType: `webkit` } },
  ],
  webServer: {
    command: `npm run preview`,
    url: `http://127.0.0.1:4173/couple-playground/`,
    reuseExistingServer: !process.env.CI,
    timeout: 20_000,
  },
});
