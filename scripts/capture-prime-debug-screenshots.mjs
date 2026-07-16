// Regenerates the baseline reference screenshots shown on the PrimeNG debug page
// (src/app/features/prime-debug). Run this against a running dev server, then commit
// the updated PNGs whenever a PrimeNG/Angular upgrade intentionally changes how these
// components look.
//
// Usage:
//   npm start                                   # in one terminal
//   node scripts/capture-prime-debug-screenshots.mjs   # in another
//
// Note: the dev server only picks up newly created files under dev-assets/ once, at
// startup. The very first time you populate dev-assets/prime-debug/ (or after deleting
// files from it), restart `npm start` afterwards so the new PNGs are actually served —
// otherwise the page will show broken image icons even though the files exist on disk.

import { chromium } from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.resolve(__dirname, '../dev-assets/prime-debug');
const BASE_URL = process.env.PRIME_DEBUG_URL || 'http://localhost:4200/primeDebug';

fs.mkdirSync(OUTPUT_DIR, { recursive: true });

/**
 * One entry per <app-prime-debug-row> in prime-debug.component.html, in DOM order.
 * `file: null` skips capture (row has no component to show, e.g. the Overlay placeholder).
 * `action` runs before capture (e.g. opening a dialog/popover) and `after` runs afterwards
 * to reset state so it doesn't interfere with later rows.
 */
const rows = [
  { file: 'accordion-base.png' },
  { file: 'accordion-study-header.png' },
  { file: 'input-text-base.png' },
  { file: 'input-text-invalid.png' },
  { file: 'input-number-base.png' },
  { file: 'input-number-horizontal.png' },
  {
    file: 'dialog-base.png',
    capture: '.p-dialog',
    action: async ({ row }) => row.getByRole('button', { name: 'Open dialog' }).click(),
    after: async ({ page }) => page.keyboard.press('Escape')
  },
  { file: null }, // Overlay: no standalone usage, nothing to capture
  { file: 'table-base.png' },
  { file: 'table-l0.png' },
  { file: 'divider-horizontal.png' },
  { file: 'divider-vertical.png' },
  { file: 'tabs-base.png' },
  { file: 'tabs-load.png' },
  { file: 'select-base.png' },
  { file: 'select-with-buttons-base.png' },
  { file: 'select-with-buttons-menubar.png' },
  { file: 'radio-button.png' },
  { file: 'textarea.png' },
  {
    file: 'popover-base.png',
    capture: '.p-popover',
    action: async ({ row }) => row.getByRole('button', { name: 'Open popover' }).click(),
    after: async ({ page }) => page.keyboard.press('Escape')
  },
  {
    file: 'popover-scale.png',
    capture: '.p-popover',
    action: async ({ row }) => row.getByRole('button', { name: 'View' }).click(),
    after: async ({ page }) => page.keyboard.press('Escape')
  },
  { file: 'panel.png' },
  { file: 'paginator.png' },
  { file: 'checkbox.png' },
  { file: 'toggle-button.png' },
  { file: 'select-button.png' },
  { file: 'toggle-switch.png' },
  { file: 'input-group.png' },
  { file: 'multiselect-base.png' },
  { file: 'multiselect-toolbar.png' },
  {
    file: 'speed-dial.png',
    capture: '.p-speeddial',
    action: async ({ row }) => row.getByRole('button', { name: /Tools/ }).click(),
    after: async ({ row }) => row.getByRole('button', { name: /Tools/ }).click()
  },
  { file: 'message.png' },
  {
    file: 'toast.png',
    capture: '.p-toast',
    action: async ({ row }) => row.getByRole('button', { name: 'Show toast' }).click()
  },
  { file: 'progress-spinner-base.png' },
  { file: 'progress-spinner-wind.png' }
];

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(BASE_URL, { waitUntil: 'networkidle' });

  const sections = page.locator('.prime-debug-row');
  await sections.first().waitFor({ state: 'attached', timeout: 15000 });
  const count = await sections.count();
  if (count !== rows.length) {
    throw new Error(
      `Expected ${rows.length} .prime-debug-row sections but found ${count}. ` +
        'Update the `rows` mapping in this script to match prime-debug.component.html.'
    );
  }

  // The app eagerly boots a pyodide (Python-in-WASM) web worker on startup, which can
  // starve the main thread for CPU for a while and make overlay transitions/screenshots
  // flaky. Retry each row once before giving up.
  for (let i = 0; i < rows.length; i++) {
    const { file, capture, action, after } = rows[i];
    if (!file) continue;

    const row = sections.nth(i);

    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        await row.scrollIntoViewIfNeeded();
        if (action) await action({ page, row });

        const target = capture ? page.locator(capture).first() : row.locator('.prime-debug-row__demo');
        await target.waitFor({ state: 'visible', timeout: 15000 });
        if (action) await page.waitForTimeout(800); // let open/close transitions settle
        await target.screenshot({ path: path.join(OUTPUT_DIR, file), timeout: 15000 });

        if (after) await after({ page, row });
        console.log(`captured ${file}`);
        break;
      } catch (error) {
        if (after) await after({ page, row }).catch(() => undefined);
        if (attempt === 2) throw error;
        console.warn(`retrying ${file} after error: ${error.message.split('\n')[0]}`);
        await page.waitForTimeout(1000);
      }
    }
  }

  await browser.close();
}

try {
  await main();
} catch (error) {
  console.error(error);
  process.exit(1);
}
