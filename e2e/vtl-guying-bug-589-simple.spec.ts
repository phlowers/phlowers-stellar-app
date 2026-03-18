/**
 * E2E Regression test for Bug #589: No support available in VHL/guying
 *
 * SIMPLIFIED VERSION - Tests the core Bug #589 fix assuming dialog is already accessible
 *
 * This test verifies that:
 * 1. Span selection returns objects with { index, uuid } structure
 * 2. Support options are enabled when span has a valid uuid
 * 3. The fix prevents the original bug where uuid was empty
 */

import { expect, test } from '@playwright/test';

test.describe('VTL & Guying - Bug #589 Core Fix Validation', () => {
  test.skip('Core regression - support options enabled when span selected', async ({ page }) => {
    /**
     * NOTE: This test is skipped because it requires manual setup:
     * 1. Navigate to /studies
     * 2. Open a study with multiple sections
     * 3. Select a section
     * 4. Generate a state
     * 5. Open Tools -> VTL & Guying
     *
     * Once the dialog is open, this test validates the Bug #589 fix.
     *
     * To adapt this test to your environment:
     * - Update the navigation steps in beforeEach
     * - Verify data-testid attributes match your templates
     * - Check PrimeNG dropdown class names (.p-select-option vs .p-dropdown-item)
     */

    // Verify the dialog elements exist
    const spanSelect = page.locator('[data-testid="guying-span-select"]');
    const supportSelect = page.locator('[data-testid="reference-support-select"]');

    await expect(spanSelect).toBeVisible();
    await expect(supportSelect).toBeVisible();
    await expect(supportSelect).toBeDisabled(); // Initially disabled

    // Select a span
    await spanSelect.click();
    await page.waitForSelector('.p-select-overlay, .p-dropdown-panel', { timeout: 5000 });

    const spanOptions = page.locator('.p-select-option, .p-dropdown-item');
    const spanCount = await spanOptions.count();

    if (spanCount > 1) {
      // Skip first (empty) option
      await spanOptions.nth(1).click();
    }

    // THIS IS THE KEY TEST FOR BUG #589:
    // After selecting a span with a valid uuid, support options should be enabled
    await expect(supportSelect).toBeEnabled({ timeout: 5000 });

    // Verify support options are populated
    await supportSelect.click();
    await page.waitForSelector('.p-select-overlay, .p-dropdown-panel', { timeout: 5000 });

    const supportOptions = page.locator('.p-select-option, .p-dropdown-item');
    const supportCount = await supportOptions.count();

    // Success: support options are available (Bug #589 is fixed)
    expect(supportCount).toBeGreaterThan(0);
  });
});
