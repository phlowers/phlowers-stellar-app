/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { SortEvent } from 'primeng/api';
import { StudiesTableComponent } from './studies-table.component';
import { Study } from '@shared/domain';
import { MessageService } from 'primeng/api';
import { TranslocoTestingModule } from '@jsverse/transloco';

describe('StudiesTableComponent', () => {
  let component: StudiesTableComponent;
  let fixture: ComponentFixture<StudiesTableComponent>;
  let mockMessageService: vi.Mocked<MessageService>;

  const getByTestId = (testId: string): HTMLElement | null =>
    fixture.nativeElement.querySelector(`[data-testid="${testId}"]`);
  const getAllByTestId = (testId: string): HTMLElement[] =>
    Array.from(fixture.nativeElement.querySelectorAll(`[data-testid="${testId}"]`));

  const mockStudy1: Study = {
    uuid: 'test-uuid-1',
    author_email: 'test1@example.com',
    title: 'Test Study 1',
    description: 'Test Description 1',
    shareable: true,
    created_at_offline: '2025-01-01T00:00:00.000Z',
    updated_at_offline: '2025-01-01T00:00:00.000Z',
    saved: true,
    sections: []
  };

  const mockStudy2: Study = {
    uuid: 'test-uuid-2',
    author_email: 'test2@example.com',
    title: 'Test Study 2',
    description: 'Test Description 2',
    shareable: false,
    created_at_offline: '2025-01-02T00:00:00.000Z',
    updated_at_offline: '2025-01-02T00:00:00.000Z',
    saved: false,
    sections: []
  };

  const mockStudies: Study[] = [mockStudy1, mockStudy2];

  beforeEach(async () => {
    mockMessageService = {
      add: vi.fn()
    } as unknown as vi.Mocked<MessageService>;

    await TestBed.configureTestingModule({
      imports: [
        StudiesTableComponent,
        TranslocoTestingModule.forRoot({
          langs: { en: {}, fr: {} },
          translocoConfig: { availableLangs: ['en', 'fr'], defaultLang: 'en' }
        })
      ],
      providers: [{ provide: MessageService, useValue: mockMessageService }, provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(StudiesTableComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Component Creation', () => {
    it('should initialize with default values', () => {
      expect(component.sortField()).toBe('');
      expect(component.sortOrder()).toBe(1);
    });
  });

  describe('Input Properties', () => {
    it('should accept studies input', () => {
      fixture.componentRef.setInput('studies', mockStudies);
      expect(component.studies()).toEqual(mockStudies);
    });

    it('should handle empty studies array', () => {
      fixture.componentRef.setInput('studies', []);
      expect(component.studies()).toEqual([]);
    });

    it('should handle undefined studies input', () => {
      fixture.componentRef.setInput('studies', undefined as unknown as Study[]);
      expect(component.studies()).toBeUndefined();
    });
  });

  describe('Sorting Functionality', () => {
    it('should update sortField and sortOrder when onSort is called', () => {
      const mockSortEvent: SortEvent = {
        field: 'title',
        order: -1
      };

      component.onSort(mockSortEvent);

      expect(component.sortField()).toBe('title');
      expect(component.sortOrder()).toBe(-1);
    });

    it('should handle ascending sort order', () => {
      const mockSortEvent: SortEvent = {
        field: 'author_email',
        order: 1
      };

      component.onSort(mockSortEvent);

      expect(component.sortField()).toBe('author_email');
      expect(component.sortOrder()).toBe(1);
    });

    it('should handle descending sort order', () => {
      const mockSortEvent: SortEvent = {
        field: 'created_at_offline',
        order: -1
      };

      component.onSort(mockSortEvent);

      expect(component.sortField()).toBe('created_at_offline');
      expect(component.sortOrder()).toBe(-1);
    });

    it('should handle sort event with undefined field', () => {
      const mockSortEvent: SortEvent = {
        field: undefined,
        order: 1
      };

      component.onSort(mockSortEvent);

      expect(component.sortField()).toBeUndefined();
      expect(component.sortOrder()).toBe(1);
    });

    it('should handle sort event with undefined order', () => {
      const mockSortEvent: SortEvent = {
        field: 'title',
        order: undefined
      };

      component.onSort(mockSortEvent);

      expect(component.sortField()).toBe('title');
      expect(component.sortOrder()).toBeUndefined();
    });
  });

  describe('Output Events', () => {
    it('should emit deleteStudy event', () => {
      const deleteSpy = vi.fn();
      component.deleteStudy.subscribe(deleteSpy);

      const testUuid = 'test-uuid-123';
      component.deleteStudy.emit(testUuid);

      expect(deleteSpy).toHaveBeenCalledWith(testUuid);
    });

    it('should emit duplicateStudy event', () => {
      const duplicateSpy = vi.fn();
      component.duplicateStudy.subscribe(duplicateSpy);

      const testUuid = 'test-uuid-456';
      component.duplicateStudy.emit(testUuid);

      expect(duplicateSpy).toHaveBeenCalledWith(testUuid);
    });
  });

  describe('Component Integration', () => {
    it('should maintain component state during re-renders', () => {
      fixture.componentRef.setInput('studies', mockStudies);
      fixture.detectChanges();

      // Change sort state
      component.onSort({ field: 'title', order: 1 });
      expect(component.sortField()).toBe('title');
      expect(component.sortOrder()).toBe(1);

      // Re-render
      fixture.detectChanges();

      // State should be maintained
      expect(component.sortField()).toBe('title');
      expect(component.sortOrder()).toBe(1);
    });

    it('should handle multiple sort operations', () => {
      // First sort
      component.onSort({ field: 'title', order: 1 });
      expect(component.sortField()).toBe('title');
      expect(component.sortOrder()).toBe(1);

      // Second sort
      component.onSort({ field: 'author_email', order: -1 });
      expect(component.sortField()).toBe('author_email');
      expect(component.sortOrder()).toBe(-1);

      // Third sort
      component.onSort({ field: 'created_at_offline', order: 1 });
      expect(component.sortField()).toBe('created_at_offline');
      expect(component.sortOrder()).toBe(1);
    });
  });

  describe('Edge Cases', () => {
    it('should handle studies with missing properties', () => {
      const incompleteStudy: Partial<Study> = {
        uuid: 'incomplete-uuid',
        title: 'Incomplete Study'
      };

      fixture.componentRef.setInput('studies', [incompleteStudy as Study]);
      fixture.detectChanges();

      expect(component).toBeTruthy();
      expect(component.studies()).toEqual([incompleteStudy as Study]);
    });

    it('should handle null or undefined study properties gracefully', () => {
      const nullStudy: Study = {
        uuid: 'null-uuid',
        author_email: null as unknown as string,
        title: null as unknown as string,
        description: null as unknown as string,
        shareable: false,
        created_at_offline: null as unknown as string,
        updated_at_offline: null as unknown as string,
        saved: false,
        sections: []
      };

      fixture.componentRef.setInput('studies', [nullStudy]);
      fixture.detectChanges();

      expect(component).toBeTruthy();
    });

    it('should handle empty string values', () => {
      const emptyStudy: Study = {
        uuid: 'empty-uuid',
        author_email: '',
        title: '',
        description: '',
        shareable: false,
        created_at_offline: '',
        updated_at_offline: '',
        saved: false,
        sections: []
      };

      fixture.componentRef.setInput('studies', [emptyStudy]);
      fixture.detectChanges();

      expect(component).toBeTruthy();
    });

    it('should handle very large study arrays', () => {
      const largeStudyArray: Study[] = Array.from({ length: 1000 }, (_, index) => ({
        uuid: `study-${index}`,
        author_email: `user${index}@example.com`,
        title: `Study ${index}`,
        description: `Description ${index}`,
        shareable: index % 2 === 0,
        created_at_offline: '2025-01-01T00:00:00.000Z',
        updated_at_offline: '2025-01-01T00:00:00.000Z',
        saved: true,
        sections: []
      }));

      fixture.componentRef.setInput('studies', largeStudyArray);
      fixture.detectChanges();

      expect(component.studies()).toEqual(largeStudyArray);
      expect(component.studies().length).toBe(1000);
    });
  });

  describe('Signal Behavior', () => {
    it('should properly update signals when inputs change', () => {
      // Initial state
      expect(component.sortField()).toBe('');
      expect(component.sortOrder()).toBe(1);

      // Update sort field
      component.onSort({ field: 'title', order: -1 });
      expect(component.sortField()).toBe('title');
      expect(component.sortOrder()).toBe(-1);

      // Update sort order
      component.onSort({ field: 'title', order: 1 });
      expect(component.sortField()).toBe('title');
      expect(component.sortOrder()).toBe(1);
    });

    it('should maintain signal reactivity', () => {
      fixture.componentRef.setInput('studies', mockStudies);

      expect(component.studies()).toEqual(mockStudies);

      // Update the input
      const newStudies = [
        ...mockStudies,
        {
          uuid: 'test-uuid-3',
          author_email: 'test3@example.com',
          title: 'Test Study 3',
          description: 'Test Description 3',
          shareable: true,
          created_at_offline: '2025-01-03T00:00:00.000Z',
          updated_at_offline: '2025-01-03T00:00:00.000Z',
          saved: true,
          sections: []
        }
      ];

      fixture.componentRef.setInput('studies', newStudies);
      expect(component.studies()).toEqual(newStudies);
    });
  });

  describe('UC: should display studies table with rows', () => {
    it('UC-S1: should display studies table with rows for each study', () => {
      fixture.componentRef.setInput('studies', mockStudies);
      fixture.detectChanges();

      const table = getByTestId('studies-table');
      expect(table).toBeTruthy();

      const rows = getAllByTestId('study-row');
      expect(rows.length).toBe(2);
    });

    it('UC-S2: should show open button for each study row', () => {
      fixture.componentRef.setInput('studies', mockStudies);
      fixture.detectChanges();

      const openBtns = getAllByTestId('open-study-btn');
      expect(openBtns.length).toBe(2);
      expect(openBtns[0].tagName).toBe('A');
    });

    it('UC-S3: should emit duplicateStudy output', () => {
      fixture.componentRef.setInput('studies', mockStudies);
      fixture.detectChanges();

      const spy = vi.fn();
      component.duplicateStudy.subscribe(spy);

      component.duplicateStudy.emit('test-uuid-1');
      expect(spy).toHaveBeenCalledWith('test-uuid-1');
    });

    it('UC-S4: should emit deleteStudy output', () => {
      fixture.componentRef.setInput('studies', mockStudies);
      fixture.detectChanges();

      const spy = vi.fn();
      component.deleteStudy.subscribe(spy);

      component.deleteStudy.emit('test-uuid-1');
      expect(spy).toHaveBeenCalledWith('test-uuid-1');
    });
  });

  describe('HTML rendering - new data-testid elements', () => {
    it('should render select-all checkbox in header', () => {
      fixture.componentRef.setInput('studies', mockStudies);
      fixture.detectChanges();

      const el = getByTestId('select-all-checkbox');
      expect(el).toBeTruthy();
    });

    it('should render study checkbox for each row', () => {
      fixture.componentRef.setInput('studies', mockStudies);
      fixture.detectChanges();

      const checkboxes = getAllByTestId('study-checkbox');
      expect(checkboxes.length).toBe(2);
    });

    it('should render study actions button for each row', () => {
      fixture.componentRef.setInput('studies', mockStudies);
      fixture.detectChanges();

      const btns = getAllByTestId('study-actions-btn');
      expect(btns.length).toBe(2);
      expect(btns[0].tagName).toBe('BUTTON');
    });
  });
});
