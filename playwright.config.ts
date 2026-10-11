import { defineConfig, devices } from '@playwright/test';

const port = Number(process.env.PORT || 5058);
const baseURL = process.env.BASE_URL || `http://127.0.0.1:${port}`;
process.env.BASE_URL = baseURL;
process.env.API_BASE ||= baseURL;

export default defineConfig({
  timeout: 30_000,
  expect: { timeout: 5_000 },
  testDir: 'tests',
  testMatch: ['e2e/**/*.spec.ts', 'admin-widget-visibility.spec.ts', 'featured-layout.spec.ts'],
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL,
    headless: true,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    viewport: { width: 1366, height: 900 }
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  // Never silently attach to a different seat's server.
  webServer: process.env.E2E_EXTERNAL_SERVER === '1' ? undefined : {
    command: 'npm run dev',
    url: baseURL,
    env: { PORT: String(port), HOST: '127.0.0.1' },
    reuseExistingServer: false,
  },
});
