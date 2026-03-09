import { test, expect } from '@playwright/test';
import { AppPage } from './pages/app.page';
import { StudiesPage } from './pages/studies.page';

/**
 * Test suite: Studies CRUD flow
 *
 * Verifies:
 * 1. The studies page renders the expected structure (tabs, table)
 * 2. The table is empty on a fresh browser context (no studies in IndexedDB)
 * 3. The "Create a new study" modal can be opened, and Validate is disabled when title is empty
 * 4. After creating a study, the app navigates to the study detail page (/study/:uuid)
 *
 * beforeEach: navigates to home, dismisses user dialog, then navigates to /studies.
 */
test.describe('Studies page', () => {
  test.beforeEach(async ({ page }) => {
    const appPage = new AppPage(page);
    await appPage.goto();
    await appPage.dismissUserDialog();
    await appPage.navigateToStudies();
  });

  test('should display studies page structure', async ({ page }) => {
    const studiesPage = new StudiesPage(page);

    await expect(studiesPage.heading).toBeVisible();
    await expect(studiesPage.createStudyButton).toBeVisible();

    // PrimeNG tabs
    await expect(studiesPage.myStudiesTab).toBeVisible();
    await expect(studiesPage.importStudyTab).toBeVisible();

    // Studies table rendered by app-studies-table
    await studiesPage.waitForTableVisible();
    await expect(studiesPage.studiesTable).toBeVisible();
  });

  test('should show empty studies table on first visit', async ({ page }) => {
    const studiesPage = new StudiesPage(page);
    await studiesPage.waitForTableVisible();

    // Fresh IndexedDB → no studies.
    // PrimeNG p-table renders a default "No records found" row when data is empty,
    // so we check that no td with a study title (2nd column) exists.
    await expect(page.locator('p-table tbody tr td:nth-child(2)')).toHaveCount(0);
  });

  test('should open new study modal and Validate button is disabled when title is empty', async ({ page }) => {
    const studiesPage = new StudiesPage(page);
    await studiesPage.waitForTableVisible();
    await studiesPage.openNewStudyModal();

    await expect(studiesPage.newStudyDialog).toBeVisible();
    await expect(studiesPage.titleInput).toBeVisible();

    // Validate is disabled when titleLength() === 0 (Angular signal binding)
    await expect(studiesPage.validateButton).toBeDisabled();

    // Filling the title enables the button
    await studiesPage.titleInput.fill('My Study');
    await expect(studiesPage.validateButton).toBeEnabled();

    // Cancel closes the modal
    await studiesPage.cancelNewStudy();
    await expect(studiesPage.newStudyDialog).not.toBeVisible();
  });

  test('should create a new study and navigate to study detail page', async ({ page }) => {
    const studiesPage = new StudiesPage(page);
    await studiesPage.waitForTableVisible();

    await studiesPage.openNewStudyModal();
    await studiesPage.fillNewStudyForm('E2E Test Study', 'Created by Playwright E2E test');
    await studiesPage.submitNewStudy();

    // After submission, studiesService.createStudy() writes to IndexedDB and the component
    // calls router.navigate(['/study', uuid]). Wait for redirect.
    await page.waitForURL(/\/study\/[0-9a-f-]+$/, { timeout: 15_000 });
    await expect(page).toHaveURL(/\/study\/[0-9a-f-]+$/);
  });
});
