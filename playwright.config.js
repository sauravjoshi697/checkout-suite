const { defineConfig } = require('@playwright/test');

// CHROME_PATH   -> use an already-installed Chrome/Chromium instead of Playwright's download.
// NO_SANDBOX=1  -> needed only when running as root (containers/CI).
const launchOptions = {
  executablePath: process.env.CHROME_PATH || undefined,
  args: process.env.NO_SANDBOX ? ['--no-sandbox'] : []
};

module.exports = defineConfig({
  testDir: 'tests',
  timeout: 15000,
  expect: { timeout: 5000 },
  retries: 0,
  fullyParallel: true,
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'results/html-report' }],
    ['json', { outputFile: 'results/results.json' }]
  ],
  outputDir: 'results/artifacts',
  use: {
    baseURL: 'http://127.0.0.1:4173',
    launchOptions,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure'
  },
  webServer: {
    command: 'node server.js',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: true,
    timeout: 10000
  }
});
