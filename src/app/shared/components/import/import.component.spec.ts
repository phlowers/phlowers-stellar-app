/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { provideRouter } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ImportComponent } from './import.component';
import { GenericImportEngineService } from '@shared/import/application/services/generic-import-engine.service';
import { IMPORT_ADAPTER_TOKEN, ImportContextConfig, ImportOutcome } from '@shared/import/domain/import-contracts';
import { NotificationService } from '@core/services/notification/notification.service';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const getByTestId = (fixture: ComponentFixture<ImportComponent>, id: string): HTMLElement | null =>
  fixture.nativeElement.querySelector(`[data-testid="${id}"]`);

const getAllByTestId = (fixture: ComponentFixture<ImportComponent>, id: string): NodeListOf<HTMLElement> =>
  fixture.nativeElement.querySelectorAll(`[data-testid="${id}"]`);

/** Creates a minimal FileList-like object compatible with Array.from(). */
const createFileList = (...files: File[]): FileList => {
  const list: Record<string | number, unknown> = { length: files.length, item: (i: number) => files[i] ?? null };
  files.forEach((f, i) => {
    list[i] = f;
  });
  return list as unknown as FileList;
};

const BASIC_CONFIG: ImportContextConfig = {
  acceptedFiles: {
    extensions: ['.json'],
    mimeTypes: ['application/json'],
    hint: 'File format: .json'
  },
  entityLabel: 'Section'
};

const WITH_NAV_CONFIG: ImportContextConfig = {
  ...BASIC_CONFIG,
  navigationRoute: (id) => '/section/' + id
};

const WITH_ACTION_CONFIG: ImportContextConfig = {
  ...BASIC_CONFIG,
  successAction: {
    label: 'Edit',
    action: vi.fn()
  }
};

const WITH_TEXTS_CONFIG: ImportContextConfig = {
  ...BASIC_CONFIG,
  texts: {
    description: 'Import your file here.',
    uploadPrompt: 'Upload a JSON file'
  }
};

const makeOutcomeSuccess = (override: Partial<ImportOutcome> = {}): ImportOutcome => ({
  fileName: 'section.json',
  status: 'success',
  entityId: 'entity-uuid-1',
  entityLabel: 'My Section',
  ...override
});

const makeOutcomeError = (override: Partial<ImportOutcome> = {}): ImportOutcome => ({
  fileName: 'bad.json',
  status: 'error',
  error: { code: 'FILE_PARSE_ERROR', message: 'Bad JSON', stage: 'PARSING' },
  ...override
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ImportComponent', () => {
  let component: ImportComponent;
  let fixture: ComponentFixture<ImportComponent>;
  let engineMock: vi.Mocked<GenericImportEngineService>;
  let confirmationServiceMock: vi.Mocked<ConfirmationService>;
  let notificationServiceMock: { error: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    engineMock = {
      processFiles: vi.fn().mockResolvedValue([])
    } as unknown as vi.Mocked<GenericImportEngineService>;

    confirmationServiceMock = {
      confirm: vi.fn()
    } as unknown as vi.Mocked<ConfirmationService>;

    notificationServiceMock = { error: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [ImportComponent],
      providers: [
        provideRouter([]),
        { provide: GenericImportEngineService, useValue: engineMock },
        { provide: IMPORT_ADAPTER_TOKEN, useValue: {} },
        { provide: ConfirmationService, useValue: confirmationServiceMock },
        { provide: NotificationService, useValue: notificationServiceMock },
        MessageService
      ]
    })
      .overrideComponent(ImportComponent, {
        remove: { providers: [GenericImportEngineService] },
        add: { providers: [{ provide: GenericImportEngineService, useValue: engineMock }] }
      })
      .compileComponents();

    fixture = TestBed.createComponent(ImportComponent);
    fixture.componentRef.setInput('config', BASIC_CONFIG);
    fixture.detectChanges();
    component = fixture.componentInstance;
  });

  // -------------------------------------------------------------------------
  // HTML rendering — structure
  // -------------------------------------------------------------------------

  describe('HTML rendering — structure', () => {
    it('should render the file upload input', () => {
      const input = getByTestId(fixture, 'file-upload-input');
      expect(input).toBeTruthy();
      expect(input?.tagName).toBe('INPUT');
      expect((input as HTMLInputElement).type).toBe('file');
    });

    it('should set the accept attribute from the config', () => {
      const input = getByTestId(fixture, 'file-upload-input') as HTMLInputElement;
      expect(input.accept).toContain('.json');
    });

    it('should not render imported-items-list when no successes', () => {
      expect(getByTestId(fixture, 'imported-items-list')).toBeNull();
    });

    it('should not render import-errors-list when no errors', () => {
      expect(getByTestId(fixture, 'import-errors-list')).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // HTML rendering — description text
  // -------------------------------------------------------------------------

  describe('HTML rendering — description text', () => {
    it('should not render description when texts.description is absent', () => {
      expect(fixture.nativeElement.querySelector('.text-l-600.py-8')).toBeNull();
    });

    it('should render description when texts.description is provided', () => {
      fixture.componentRef.setInput('config', WITH_TEXTS_CONFIG);
      fixture.detectChanges();
      const desc = fixture.nativeElement.querySelector('.text-l-600.py-8');
      expect(desc?.textContent).toContain('Import your file here.');
    });
  });

  // -------------------------------------------------------------------------
  // HTML rendering — success list
  // -------------------------------------------------------------------------

  describe('HTML rendering — success list', () => {
    beforeEach(() => {
      component.outcomes.set([makeOutcomeSuccess()]);
      fixture.detectChanges();
    });

    it('should render imported-items-list when there are successes', () => {
      expect(getByTestId(fixture, 'imported-items-list')).toBeTruthy();
    });

    it('should render one imported-item-success per successful outcome', () => {
      component.outcomes.set([makeOutcomeSuccess(), makeOutcomeSuccess({ fileName: 'b.json' })]);
      fixture.detectChanges();
      expect(getAllByTestId(fixture, 'imported-item-success').length).toBe(2);
    });

    it('should display the entityLabel when available', () => {
      const item = getByTestId(fixture, 'imported-item-success');
      expect(item?.textContent).toContain('My Section');
    });

    it('should fall back to fileName when entityLabel is absent', () => {
      component.outcomes.set([makeOutcomeSuccess({ entityLabel: undefined })]);
      fixture.detectChanges();
      const item = getByTestId(fixture, 'imported-item-success');
      expect(item?.textContent).toContain('section.json');
    });
  });

  // -------------------------------------------------------------------------
  // HTML rendering — navigation link
  // -------------------------------------------------------------------------

  describe('HTML rendering — navigation link', () => {
    it('should NOT render open-imported-btn when config has no navigationRoute', () => {
      component.outcomes.set([makeOutcomeSuccess()]);
      fixture.detectChanges();
      expect(getByTestId(fixture, 'open-imported-btn')).toBeNull();
    });

    it('should render open-imported-btn when config has navigationRoute and entityId is present', () => {
      fixture.componentRef.setInput('config', WITH_NAV_CONFIG);
      component.outcomes.set([makeOutcomeSuccess()]);
      fixture.detectChanges();
      const btn = getByTestId(fixture, 'open-imported-btn');
      expect(btn).toBeTruthy();
      expect(btn?.tagName).toBe('A');
    });

    it('should not render open-imported-btn when entityId is absent', () => {
      fixture.componentRef.setInput('config', WITH_NAV_CONFIG);
      component.outcomes.set([makeOutcomeSuccess({ entityId: undefined })]);
      fixture.detectChanges();
      expect(getByTestId(fixture, 'open-imported-btn')).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // HTML rendering — edit action
  // -------------------------------------------------------------------------

  describe('HTML rendering — edit action', () => {
    it('should NOT render edit-imported-btn when config has no successAction', () => {
      component.outcomes.set([makeOutcomeSuccess()]);
      fixture.detectChanges();
      expect(getByTestId(fixture, 'edit-imported-btn')).toBeNull();
    });

    it('should render edit-imported-btn when config has successAction and entityId is present', () => {
      fixture.componentRef.setInput('config', WITH_ACTION_CONFIG);
      component.outcomes.set([makeOutcomeSuccess()]);
      fixture.detectChanges();
      const btn = getByTestId(fixture, 'edit-imported-btn');
      expect(btn).toBeTruthy();
      expect(btn?.tagName).toBe('BUTTON');
    });

    it('should display the successAction label on the button', () => {
      fixture.componentRef.setInput('config', WITH_ACTION_CONFIG);
      component.outcomes.set([makeOutcomeSuccess()]);
      fixture.detectChanges();
      const btn = getByTestId(fixture, 'edit-imported-btn');
      expect(btn?.textContent?.trim()).toBe('Edit');
    });

    it('should NOT render edit-imported-btn when entityId is absent', () => {
      fixture.componentRef.setInput('config', WITH_ACTION_CONFIG);
      component.outcomes.set([makeOutcomeSuccess({ entityId: undefined })]);
      fixture.detectChanges();
      expect(getByTestId(fixture, 'edit-imported-btn')).toBeNull();
    });

    it('should emit successActionTriggered with the outcome when Edit is clicked', () => {
      fixture.componentRef.setInput('config', WITH_ACTION_CONFIG);
      const outcome = makeOutcomeSuccess();
      component.outcomes.set([outcome]);
      fixture.detectChanges();

      const emitted: ImportOutcome[] = [];
      component.successActionTriggered.subscribe((o) => emitted.push(o));

      const btn = getByTestId(fixture, 'edit-imported-btn') as HTMLButtonElement;
      btn.click();

      expect(emitted).toHaveLength(1);
      expect(emitted[0]).toEqual(outcome);
      expect(WITH_ACTION_CONFIG.successAction!.action).toHaveBeenCalledOnce();
      expect(WITH_ACTION_CONFIG.successAction!.action).toHaveBeenCalledWith(outcome);
    });
  });

  // -------------------------------------------------------------------------
  // reset behaviour
  // -------------------------------------------------------------------------

  describe('reset behaviour', () => {
    it('should clear outcomes when resetToken changes', () => {
      component.outcomes.set([makeOutcomeSuccess(), makeOutcomeError()]);
      fixture.componentRef.setInput('resetToken', 1);
      fixture.detectChanges();
      expect(component.outcomes()).toHaveLength(0);
    });

    it('should clear successOutcomes after reset', () => {
      component.outcomes.set([makeOutcomeSuccess()]);
      fixture.componentRef.setInput('resetToken', 1);
      fixture.detectChanges();
      expect(component.successOutcomes()).toHaveLength(0);
    });

    it('should clear errorOutcomes after reset', () => {
      component.outcomes.set([makeOutcomeError()]);
      fixture.componentRef.setInput('resetToken', 1);
      fixture.detectChanges();
      expect(component.errorOutcomes()).toHaveLength(0);
    });
  });

  // -------------------------------------------------------------------------
  // HTML rendering — error list
  // -------------------------------------------------------------------------

  describe('HTML rendering — error list', () => {
    beforeEach(() => {
      component.outcomes.set([makeOutcomeError()]);
      fixture.detectChanges();
    });

    it('should render import-errors-list when there are errors', () => {
      expect(getByTestId(fixture, 'import-errors-list')).toBeTruthy();
    });

    it('should render one imported-item-error per error outcome', () => {
      component.outcomes.set([makeOutcomeError(), makeOutcomeError({ fileName: 'c.json' })]);
      fixture.detectChanges();
      expect(getAllByTestId(fixture, 'imported-item-error').length).toBe(2);
    });

    it('should display the file name in the error item', () => {
      const item = getByTestId(fixture, 'imported-item-error');
      expect(item?.textContent).toContain('bad.json');
    });

    it('should render imported-item-error-detail when error has a message', () => {
      const detail = getByTestId(fixture, 'imported-item-error-detail');
      expect(detail).toBeTruthy();
      expect(detail?.textContent?.trim()).toBe('Bad JSON');
    });

    it('should not render imported-item-error-detail when error message is absent', () => {
      component.outcomes.set([
        makeOutcomeError({ error: { code: 'FILE_PARSE_ERROR', message: '', stage: 'PARSING' } })
      ]);
      fixture.detectChanges();
      expect(getByTestId(fixture, 'imported-item-error-detail')).toBeNull();
    });

    it('should not render imported-item-error-detail when error is undefined', () => {
      component.outcomes.set([{ fileName: 'no-error.json', status: 'error' }]);
      fixture.detectChanges();
      expect(getByTestId(fixture, 'imported-item-error-detail')).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // HTML rendering — aria attributes
  // -------------------------------------------------------------------------

  describe('HTML rendering — aria attributes', () => {
    it('should set aria-busy="false" on root when not loading', () => {
      const root = fixture.nativeElement.querySelector('.file-import');
      expect(root?.getAttribute('aria-busy')).toBe('false');
    });

    it('should set aria-busy="true" on root while loading', () => {
      component.isLoading.set(true);
      fixture.detectChanges();
      const root = fixture.nativeElement.querySelector('.file-import');
      expect(root?.getAttribute('aria-busy')).toBe('true');
    });

    it('should set aria-label on the input when uploadPrompt is provided', () => {
      fixture.componentRef.setInput('config', WITH_TEXTS_CONFIG);
      fixture.detectChanges();
      const input = getByTestId(fixture, 'file-upload-input');
      expect(input?.getAttribute('aria-label')).toBe('Upload a JSON file');
    });
  });

  // -------------------------------------------------------------------------
  // loadFiles() behaviour
  // -------------------------------------------------------------------------

  describe('loadFiles() behaviour', () => {
    it('should not call engine when no files are selected', async () => {
      const event = { target: { files: null } } as unknown as Event;
      await component.loadFiles(event);
      expect(engineMock.processFiles).not.toHaveBeenCalled();
    });

    it('should set isLoading to true during processing and false after', async () => {
      let capturedLoading = false;
      engineMock.processFiles.mockImplementation(async () => {
        capturedLoading = component.isLoading();
        return [];
      });

      const file = new File(['{}'], 'test.json', { type: 'application/json' });
      const event = { target: { files: createFileList(file) } } as unknown as Event;
      await component.loadFiles(event);

      expect(capturedLoading).toBe(true);
      expect(component.isLoading()).toBe(false);
    });

    it('should accumulate outcomes in the outcomes signal', async () => {
      const success = makeOutcomeSuccess();
      engineMock.processFiles.mockResolvedValue([success]);

      const file = new File(['{}'], 'ok.json', { type: 'application/json' });
      const event = { target: { files: createFileList(file) } } as unknown as Event;
      await component.loadFiles(event);

      expect(component.successOutcomes()).toHaveLength(1);
      expect(component.successOutcomes()[0].entityId).toBe('entity-uuid-1');
    });

    it('should emit importCompleted with the batch results', async () => {
      const outcomes = [makeOutcomeSuccess()];
      engineMock.processFiles.mockResolvedValue(outcomes);

      const emitted: ImportOutcome[][] = [];
      component.importCompleted.subscribe((o) => emitted.push(o));

      const file = new File(['{}'], 'ok.json', { type: 'application/json' });
      const event = { target: { files: createFileList(file) } } as unknown as Event;
      await component.loadFiles(event);

      expect(emitted).toHaveLength(1);
      expect(emitted[0]).toEqual(outcomes);
    });

    it('should reset isLoading to false even when engine throws', async () => {
      engineMock.processFiles.mockRejectedValue(new Error('engine error'));

      const file = new File(['{}'], 'crash.json');
      const event = { target: { files: createFileList(file) } } as unknown as Event;

      try {
        await component.loadFiles(event);
      } catch {
        // expected to rethrow
      }

      expect(component.isLoading()).toBe(false);
    });

    it('should call notificationService.error with filename and error message for each error outcome', async () => {
      const error: ImportOutcome = {
        fileName: 'bad.json',
        status: 'error',
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Section is missing required fields: supports[0].number',
          stage: 'VALIDATION'
        }
      };
      engineMock.processFiles.mockResolvedValue([error]);

      const event = { target: { files: createFileList(new File(['{}'], 'bad.json')) } } as unknown as Event;
      await component.loadFiles(event);

      expect(notificationServiceMock.error).toHaveBeenCalledOnce();
      expect(notificationServiceMock.error).toHaveBeenCalledWith(
        'bad.json: Section is missing required fields: supports[0].number',
        expect.any(String)
      );
    });

    it('should not call notificationService.error for success outcomes', async () => {
      engineMock.processFiles.mockResolvedValue([makeOutcomeSuccess()]);

      const event = { target: { files: createFileList(new File(['{}'], 'ok.json')) } } as unknown as Event;
      await component.loadFiles(event);

      expect(notificationServiceMock.error).not.toHaveBeenCalled();
    });

    it('should not call notificationService.error for skipped outcomes', async () => {
      const skipped: ImportOutcome = { fileName: 'skipped.json', status: 'skipped' };
      engineMock.processFiles.mockResolvedValue([skipped]);

      const event = { target: { files: createFileList(new File(['{}'], 'skipped.json')) } } as unknown as Event;
      await component.loadFiles(event);

      expect(notificationServiceMock.error).not.toHaveBeenCalled();
    });

    it('should call notificationService.error once per error outcome when multiple files are processed', async () => {
      const outcomes: ImportOutcome[] = [
        {
          fileName: 'a.json',
          status: 'error',
          error: { code: 'VALIDATION_ERROR', message: 'Missing: name', stage: 'VALIDATION' }
        },
        makeOutcomeSuccess(),
        {
          fileName: 'b.json',
          status: 'error',
          error: { code: 'FILE_PARSE_ERROR', message: 'Bad JSON', stage: 'PARSING' }
        }
      ];
      engineMock.processFiles.mockResolvedValue(outcomes);

      const event = { target: { files: createFileList(new File(['{}'], 'multi.json')) } } as unknown as Event;
      await component.loadFiles(event);

      expect(notificationServiceMock.error).toHaveBeenCalledTimes(2);
      expect(notificationServiceMock.error).toHaveBeenCalledWith('a.json: Missing: name', expect.any(String));
      expect(notificationServiceMock.error).toHaveBeenCalledWith('b.json: Bad JSON', expect.any(String));
    });
  });

  // -------------------------------------------------------------------------
  // Computed signals
  // -------------------------------------------------------------------------

  describe('computed signals', () => {
    it('should compute acceptAttribute from config extensions and mimeTypes', () => {
      expect(component.acceptAttribute()).toContain('.json');
      expect(component.acceptAttribute()).toContain('application/json');
    });

    it('should compute successOutcomes from outcomes', () => {
      component.outcomes.set([
        makeOutcomeSuccess(),
        makeOutcomeError(),
        { fileName: 'skipped.json', status: 'skipped' }
      ]);
      expect(component.successOutcomes()).toHaveLength(1);
    });

    it('should compute errorOutcomes from outcomes (excluding skipped)', () => {
      component.outcomes.set([
        makeOutcomeSuccess(),
        makeOutcomeError(),
        { fileName: 'skipped.json', status: 'skipped' }
      ]);
      expect(component.errorOutcomes()).toHaveLength(1);
      expect(component.errorOutcomes()[0].status).toBe('error');
    });
  });
});
