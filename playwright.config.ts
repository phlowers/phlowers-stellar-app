import { defineConfig } from '@playwright/test';

const PORT = process.env.E2E_PORT ? Number(process.env.E2E_PORT) : 4310;

export default defineConfig({
  testDir: './e2e',
  timeout: 120_000,
  expect: {
    timeout: 30_000
  },
  fullyParallel: false,
  retries: 1,
  workers: 1,
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    headless: true,
    trace: 'on-first-retry'
  },
  webServer: {
    command: `node e2e/update-sim-server.mjs`,
    port: PORT,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      E2E_PORT: String(PORT),
      E2E_DIST_DIR: process.env.E2E_DIST_DIR || 'dist/en'
    }
  }
});
