import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SectionsComponent } from './sections.component';
import { StorageService } from '../../core/store/storage.service';
import { MessageService } from 'primeng/api';
import { Router } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { CreateSectionComponent } from './components/create-section.component';
import { Section } from '../../core/store/database/interfaces/section';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { SectionService } from '../../core/api/services/section.service';

// Mock Plotly properly
jest.mock('plotly.js-dist-min', () => ({
  newPlot: jest.fn().mockResolvedValue({})
}));

// Mock UUID to ensure predictable values
jest.mock('uuid', () => ({
  v4: () => 'test-uuid-1234'
}));

describe('SectionsComponent', () => {
  let component: SectionsComponent;
  let fixture: ComponentFixture<SectionsComponent>;
  let storageServiceMock: any;
  let messageServiceMock: any;
  let routerMock: any;
  let sectionServiceMock: any;

  const mockSections: Section[] = [
    {
      uuid: 'section-1',
      name: 'Test Section 1',
      internal_id: 'TS1',
      short_name: 'TS1',
      regional_maintenance_center_names: ['Center 1'],
      maintenance_center_names: ['MC1'],
      type: 'Type 1',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      internal_catalog_id: 'catalog-1',
      cable_name: 'Cable 1',
      cable_short_name: 'C1',
      cables_amount: 1,
      optical_fibers_amount: 1,
      spans_amount: 1,
      begin_span_name: 'Span 1',
      last_span_name: 'Span 1',
      first_support_number: 1,
      last_support_number: 1,
      first_attachment_set: '1',
      last_attachment_set: '1'
    },
    {
      uuid: 'section-2',
      name: 'Test Section 2',
      internal_id: 'TS2',
      short_name: 'TS2',
      regional_maintenance_center_names: ['Center 2'],
      maintenance_center_names: ['MC2'],
      type: 'Type 2',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      internal_catalog_id: 'catalog-2',
      cable_name: 'Cable 2',
      cable_short_name: 'C2',
      cables_amount: 2,
      optical_fibers_amount: 2,
      spans_amount: 2,
      begin_span_name: 'Span 2',
      last_span_name: 'Span 2',
      first_support_number: 2,
      last_support_number: 2,
      first_attachment_set: '2',
      last_attachment_set: '2'
    }
  ];

  const mockUser = {
    email: 'test@example.com',
    name: 'Test User'
  };

  beforeEach(async () => {
    // Setup mocks
    storageServiceMock = {
      ready$: new BehaviorSubject(true),
      db: {
        sections: {
          toArray: jest.fn().mockResolvedValue(mockSections),
          add: jest.fn().mockResolvedValue(undefined)
        },
        studies: {
          add: jest.fn().mockResolvedValue(undefined),
          toArray: jest.fn().mockResolvedValue([])
        },
        users: {
          toArray: jest.fn().mockResolvedValue([mockUser])
        },
        loadMockDataFromJson: jest.fn().mockResolvedValue(undefined)
      }
    };

    messageServiceMock = {
      add: jest.fn()
    };

    routerMock = {
      navigate: jest.fn()
    };

    sectionServiceMock = {
      getSections: jest.fn().mockResolvedValue([])
    };

    await TestBed.configureTestingModule({
      imports: [SectionsComponent, HttpClientTestingModule],
      providers: [
        { provide: StorageService, useValue: storageServiceMock },
        { provide: MessageService, useValue: messageServiceMock },
        { provide: Router, useValue: routerMock },
        { provide: SectionService, useValue: sectionServiceMock }
      ],
      schemas: [NO_ERRORS_SCHEMA] // To ignore child components
    }).compileComponents();

    fixture = TestBed.createComponent(SectionsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load sections on init', async () => {
    // Already called in beforeEach
    expect(storageServiceMock.db.sections.toArray).toHaveBeenCalled();
    expect(component.sections()).toEqual(mockSections);
  });

  it('should toggle 3D modal', () => {
    expect(component.threeDModalOpen()).toBeFalsy();

    component.openThreeDModal();
    expect(component.threeDModalOpen()).toBeTruthy();

    component.closeThreeDModal();
    expect(component.threeDModalOpen()).toBeFalsy();
  });

  it('should set search modal state', () => {
    component.isSearchSectionModalOpen = false;
    component.search();
    expect(component.isSearchSectionModalOpen).toBeTruthy();

    component.setIsSearchSectionModalOpen(false);
    expect(component.isSearchSectionModalOpen).toBeFalsy();
  });

  it('should open study dialog', () => {
    expect(component.studyDialogOpen()).toBeFalsy();

    component.createStudy();
    expect(component.studyDialogOpen()).toBeTruthy();
  });

  // it('should create a new study and navigate to it', async () => {
  //   // Setup
  //   component.study = {
  //     title: 'Test Study',
  //     description: 'Test Description',
  //     shareable: true,
  //     uuid: '',
  //     author_email: '',
  //     created_at_offline: '',
  //     updated_at_offline: '',
  //     saved: false,
  //     section_uuid: 'section-1'
  //   };

  //   await component.saveStudy();

  //   // Verify study creation
  //   expect(storageServiceMock.db.studies.add).toHaveBeenCalledWith(
  //     expect.objectContaining({
  //       title: 'Test Study',
  //       description: 'Test Description',
  //       uuid: 'test-uuid-1234',
  //       author_email: 'test@example.com',
  //       saved: false
  //     })
  //   );

  //   // Verify success message
  //   expect(messageServiceMock.add).toHaveBeenCalledWith(
  //     expect.objectContaining({
  //       severity: 'success'
  //     })
  //   );

  //   // Verify navigation
  //   expect(routerMock.navigate).toHaveBeenCalledWith([
  //     '/study',
  //     'test-uuid-1234'
  //   ]);

  //   // Dialog should be closed
  //   expect(component.studyDialogOpen()).toBeFalsy();
  // });

  it('should not save study when title is empty', async () => {
    component.study = {
      title: '',
      description: 'Test Description',
      shareable: false,
      uuid: '',
      author_email: '',
      created_at_offline: '',
      updated_at_offline: '',
      saved: false,
      section_uuid: ''
    };
    component.submitted = false;

    await component.saveStudy();

    expect(component.submitted).toBeTruthy();
    expect(storageServiceMock.db.studies.add).not.toHaveBeenCalled();
  });

  // it('should correctly identify sections', () => {
  //   const section = mockSections[0];
  //   expect(component.identity(section)).toBe(section);
  // });

  it('should duplicate section', () => {
    const section = mockSections[0];
    component.duplicate(section);
    expect(storageServiceMock.db.sections.add).toHaveBeenCalledWith(section);
  });

  it('should handle section save', () => {
    const sectionData = { name: 'New Section', type: 'Type A' };
    jest.spyOn(console, 'log').mockImplementation();

    component.onSaveSection(sectionData);

    expect(console.log).toHaveBeenCalledWith('Section saved:', sectionData);
  });

  it('should handle section cancel', () => {
    jest.spyOn(console, 'log').mockImplementation();

    component.onCancelSection();

    expect(console.log).toHaveBeenCalledWith('Section creation cancelled');
  });

  it('should open create section dialog', () => {
    // Mock the child component
    component.createSectionDialog = {
      show: jest.fn()
    } as unknown as CreateSectionComponent;

    component.openCreateSectionDialog();

    expect(component.createSectionDialog.show).toHaveBeenCalled();
  });

  it('should load data from file', async () => {
    // Mock the file reader
    const mockFile = new File(['{"mockData": true}'], 'test.json', {
      type: 'application/json'
    });
    const mockFileList = { 0: mockFile, length: 1 } as unknown as FileList;

    // Mock createElement and FileReader
    global.URL.createObjectURL = jest.fn();
    const originalCreateElement = document.createElement;
    const mockInputElement = {
      type: '',
      click: jest.fn(),
      files: mockFileList,
      onchange: jest.fn(),
      dispatchEvent: jest.fn()
    };

    document.createElement = jest.fn().mockImplementation((tagName) => {
      if (tagName === 'input') {
        return mockInputElement;
      }
      return originalCreateElement.call(document, tagName);
    });

    // Mock FileReader
    const mockFileReader = {
      readAsText: jest.fn(),
      onload: jest.fn()
    };
    global.FileReader = jest.fn(() => mockFileReader) as any;

    // Call the method
    component.loadFromFile();

    // Verify input created and clicked
    expect(document.createElement).toHaveBeenCalledWith('input');
    expect(mockInputElement.type).toBe('file');
    expect(mockInputElement.click).toHaveBeenCalled();

    // Simulate file selection
    const event = { target: { files: mockFileList } };
    mockInputElement.onchange?.(event as any);

    // Verify FileReader used
    expect(mockFileReader.readAsText).toHaveBeenCalledWith(mockFile);

    // Simulate file load
    const loadEvent = { target: { result: '{"mockData": true}' } };
    mockFileReader.onload?.(loadEvent as any);

    // Verify data processing
    expect(storageServiceMock.db.loadMockDataFromJson).toHaveBeenCalledWith({
      mockData: true
    });
    expect(storageServiceMock.db.sections.toArray).toHaveBeenCalled();

    // Restore mocks
    document.createElement = originalCreateElement;
  });
});
