/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SearchSectionModalComponent } from './search-section-modal.component';
import { of } from 'rxjs';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { SectionService } from '@src/app/core/services/section/section.service';
import { SectionModel } from '@src/app/core/data/models/section.model';

describe('SearchSectionModalComponent', () => {
  let component: SearchSectionModalComponent;
  let fixture: ComponentFixture<SearchSectionModalComponent>;
  let sectionServiceMock: jest.Mocked<SectionService>;

  const mockSections: SectionModel[] = [
    {
      title: 'Test Section 1',
      description: 'Description 1',
      uuid: 'uuid-1',
      author_email: 'test1@example.com',
      created_at_offline: '2025-01-01T10:00:00Z',
      updated_at_offline: '2025-01-02T10:00:00Z'
    },
    {
      title: 'Test Section 2',
      description: 'Description 2',
      uuid: 'uuid-2',
      author_email: 'test2@example.com',
      created_at_offline: '2025-01-03T10:00:00Z',
      updated_at_offline: '2025-01-04T10:00:00Z'
    }
  ];

  beforeEach(async () => {
    sectionServiceMock = {
      searchSections: jest.fn().mockReturnValue(of(mockSections))
    } as unknown as jest.Mocked<SectionService>;

    await TestBed.configureTestingModule({
      imports: [SearchSectionModalComponent, NoopAnimationsModule],
      providers: [{ provide: SectionService, useValue: sectionServiceMock }]
    }).compileComponents();

    fixture = TestBed.createComponent(SearchSectionModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with default values', () => {
    expect(component.isOpen).toBeUndefined();
    expect(component.isLoading).toBeFalsy();
    expect(component.sections).toEqual([]);
    expect(component.selectedSections).toEqual([]);
    expect(component.sectionToSearch).toEqual({
      title: '',
      description: '',
      uuid: '',
      author_email: '',
      created_at_offline: '',
      updated_at_offline: ''
    });
  });

  it('should reset fields when resetFields is called', () => {
    // Arrange
    component.sectionToSearch = {
      title: 'Test Title',
      description: 'Test Description',
      uuid: 'test-uuid',
      author_email: 'test@example.com',
      created_at_offline: '2025-01-01',
      updated_at_offline: '2025-01-02'
    };

    // Act
    component.resetFields();

    // Assert
    expect(component.sectionToSearch).toEqual({
      title: '',
      description: '',
      uuid: '',
      author_email: '',
      created_at_offline: '',
      updated_at_offline: ''
    });
  });

  it('should search sections when searchStudies is called', async () => {
    // Act
    component.searchStudies();

    // Assert
    expect(sectionServiceMock.searchSections).toHaveBeenCalledWith(
      component.sectionToSearch
    );

    // Wait for observable to complete
    fixture.detectChanges();

    expect(component.sections).toEqual(mockSections);
  });

  it('should close modal when closeModal is called', () => {
    // Arrange
    const emitSpy = jest.spyOn(component.isOpenChange, 'emit');
    component.isOpen = true;

    // Act
    component.closeModal();

    // Assert
    expect(component.isOpen).toBeFalsy();
    expect(emitSpy).toHaveBeenCalledWith(false);
  });

  it('should emit isOpenChange event when modal is closed', () => {
    // Arrange
    const emitSpy = jest.spyOn(component.isOpenChange, 'emit');
    component.isOpen = true;

    // Act
    component.closeModal();

    // Assert
    expect(emitSpy).toHaveBeenCalledWith(false);
  });
});
