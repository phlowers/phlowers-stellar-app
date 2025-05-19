/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SearchSectionComponent } from './search-section.component';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { StorageService } from '../../../core/store/storage.service';
import { Section } from '../../../core/store/database/interfaces/section';

describe('SearchSectionComponent', () => {
  let component: SearchSectionComponent;
  let fixture: ComponentFixture<SearchSectionComponent>;
  let storageServiceMock: any;

  const mockSections: Section[] = [
    {
      uuid: 'uuid-1',
      internal_id: 'internal-1',
      name: 'Test Section 1',
      short_name: 'TS1',
      created_at: '2025-01-01T10:00:00Z',
      updated_at: '2025-01-02T10:00:00Z',
      internal_catalog_id: 'catalog-1',
      type: 'type-1',
      cable_name: 'Cable 1',
      cable_short_name: 'C1',
      cables_amount: 5,
      optical_fibers_amount: 24,
      spans_amount: 3,
      begin_span_name: 'Begin 1',
      last_span_name: 'Last 1',
      first_support_number: 101,
      last_support_number: 105,
      first_attachment_set: 'Attachment 1',
      last_attachment_set: 'Attachment 2',
      regional_maintenance_center_names: ['Regional 1'],
      maintenance_center_names: ['Maintenance 1']
    },
    {
      uuid: 'uuid-2',
      internal_id: 'internal-2',
      name: 'Test Section 2',
      short_name: 'TS2',
      created_at: '2025-01-03T10:00:00Z',
      updated_at: '2025-01-04T10:00:00Z',
      internal_catalog_id: 'catalog-2',
      type: 'type-2',
      cable_name: 'Cable 2',
      cable_short_name: 'C2',
      cables_amount: 3,
      optical_fibers_amount: 12,
      spans_amount: 2,
      begin_span_name: 'Begin 2',
      last_span_name: 'Last 2',
      first_support_number: 201,
      last_support_number: 203,
      first_attachment_set: 'Attachment 3',
      last_attachment_set: 'Attachment 4',
      regional_maintenance_center_names: ['Regional 2'],
      maintenance_center_names: ['Maintenance 2']
    }
  ];

  beforeEach(async () => {
    storageServiceMock = {
      db: {
        sections: {
          toArray: jest.fn().mockResolvedValue(mockSections)
        }
      }
    };

    await TestBed.configureTestingModule({
      imports: [SearchSectionComponent, NoopAnimationsModule],
      providers: [{ provide: StorageService, useValue: storageServiceMock }]
    }).compileComponents();

    fixture = TestBed.createComponent(SearchSectionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with default values', () => {
    expect(component.sections).toEqual([]);
    expect(component.sectionToSearch).toEqual({
      uuid: '',
      internal_id: '',
      name: '',
      short_name: '',
      created_at: '',
      updated_at: '',
      internal_catalog_id: '',
      type: '',
      cable_name: '',
      cable_short_name: '',
      cables_amount: undefined,
      optical_fibers_amount: undefined,
      spans_amount: undefined,
      begin_span_name: '',
      last_span_name: '',
      first_support_number: undefined,
      last_support_number: undefined,
      first_attachment_set: '',
      last_attachment_set: ''
    });
  });

  it('should reset fields when resetFields is called', () => {
    // Arrange
    component.sectionToSearch = {
      uuid: 'test-uuid',
      name: 'Test Name'
      // other properties remain default
    } as Partial<Section>;

    // Act
    component.resetFields();

    // Assert
    expect(component.sectionToSearch).toEqual({
      uuid: '',
      internal_id: '',
      name: '',
      short_name: '',
      created_at: '',
      updated_at: '',
      internal_catalog_id: '',
      type: '',
      cable_name: '',
      cable_short_name: '',
      cables_amount: undefined,
      optical_fibers_amount: undefined,
      spans_amount: undefined,
      begin_span_name: '',
      last_span_name: '',
      first_support_number: undefined,
      last_support_number: undefined,
      first_attachment_set: '',
      last_attachment_set: ''
    });
  });

  it('should search sections when searchStudies is called', async () => {
    // Arrange
    component.sectionToSearch = {
      uuid: 'uuid-1'
    };

    // Act
    await component.searchStudies();

    // Assert
    expect(storageServiceMock.db.sections.toArray).toHaveBeenCalled();
    expect(component.sections.length).toBe(1);
    expect(component.sections[0].uuid).toBe('uuid-1');
  });

  it('should filter sections based on search criteria', async () => {
    // Arrange
    component.sectionToSearch = {
      type: 'type-2'
    };

    // Act
    await component.searchStudies();

    // Assert
    expect(storageServiceMock.db.sections.toArray).toHaveBeenCalled();
    expect(component.sections.length).toBe(1);
    expect(component.sections[0].type).toBe('type-2');
  });

  it('should return all sections when search fields are empty', async () => {
    // Act
    await component.searchStudies();

    // Assert
    expect(storageServiceMock.db.sections.toArray).toHaveBeenCalled();
    expect(component.sections.length).toBe(2);
  });
});
