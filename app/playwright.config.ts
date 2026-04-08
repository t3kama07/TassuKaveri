import { defineConfig, devices } from '@playwright/test';
import { getBaseURL, loadE2EEnv } from './tests/e2e/helpers/env';

loadE2EEnv();

const baseURL = getBaseURL();

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: process.env.CI ? 2 : 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: [
    ['list'],
    ['html', { open: 'never' }],
  ],
  globalSetup: './tests/e2e/global.setup.ts',
  timeout: 90_000,
  expect: {
    timeout: 10_000,
  },
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
      },
    },
  ],
  webServer: process.env.PLAYWRIGHT_SKIP_WEBSERVER
    ? undefined
    : {
        command: 'npm run dev',
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 180_000,
      },
});
