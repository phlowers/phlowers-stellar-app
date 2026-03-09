import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  tsconfig: './tsconfig.e2e.json',
  fullyParallel: false,
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 2 : 0,
  workers: 1,
  reporter: [['html', { outputFolder: 'playwright-report' }], ['list']],
  timeout: 30_000,
  use: {
    baseURL: 'http://localhost:4200',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    actionTimeout: 10_000,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  // No webServer: run `npm start` manually before launching tests.
  // Required because ng serve sets COOP/COEP headers needed by Pyodide's SharedArrayBuffer.
});
