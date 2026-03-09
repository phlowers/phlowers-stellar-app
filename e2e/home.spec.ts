import { test, expect } from '@playwright/test';
import { AppPage } from './pages/app.page';

/**
 * Test suite: Home page navigation
 *
 * Verifies:
 * 1. The user registration dialog appears on first visit (fresh IndexedDB)
 * 2. After registering, the home page renders its key structural elements
 * 3. Navigation to the studies page via the sidebar works
 *
 * Note: Each test gets a fresh browser context (empty IndexedDB),
 * so the user registration dialog will always appear and must be dismissed first.
 */
test.describe('Home page', () => {
  test('should show user registration dialog on first visit', async ({ page }) => {
    const appPage = new AppPage(page);
    await appPage.goto();

    // The dialog appears after Dexie storage initialization (async).
    await expect(appPage.userDialog).toBeVisible({ timeout: 15_000 });
    await expect(appPage.emailInput).toBeVisible();
    await expect(appPage.saveButton).toBeVisible();
  });

  test('should load home page content after user registration', async ({ page }) => {
    const appPage = new AppPage(page);
    await appPage.goto();
    await appPage.dismissUserDialog('test@e2e.local');

    // Sidebar navigation links are visible
    await expect(appPage.sidebarHomeLink).toBeVisible({ timeout: 10_000 });
    await expect(appPage.sidebarStudiesLink).toBeVisible();

    // Topbar shows the registered email (rendered in p.user)
    await expect(appPage.topbar.locator('p.user')).toContainText('test@e2e.local');

    // Home page main content sections
    await expect(page.locator('h2', { hasText: 'My last studies' })).toBeVisible();
    await expect(page.locator('a', { hasText: 'Create a new study' })).toBeVisible();
    await expect(page.locator('a', { hasText: 'Go to my studies' })).toBeVisible();
  });

  test('should navigate to studies page via sidebar', async ({ page }) => {
    const appPage = new AppPage(page);
    await appPage.goto();
    await appPage.dismissUserDialog();

    await appPage.navigateToStudies();

    await expect(page).toHaveURL(/\/studies$/);
    await expect(page.locator('h2', { hasText: 'Studies' })).toBeVisible();
  });

  // INTENTIONALLY FAILING TEST — example of what a red test looks like.
  // The home page does NOT have a "Dashboard" heading; this assertion will always fail.
  test('EXAMPLE failing test — home page has a Dashboard heading [expected to fail]', async ({ page }) => {
    const appPage = new AppPage(page);
    await appPage.goto();
    await appPage.dismissUserDialog();

    await expect(page.locator('h1', { hasText: 'Dashboard' })).toBeVisible({ timeout: 3_000 });
  });
});
