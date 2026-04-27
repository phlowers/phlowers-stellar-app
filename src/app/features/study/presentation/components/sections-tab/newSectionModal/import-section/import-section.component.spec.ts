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
import { ImportSectionComponent } from './import-section.component';
import { SectionImportService } from '@features/study/application/services/section-import.service';
import { IMPORT_ADAPTER_TOKEN } from '@shared/import/domain/import-contracts';
import { GenericImportEngineService } from '@shared/import/application/services/generic-import-engine.service';
import { Study } from '@shared/domain';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const getByTestId = (fixture: ComponentFixture<ImportSectionComponent>, id: string): HTMLElement | null =>
  fixture.nativeElement.querySelector(`[data-testid="${id}"]`);

const buildMockStudy = (): Study => ({
  uuid: 'study-uuid-1',
  author_email: 'test@test.com',
  title: 'Test Study',
  shareable: false,
  created_at_offline: new Date().toISOString(),
  updated_at_offline: new Date().toISOString(),
  saved: true,
  sections: []
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ImportSectionComponent', () => {
  let component: ImportSectionComponent;
  let fixture: ComponentFixture<ImportSectionComponent>;
  let sectionImportServiceMock: vi.Mocked<SectionImportService>;
  let engineMock: vi.Mocked<GenericImportEngineService>;

  beforeEach(async () => {
    sectionImportServiceMock = {
      setStudyContext: vi.fn(),
      accepts: vi.fn().mockReturnValue(true),
      checkCollision: vi.fn().mockResolvedValue(null),
      processFile: vi.fn().mockResolvedValue(null),
      studyContext: vi.fn().mockReturnValue(null)
    } as unknown as vi.Mocked<SectionImportService>;

    engineMock = {
      processFiles: vi.fn().mockResolvedValue([])
    } as unknown as vi.Mocked<GenericImportEngineService>;

    await TestBed.configureTestingModule({
      imports: [ImportSectionComponent],
      providers: [
        provideRouter([]),
        { provide: SectionImportService, useValue: sectionImportServiceMock },
        { provide: IMPORT_ADAPTER_TOKEN, useValue: sectionImportServiceMock },
        { provide: GenericImportEngineService, useValue: engineMock },
        { provide: ConfirmationService, useValue: { confirm: vi.fn() } },
        MessageService
      ]
    })
      .overrideComponent(ImportSectionComponent, {
        remove: {
          providers: [SectionImportService, { provide: IMPORT_ADAPTER_TOKEN, useExisting: SectionImportService }]
        },
        add: {
          providers: [
            { provide: SectionImportService, useValue: sectionImportServiceMock },
            { provide: IMPORT_ADAPTER_TOKEN, useValue: sectionImportServiceMock }
          ]
        }
      })
      .compileComponents();

    fixture = TestBed.createComponent(ImportSectionComponent);
    fixture.componentRef.setInput('study', buildMockStudy());
    fixture.detectChanges();
    component = fixture.componentInstance;
  });

  // -------------------------------------------------------------------------
  // HTML rendering — structure
  // -------------------------------------------------------------------------

  describe('HTML rendering — structure', () => {
    it('should render the section-import container', () => {
      const container = getByTestId(fixture, 'section-import');
      expect(container).toBeTruthy();
    });

    it('should render the generic file-upload input inside app-import', () => {
      const input = fixture.nativeElement.querySelector('[data-testid="file-upload-input"]');
      expect(input).toBeTruthy();
    });
  });

  // -------------------------------------------------------------------------
  // ngOnInit — study context propagation
  // -------------------------------------------------------------------------

  describe('ngOnInit — study context propagation', () => {
    it('should call setStudyContext with the provided study on init', () => {
      const study = buildMockStudy();
      fixture.componentRef.setInput('study', study);
      component.ngOnInit();
      expect(sectionImportServiceMock.setStudyContext).toHaveBeenCalledWith(study);
    });

    it('should not call setStudyContext when study is null', () => {
      sectionImportServiceMock.setStudyContext.mockClear();
      fixture.componentRef.setInput('study', null);
      component.ngOnInit();
      expect(sectionImportServiceMock.setStudyContext).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // syncStudyContext()
  // -------------------------------------------------------------------------

  describe('syncStudyContext()', () => {
    it('should propagate a new study into the adapter when called directly', () => {
      const newStudy = { ...buildMockStudy(), uuid: 'new-study' };
      fixture.componentRef.setInput('study', newStudy);
      component.syncStudyContext();
      expect(sectionImportServiceMock.setStudyContext).toHaveBeenCalledWith(newStudy);
    });
  });

  // -------------------------------------------------------------------------
  // importCompleted output
  // -------------------------------------------------------------------------

  describe('importCompleted output', () => {
    it('should forward importCompleted events from the inner app-import', () => {
      const emitted: unknown[] = [];
      component.importCompleted.subscribe((o) => emitted.push(o));

      const outcomes = [{ fileName: 'ok.json', status: 'success' as const, entityId: 'id-1' }];
      component.onImportCompleted(outcomes);

      expect(emitted).toHaveLength(1);
      expect(emitted[0]).toEqual(outcomes);
    });
  });

  // -------------------------------------------------------------------------
  // config
  // -------------------------------------------------------------------------

  describe('config', () => {
    it('should have .json in accepted extensions', () => {
      expect(component.config.acceptedFiles.extensions).toContain('.json');
    });

    it('should not have a navigationRoute (sections do not navigate on import)', () => {
      expect(component.config.navigationRoute).toBeUndefined();
    });
  });
});
