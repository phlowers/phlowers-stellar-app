import { Page, Locator } from '@playwright/test';

/**
 * Page Object for the Studies listing page (/studies).
 * Covers the studies table and the new-study modal.
 */
export class StudiesPage {
  readonly page: Page;

  // Page structure
  readonly heading: Locator;
  readonly createStudyButton: Locator;

  // PrimeNG tabs (p-tab elements)
  readonly myStudiesTab: Locator;
  readonly importStudyTab: Locator;

  // Studies table (app-studies-table wrapping p-table)
  readonly studiesTable: Locator;
  // Data rows only (2nd column = title cell). PrimeNG renders an extra "No records" row
  // when empty, so use this locator instead of tbody tr for empty-state assertions.
  readonly studyTitleCells: Locator;

  // New study modal (app-new-study-modal containing p-dialog)
  readonly newStudyDialog: Locator;
  readonly titleInput: Locator;
  readonly descriptionInput: Locator;
  readonly validateButton: Locator;
  readonly cancelButton: Locator;

  constructor(page: Page) {
    this.page = page;

    this.heading = page.locator('h2', { hasText: 'Studies' });
    this.createStudyButton = page.locator('section button', { hasText: 'Create a new study' });

    this.myStudiesTab = page.locator('p-tab', { hasText: 'My last studies' });
    this.importStudyTab = page.locator('p-tab', { hasText: 'Import a study' });

    this.studiesTable = page.locator('p-table');
    this.studyTitleCells = this.studiesTable.locator('tbody tr td:nth-child(2)');

    // PrimeNG renders dialogs as a portal in the DOM (not inside the p-dialog host element),
    // so we target the rendered div with role="dialog" instead of the Angular host p-dialog.
    this.newStudyDialog = page.locator('[role="dialog"]').filter({ hasText: 'Create a new study' });
    this.titleInput = this.newStudyDialog.locator('input#title');
    this.descriptionInput = this.newStudyDialog.locator('textarea#description');
    this.validateButton = this.newStudyDialog.locator('button', { hasText: 'Validate' });
    this.cancelButton = this.newStudyDialog.locator('button', { hasText: 'Cancel' });
  }

  async waitForTableVisible() {
    await this.studiesTable.waitFor({ state: 'visible' });
  }

  async openNewStudyModal() {
    await this.createStudyButton.click();
    await this.newStudyDialog.waitFor({ state: 'visible' });
  }

  async fillNewStudyForm(title: string, description = '') {
    await this.titleInput.fill(title);
    if (description) {
      await this.descriptionInput.fill(description);
    }
  }

  async submitNewStudy() {
    await this.validateButton.click();
  }

  async cancelNewStudy() {
    await this.cancelButton.click();
    await this.newStudyDialog.waitFor({ state: 'hidden' });
  }

  async getStudyRowCount() {
    return this.studyTitleCells.count();
  }
}
