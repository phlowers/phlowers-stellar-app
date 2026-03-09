import { Page, Locator } from '@playwright/test';

/**
 * Shared Page Object for the root application shell.
 * Handles:
 * - User registration dialog (p-dialog that appears on first visit when IndexedDB is empty)
 * - Sidebar navigation links
 */
export class AppPage {
  readonly page: Page;

  // User registration dialog ("Log in" p-dialog, appears after Dexie storage init)
  readonly userDialog: Locator;
  readonly emailInput: Locator;
  readonly saveButton: Locator;

  // Topbar (shows current page title, worker status, user email)
  readonly topbar: Locator;

  // Sidebar navigation links (IDs set in logged-layout.component.ts)
  readonly sidebarHomeLink: Locator;
  readonly sidebarStudiesLink: Locator;

  constructor(page: Page) {
    this.page = page;

    // PrimeNG renders dialogs as a portal in the DOM (not inside the p-dialog host element),
    // so we target the rendered div with role="dialog" instead of the Angular host p-dialog.
    this.userDialog = page.locator('[role="dialog"]').filter({ hasText: 'Log in' });
    this.emailInput = this.userDialog.locator('input#email');
    this.saveButton = this.userDialog.locator('button', { hasText: 'Save' });

    this.topbar = page.locator('header').first();

    this.sidebarHomeLink = page.locator('#sideB-home');
    this.sidebarStudiesLink = page.locator('#sideB-studies');
  }

  async goto() {
    await this.page.goto('/');
    await this.page.waitForSelector('app-root');
  }

  /**
   * Dismisses the user registration dialog by submitting an email.
   * Should be called at the start of every test since each test gets a fresh
   * browser context (empty IndexedDB), which always triggers the dialog.
   */
  async dismissUserDialog(email = 'test@e2e.local') {
    await this.userDialog.waitFor({ state: 'visible', timeout: 15_000 });
    await this.emailInput.fill(email);
    await this.saveButton.click();
    await this.userDialog.waitFor({ state: 'hidden' });
  }

  async navigateToStudies() {
    await this.sidebarStudiesLink.click();
    await this.page.waitForURL('**/studies');
  }

  async navigateToHome() {
    await this.sidebarHomeLink.click();
    await this.page.waitForURL('/');
  }
}
