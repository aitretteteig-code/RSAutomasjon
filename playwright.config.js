// @ts-check
const { defineConfig, devices } = require('@playwright/test');

const headed = process.env.PW_HEADLESS !== '1';
const testTimeout = Number(process.env.PW_TEST_TIMEOUT_MS || 15 * 60 * 1000);
const expectTimeout = Number(process.env.PW_EXPECT_TIMEOUT_MS || 20 * 1000);
const workers = Number(process.env.PW_WORKERS || 1);
const headedLaunchOptions = headed
  ? {
      slowMo: 250,
      args: ['--start-maximized', '--window-position=40,40', '--window-size=1440,900'],
    }
  : {};

module.exports = defineConfig({
  testDir: './test-artifacts/playwright/tests',
  timeout: testTimeout,
  expect: {
    timeout: expectTimeout
  },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers,
  outputDir: './test-artifacts/evidence/playwright-results',
  reporter: [
    ['list'],
    ['html', { outputFolder: './test-artifacts/evidence/playwright-report', open: 'never' }]
  ],
  use: {
    baseURL: process.env.RS_STORE_URL || 'https://rsbutikk-blue.test.ngdata.no/retailsuite/store/',
    headless: !headed,
    viewport: { width: 1440, height: 900 },
    ignoreHTTPSErrors: true,
    actionTimeout: 20000,
    navigationTimeout: 60000,
    launchOptions: headedLaunchOptions,
    screenshot: 'only-on-failure',
    video: process.env.PW_VIDEO || 'off',
    trace: process.env.PW_TRACE || 'off'
  },
  projects: [
    {
      name: 'edge',
      use: {
        ...devices['Desktop Edge'],
        channel: 'msedge',
        viewport: { width: 1440, height: 900 }
      }
    }
  ]
});
