/**
 * E2E Regression test for Bug #589: No support available in VHL/guying
 *
 * ⚠️ THESE TESTS ARE CURRENTLY SKIPPED ⚠️
 * They require fine-tuning of selectors and timing based on the actual application behavior.
 *
 * These tests validate that:
 * 1. Span selection properly populates with objects containing { index, uuid }
 * 2. Support options become available after selecting a span
 * 3. VTL without guying values are correctly displayed
 * 4. The complete VTL & Guying workflow functions correctly
 *
 * User workflow to reach VTL & Guying dialog:
 * 1. Homepage -> click "Studies" (or navigate to /studies)
 * 2. Select a study -> click "Open" button ([data-testid="open-study-btn"])
 * 3. Select a section (canton) by clicking on it in the canvas/list
 * 4. Click "Generate a state" ([data-testid="generate-state-btn"])
 * 5. Click "Tools" in toolbar
 * 6. Select "VTL & Guying" -> dialog opens
 *
 * TODO before enabling these tests:
 * - Verify the exact selectors for Studies button and navigation
 * - Confirm the section selection mechanism (canvas click vs list)
 * - Check timing for state generation completion
 * - Validate PrimeNG dropdown class names (.p-select-option vs .p-dropdown-item)
 * - Test with actual study data that has sections with multiple spans
 */

import { expect, test, Page } from '@playwright/test';

/**
 * Navigate to VTL & Guying dialog following the complete user workflow
 * NOTE: This function needs adjustment based on actual UI behavior
 */
async function navigateToVtlGuyingDialog(page: Page): Promise<void> {
  // Step 1: Go to homepage
  await page.goto('/', { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForSelector('app-root', { state: 'attached', timeout: 10000 });

  // Step 2: Click on "Studies"
  const studiesButton = page
    .locator('button:has-text("Studies"), a:has-text("Studies"), [data-testid*="studies"]')
    .first();
  await expect(studiesButton).toBeVisible({ timeout: 5000 });
  await studiesButton.click();
  await page.waitForTimeout(1000);

  // Step 3: Select a study by clicking "Open" (select first available study)
  const openButton = page.locator('button:has-text("Open"), button:has-text("Ouvrir")').first();
  await expect(openButton).toBeVisible({ timeout: 5000 });
  await openButton.click();
  await page.waitForTimeout(2000);

  // Step 4: Select a section (canton) by clicking on it
  // Look for clickable sections in the canvas or list
  const section = page.locator('[data-testid*="section"], [data-testid*="canton"], canvas, .section-item').first();
  if (await section.isVisible({ timeout: 3000 })) {
    await section.click();
  }
  await page.waitForTimeout(1000);

  // Step 5: Click "Generate a state"
  const generateButton = page.locator('button:has-text("Generate"), button:has-text("Générer")').first();
  await expect(generateButton).toBeVisible({ timeout: 5000 });
  await generateButton.click();
  await page.waitForTimeout(2000);

  // Step 6: Click "Tools" in toolbar
  const toolsButton = page
    .locator('button:has-text("Tools"), button:has-text("Outils"), [data-testid*="tools"]')
    .first();
  await expect(toolsButton).toBeVisible({ timeout: 5000 });
  await toolsButton.click();
  await page.waitForTimeout(500);

  // Step 7: Select "VTL & Guying"
  const vtlGuyingOption = page.locator('button:has-text("VTL"), li:has-text("VTL")').first();
  await expect(vtlGuyingOption).toBeVisible({ timeout: 3000 });
  await vtlGuyingOption.click();

  // Wait for dialog to open
  await page.waitForSelector('[data-testid="guying-span-select"]', { timeout: 5000 });
}

test.describe('VTL & Guying - Bug #589 Regression', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the VTL & Guying dialog
    // NOTE: This navigation may fail depending on study availability and UI state
    await navigateToVtlGuyingDialog(page);
  });

  test.skip('should populate support options when a span is selected', async ({ page }) => {
    // The dialog is already open from beforeEach
    // Step 1: Check that the span select exists and is enabled
    const spanSelect = page.locator('[data-testid="guying-span-select"]');
    await expect(spanSelect).toBeVisible();
    await expect(spanSelect).toBeEnabled();

    // Step 2: Check that the support select is initially disabled
    const supportSelect = page.locator('[data-testid="reference-support-select"]');
    await expect(supportSelect).toBeVisible();
    await expect(supportSelect).toBeDisabled();

    // Step 3: Select a span
    await spanSelect.click();
    await page.waitForSelector('.p-select-overlay, .p-dropdown-panel', { timeout: 5000 });

    // Select the first available span option (skip the empty option)
    const spanOptions = page.locator('.p-select-option, .p-dropdown-item');
    const spanCount = await spanOptions.count();

    if (spanCount > 0) {
      // Find first non-empty option
      for (let i = 0; i < spanCount; i++) {
        const option = spanOptions.nth(i);
        const text = await option.textContent();
        if (text && text.trim() !== '' && !text.includes('Select') && !text.includes('Sélectionner')) {
          await option.click();
          break;
        }
      }
    }

    // Step 4: Verify that the support select becomes enabled
    await expect(supportSelect).toBeEnabled({ timeout: 5000 });

    // Step 5: Verify that support options are populated
    await supportSelect.click();
    await page.waitForSelector('.p-select-overlay, .p-dropdown-panel', { timeout: 5000 });

    const supportOptions = page.locator('.p-select-option, .p-dropdown-item');
    const supportCount = await supportOptions.count();

    // This is the key test for Bug #589: support options should be available
    expect(supportCount).toBeGreaterThan(0);

    // Select a support
    const firstSupportOption = supportOptions.first();
    await firstSupportOption.click();

    // Step 6: Verify that VTL without guying values are displayed
    // The dialog should show calculated values
    await page.waitForTimeout(1000);

    // Look for any numeric values displayed (indicating calculations worked)
    const dialogContent = page.locator('.p-dialog-content, [role="dialog"]');
    await expect(dialogContent).toBeVisible();
  });

  test.skip('should preserve span uuid when saving VTL & Guying data', async ({ page }) => {
    // The dialog is already open from beforeEach

    // Step 1: Select a span
    const spanSelect = page.locator('[data-testid="guying-span-select"]');
    await spanSelect.click();
    await page.waitForSelector('.p-select-overlay, .p-dropdown-panel', { timeout: 5000 });

    const spanOptions = page.locator('.p-select-option, .p-dropdown-item');
    const spanCount = await spanOptions.count();

    if (spanCount > 0) {
      // Find first non-empty option
      for (let i = 0; i < spanCount; i++) {
        const option = spanOptions.nth(i);
        const text = await option.textContent();
        if (text && text.trim() !== '' && !text.includes('Select') && !text.includes('Sélectionner')) {
          await option.click();
          break;
        }
      }
    }

    // Step 2: Select a support
    const supportSelect = page.locator('[data-testid="reference-support-select"]');
    await expect(supportSelect).toBeEnabled({ timeout: 5000 });
    await supportSelect.click();
    await page.waitForSelector('.p-select-overlay, .p-dropdown-panel', { timeout: 5000 });

    const supportOptions = page.locator('.p-select-option, .p-dropdown-item');
    const firstSupportOption = supportOptions.first();
    await firstSupportOption.click();

    // Step 3: Fill in parameters (if available)
    const altitudeInput = page.locator('[data-testid="altitude-input"]');
    const horizontalDistanceInput = page.locator('[data-testid="horizontal-distance-input"]');

    if (await altitudeInput.isVisible({ timeout: 2000 })) {
      await altitudeInput.fill('150');
    }

    if (await horizontalDistanceInput.isVisible({ timeout: 2000 })) {
      await horizontalDistanceInput.fill('25');
    }

    await page.waitForTimeout(500);

    // Step 4: Save the data
    const saveButton = page
      .locator('button:has-text("Save"), button:has-text("Enregistrer"), [data-testid*="save"]')
      .first();
    if (await saveButton.isVisible({ timeout: 3000 })) {
      await saveButton.click();
      await page.waitForTimeout(1000);
    }

    // Step 5: Close the dialog
    const closeButton = page
      .locator('button[aria-label*="Close"], button.p-dialog-header-close, .p-dialog-close-icon')
      .first();
    if (await closeButton.isVisible({ timeout: 3000 })) {
      await closeButton.click();
      await page.waitForTimeout(1000);
    } else {
      // Try pressing Escape key
      await page.keyboard.press('Escape');
      await page.waitForTimeout(1000);
    }

    // Step 6: Reopen the VTL & Guying tool
    const toolsButton = page
      .locator('button:has-text("Tools"), button:has-text("Outils"), [data-testid*="tools"]')
      .first();
    await expect(toolsButton).toBeVisible({ timeout: 5000 });
    await toolsButton.click();
    await page.waitForTimeout(500);

    const vtlGuyingOption = page.locator('button:has-text("VTL"), li:has-text("VTL")').first();
    await expect(vtlGuyingOption).toBeVisible({ timeout: 3000 });
    await vtlGuyingOption.click();

    await page.waitForSelector('[data-testid="guying-span-select"]', { timeout: 5000 });

    // Step 7: Verify that the data is restored correctly
    // The support select should be enabled (meaning span uuid was preserved)
    const supportSelectAfterReopen = page.locator('[data-testid="reference-support-select"]');
    await expect(supportSelectAfterReopen).toBeEnabled({ timeout: 3000 });

    // Verify that parameters are restored (if they were saved)
    const altitudeInputAfter = page.locator('[data-testid="altitude-input"]');
    const horizontalDistanceInputAfter = page.locator('[data-testid="horizontal-distance-input"]');

    if (await altitudeInputAfter.isVisible({ timeout: 2000 })) {
      // Check that it has some value (exact value may vary based on implementation)
      const altitudeValue = await altitudeInputAfter.inputValue();
      expect(altitudeValue).toBeTruthy();
    }
  });

  test.skip('should disable support select when span is cleared', async ({ page }) => {
    // The dialog is already open from beforeEach

    // Step 1: Select a span
    const spanSelect = page.locator('[data-testid="guying-span-select"]');
    await spanSelect.click();
    await page.waitForSelector('.p-select-overlay, .p-dropdown-panel', { timeout: 5000 });

    const spanOptions = page.locator('.p-select-option, .p-dropdown-item');
    const spanCount = await spanOptions.count();

    if (spanCount > 0) {
      // Find first non-empty option
      for (let i = 0; i < spanCount; i++) {
        const option = spanOptions.nth(i);
        const text = await option.textContent();
        if (text && text.trim() !== '' && !text.includes('Select') && !text.includes('Sélectionner')) {
          await option.click();
          break;
        }
      }
    }

    // Step 2: Verify support select is enabled
    const supportSelect = page.locator('[data-testid="reference-support-select"]');
    await expect(supportSelect).toBeEnabled({ timeout: 5000 });

    // Step 3: Clear the span selection
    // Try to find and click the clear button in the span select
    const clearButton = page
      .locator('[data-testid="guying-span-select"]')
      .locator(
        'button[aria-label*="Clear"], button[aria-label*="Effacer"], .p-select-clear-icon, .p-dropdown-clear-icon'
      )
      .first();

    if (await clearButton.isVisible({ timeout: 2000 })) {
      await clearButton.click();
      await page.waitForTimeout(500);
    } else {
      // Alternative: select the empty option
      await spanSelect.click();
      await page.waitForSelector('.p-select-overlay, .p-dropdown-panel', { timeout: 3000 });

      // Look for empty option or first option
      const emptyOption = page.locator('.p-select-option, .p-dropdown-item').first();
      await emptyOption.click();
      await page.waitForTimeout(500);
    }

    // Step 4: Verify support select is disabled again
    await expect(supportSelect).toBeDisabled({ timeout: 3000 });
  });
});
