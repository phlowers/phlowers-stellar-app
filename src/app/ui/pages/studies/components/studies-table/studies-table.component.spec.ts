/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { SortEvent } from 'primeng/api';
import { StudiesTableComponent } from './studies-table.component';
import { Study } from '@src/app/core/data/database/interfaces/study';
import { MessageService } from 'primeng/api';

describe('StudiesTableComponent', () => {
  let component: StudiesTableComponent;
  let fixture: ComponentFixture<StudiesTableComponent>;
  let mockMessageService: jest.Mocked<MessageService>;

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
      add: jest.fn()
    } as unknown as jest.Mocked<MessageService>;

    await TestBed.configureTestingModule({
      imports: [StudiesTableComponent, RouterTestingModule],
      providers: [{ provide: MessageService, useValue: mockMessageService }]
    }).compileComponents();

    fixture = TestBed.createComponent(StudiesTableComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Component Creation', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

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
      fixture.componentRef.setInput('studies', undefined as any);
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
      const deleteSpy = jest.fn();
      component.deleteStudy.subscribe(deleteSpy);

      const testUuid = 'test-uuid-123';
      component.deleteStudy.emit(testUuid);

      expect(deleteSpy).toHaveBeenCalledWith(testUuid);
    });

    it('should emit duplicateStudy event', () => {
      const duplicateSpy = jest.fn();
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
        author_email: null as any,
        title: null as any,
        description: null as any,
        shareable: false,
        created_at_offline: null as any,
        updated_at_offline: null as any,
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
      const largeStudyArray: Study[] = Array.from(
        { length: 1000 },
        (_, index) => ({
          uuid: `study-${index}`,
          author_email: `user${index}@example.com`,
          title: `Study ${index}`,
          description: `Description ${index}`,
          shareable: index % 2 === 0,
          created_at_offline: '2025-01-01T00:00:00.000Z',
          updated_at_offline: '2025-01-01T00:00:00.000Z',
          saved: true,
          sections: []
        })
      );

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
});
