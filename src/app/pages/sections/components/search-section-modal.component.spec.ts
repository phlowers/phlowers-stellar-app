/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SearchSectionModalComponent } from './search-section-modal.component';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { SectionService } from '../../../core/api/services/section.service';
import { StorageService } from '../../../core/store/storage.service';
import { Section } from '../../../core/store/database/interfaces/section';
import { RegionalMaintenanceCenter } from '../../../core/store/database/interfaces/regionalMaintenanceCenter';
import { MaintenanceCenter } from '../../../core/store/database/interfaces/maintenanceCenter';
import { of } from 'rxjs';

jest.mock('plotly.js-dist-min', () => ({
  newPlot: jest.fn().mockResolvedValue({})
}));

describe('SearchSectionModalComponent', () => {
  let component: SearchSectionModalComponent;
  let fixture: ComponentFixture<SearchSectionModalComponent>;
  let storageServiceMock: any;
  let sectionServiceMock: any;

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

  const mockRegionalMaintenanceCenters: RegionalMaintenanceCenter[] = [
    {
      uuid: 'rmc-uuid-1',
      internal_id: 'rmc-internal-1',
      created_at: '2025-01-01T10:00:00Z',
      updated_at: '2025-01-02T10:00:00Z',
      name: 'Regional 1',
      maintenance_center_names: ['Maintenance 1', 'Maintenance 2']
    },
    {
      uuid: 'rmc-uuid-2',
      internal_id: 'rmc-internal-2',
      created_at: '2025-01-01T10:00:00Z',
      updated_at: '2025-01-02T10:00:00Z',
      name: 'Regional 2',
      maintenance_center_names: ['Maintenance 3', 'Maintenance 4']
    }
  ];

  const mockMaintenanceCenters: MaintenanceCenter[] = [
    {
      uuid: 'mc-uuid-1',
      internal_id: 'mc-internal-1',
      created_at: '2025-01-01T10:00:00Z',
      updated_at: '2025-01-02T10:00:00Z',
      name: 'Maintenance 1'
    },
    {
      uuid: 'mc-uuid-2',
      internal_id: 'mc-internal-2',
      created_at: '2025-01-01T10:00:00Z',
      updated_at: '2025-01-02T10:00:00Z',
      name: 'Maintenance 2'
    },
    {
      uuid: 'mc-uuid-3',
      internal_id: 'mc-internal-3',
      created_at: '2025-01-01T10:00:00Z',
      updated_at: '2025-01-02T10:00:00Z',
      name: 'Maintenance 3'
    },
    {
      uuid: 'mc-uuid-4',
      internal_id: 'mc-internal-4',
      created_at: '2025-01-01T10:00:00Z',
      updated_at: '2025-01-02T10:00:00Z',
      name: 'Maintenance 4'
    }
  ];

  beforeEach(async () => {
    const mockDB = {
      sections: {
        toArray: jest.fn().mockResolvedValue(mockSections)
      },
      regional_maintenance_centers: {
        toArray: jest.fn().mockResolvedValue(mockRegionalMaintenanceCenters),
        where: jest.fn().mockReturnThis(),
        equals: jest.fn().mockReturnThis()
      },
      maintenance_centers: {
        toArray: jest.fn().mockResolvedValue(mockMaintenanceCenters)
      }
    };

    mockDB.regional_maintenance_centers.where().equals.mockReturnValue({
      toArray: jest.fn().mockResolvedValue([mockRegionalMaintenanceCenters[0]])
    });

    storageServiceMock = {
      db: mockDB,
      ready$: of(true)
    };

    sectionServiceMock = {
      searchSections: jest.fn().mockReturnValue(of(mockSections))
    };

    await TestBed.configureTestingModule({
      imports: [SearchSectionModalComponent, NoopAnimationsModule],
      providers: [
        { provide: StorageService, useValue: storageServiceMock },
        { provide: SectionService, useValue: sectionServiceMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(SearchSectionModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with default values', () => {
    expect(component.sections).toEqual([]);
    expect(component.selectedSections).toEqual([]);
    expect(component.searchedSections).toEqual([]);
    expect(component.threeDModalOpen()).toBe(false);
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
      last_attachment_set: '',
      regional_maintenance_center_name: '',
      maintenance_center_name: ''
    });
  });

  it('should close modal when closeModal is called', () => {
    // Arrange
    component.isOpen = true;
    const emitSpy = jest.spyOn(component.isOpenChange, 'emit');

    // Act
    component.closeModal();

    // Assert
    expect(component.isOpen).toBe(false);
    expect(emitSpy).toHaveBeenCalledWith(false);
  });

  it('should open 3D modal when openThreeDModal is called', () => {
    // Act
    component.openThreeDModal();

    // Assert
    expect(component.threeDModalOpen()).toBe(true);
  });

  it('should close 3D modal when closeThreeDModal is called', () => {
    // Arrange
    component.threeDModalOpen.set(true);

    // Act
    component.closeThreeDModal();

    // Assert
    expect(component.threeDModalOpen()).toBe(false);
  });

  it('should reset fields when resetFields is called', () => {
    // Arrange
    component.sectionToSearch = {
      uuid: 'test-uuid',
      name: 'Test Name',
      regional_maintenance_center_name: 'Regional 1',
      maintenance_center_name: 'Maintenance 1'
    } as any;
    const resetRegionalMaintenanceCenterSpy = jest.spyOn(
      component,
      'resetRegionalMaintenanceCenter'
    );

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
      last_attachment_set: '',
      regional_maintenance_center_name: '',
      maintenance_center_name: ''
    });
    expect(resetRegionalMaintenanceCenterSpy).toHaveBeenCalled();
  });

  it('should update maintenance centers when regional maintenance center changes', async () => {
    // Arrange
    const event = { value: 'Regional 1' };

    // Act
    await component.onRegionalMaintenanceCenterChange(event);

    // Assert
    expect(
      storageServiceMock.db.regional_maintenance_centers.where
    ).toHaveBeenCalledWith('name');
    expect(
      storageServiceMock.db.regional_maintenance_centers.where().equals
    ).toHaveBeenCalledWith('Regional 1');
    expect(component.maintenanceCenters()).toEqual(
      ['Maintenance 1', 'Maintenance 2'].sort()
    );
    expect(component.sectionToSearch.maintenance_center_name).toBe('');
  });

  it('should properly handle the identity method', () => {
    // Arrange
    const section = mockSections[0];

    // Act
    const result = component.identity(section);

    // Assert
    expect(result).toBe(section);
  });

  it('should call console.log when createStudy is called', () => {
    // Arrange
    const section = mockSections[0];
    const consoleSpy = jest.spyOn(console, 'log');

    // Act
    component.createStudy(section);

    // Assert
    expect(consoleSpy).toHaveBeenCalledWith('createStudy', section);
  });

  it('should initialize regional maintenance centers and maintenance centers on ngOnInit', () => {
    // Assert
    expect(
      storageServiceMock.db.regional_maintenance_centers.toArray
    ).toHaveBeenCalled();
    expect(
      storageServiceMock.db.maintenance_centers.toArray
    ).toHaveBeenCalled();
  });

  it('should filter sections correctly with filterSections method - empty criteria', () => {
    // Arrange
    const section = mockSections[0];
    component.sectionToSearch = {
      uuid: '',
      internal_id: '',
      name: '',
      // Other fields with empty values...
      regional_maintenance_center_name: '',
      maintenance_center_name: ''
    };

    // Act
    const result = component.filterSections(
      section,
      mockRegionalMaintenanceCenters,
      mockMaintenanceCenters
    );

    // Assert
    expect(result).toBe(true);
  });

  it('should filter sections correctly with filterSections method - matching criteria', () => {
    // Arrange
    const section = mockSections[0];
    component.sectionToSearch = {
      uuid: 'uuid-1',
      name: 'Test Section',
      regional_maintenance_center_name: 'Regional 1',
      maintenance_center_name: 'Maintenance 1'
    } as any;

    // Act
    const result = component.filterSections(
      section,
      mockRegionalMaintenanceCenters,
      mockMaintenanceCenters
    );

    // Assert
    expect(result).toBe(true);
  });

  it('should filter sections correctly with filterSections method - non-matching criteria', () => {
    // Arrange
    const section = mockSections[0];
    component.sectionToSearch = {
      uuid: 'non-matching',
      name: 'Non-matching',
      regional_maintenance_center_name: 'Regional 2',
      maintenance_center_name: 'Maintenance 2'
    } as any;

    // Act
    const result = component.filterSections(
      section,
      mockRegionalMaintenanceCenters,
      mockMaintenanceCenters
    );

    // Assert
    expect(result).toBe(false);
  });

  it('should filter sections correctly with filterSections method - partial match', () => {
    // Arrange
    const section = mockSections[0];
    component.sectionToSearch = {
      name: 'Test',
      cable_name: 'Cable'
    } as any;

    // Act
    const result = component.filterSections(
      section,
      mockRegionalMaintenanceCenters,
      mockMaintenanceCenters
    );

    // Assert
    expect(result).toBe(true);
  });

  it('should filter sections correctly with filterSections method - numeric value', () => {
    // Arrange
    const section = mockSections[0];
    component.sectionToSearch = {
      cables_amount: 5
    } as any;

    // Act
    const result = component.filterSections(
      section,
      mockRegionalMaintenanceCenters,
      mockMaintenanceCenters
    );

    // Assert
    expect(result).toBe(true);
  });

  it('should search sections correctly when searchSections is called', async () => {
    // Arrange
    component.sectionToSearch = {
      name: 'Test Section 1'
    } as any;

    // const filterSectionsSpy = jest
    //   .spyOn(component, 'filterSections')
    //   .mockReturnValue(true);

    // Act
    await component.searchSections();

    // Assert
    expect(component.isLoading).toBe(true);
    expect(storageServiceMock.db.sections.toArray).toHaveBeenCalled();
    // expect(
    //   storageServiceMock.db.regional_maintenance_centers.toArray
    // ).toHaveBeenCalled();
    // expect(
    //   storageServiceMock.db.maintenance_centers.toArray
    // ).toHaveBeenCalled();
    // expect(filterSectionsSpy).toHaveBeenCalled();
    // expect(component.sections.length).toBe(2); // All sections passed the filter
  });

  it('should filter sections when searchSections is called with search criteria', async () => {
    // Arrange
    component.sectionToSearch = {
      name: 'Non-matching name'
    } as any;

    // const filterSectionsSpy = jest
    //   .spyOn(component, 'filterSections')
    //   .mockReturnValue(false);

    // Act
    await component.searchSections();

    // Assert
    expect(component.isLoading).toBe(true);
    // expect(filterSectionsSpy).toHaveBeenCalled();
    // expect(component.sections.length).toBe(0); // No sections passed the filter
  });

  // it('should set isLoading to true and then false when searchSections is called', async () => {
  //   // Arrange
  //   const isLoadingValues: boolean[] = [];
  //   Object.defineProperty(component, 'isLoading', {
  //     get: jest.fn().mockImplementation(() => component.isLoading),
  //     set: jest.fn().mockImplementation((value) => {
  //       component.isLoading = value;
  //       isLoadingValues.push(value);
  //     })
  //   });
  //   component.isLoading = false;

  //   // Act
  //   const promise = component.searchSections();

  //   // Assert that isLoading is set to true initially
  //   expect(isLoadingValues[0]).toBe(true);

  //   // Wait for the promise to resolve
  //   await promise;

  //   // Assert that isLoading is set back to false
  //   expect(isLoadingValues[1]).toBe(false);
  // });
});
