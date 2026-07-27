/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { TestBed } from '@angular/core/testing';
import { SectionService } from './section.service';
import { StudiesService } from '@services/studies/studies.service';
import { Section } from '@shared/domain';
import { StudyEntity } from '@infrastructure/database';

import { TranslocoTestingModule } from '@jsverse/transloco';
// Mock uuid
vi.mock('uuid', () => ({
  v4: vi.fn(() => 'mock-uuid-123')
}));

// Mock findDuplicateTitle
vi.mock('@shared/helpers/duplicate', () => ({
  findDuplicateTitle: vi.fn((titles, title) => `${title} (Copy 1)`)
}));

const mockSectionData: Section = {
  uuid: 'section-uuid-1',
  internal_id: 'INT-001',
  name: 'Section 1',
  short_name: 'S1',
  created_at: '2025-01-01T00:00:00.000Z',
  updated_at: '2025-01-01T00:00:00.000Z',
  internal_catalog_id: 'CAT-001',
  type: 'phase',
  electric_phase_number: 1,
  cable_name: 'Test Cable',
  cable_short_name: 'TC',
  cables_amount: 3,
  optical_fibers_amount: 12,
  spans_amount: 5,
  begin_span_name: 'Span 1',
  last_span_name: 'Span 5',
  first_support_number: 1,
  last_support_number: 6,
  first_attachment_set: 'Set 1',
  last_attachment_set: 'Set 2',
  regional_maintenance_center_names: ['Center 1'],
  maintenance_center_names: ['Maintenance 1'],
  regional_team_id: 'GMR-001',
  maintenance_team_id: 'EEL-001',
  maintenance_center_id: 'CM-001',
  link_name: 'Link 1',
  lit_code: 'LIT-001',
  lit_name: 'LIT-001',
  branch_name: 'Branch 1',
  branch_idr: 'Branch 1',
  voltage_idr: '400kV',
  comment: 'Test comment',
  supports_comment: 'Test supports comment',
  supports: [],
  obstacles: [],
  initial_conditions: [],
  selected_initial_condition_uuid: undefined,
  charges: [],
  selected_charge_uuid: null,
  field_measures: [],
  selected_field_measure_uuid: undefined,
  vtl_and_guying: undefined,
  cable_modifications: [],
  selected_cable_modification_uuid: null,
  cable_span_manipulations: [],
  selected_cable_span_manipulation_uuid: null,
  start_latitude: null,
  start_longitude: null,
  start_azimuth: null,
  mean_reprojection_diff_meters: null
};

describe('SectionService', () => {
  let service: SectionService;
  let mockStudiesService: vi.Mocked<StudiesService>;

  const mockSection: Section = {
    ...mockSectionData,
    uuid: 'section-uuid-1',
    internal_id: 'INT-001',
    name: 'Section 1',
    short_name: 'S1'
  };

  const mockStudy: StudyEntity = {
    uuid: 'study-uuid-1',
    title: 'Test Study',
    description: 'Test Description',
    author_email: 'test@example.com',
    sections: [mockSection],
    shareable: true,
    saved: true,
    created_at_offline: '2025-01-01T00:00:00.000Z',
    updated_at_offline: '2025-01-01T00:00:00.000Z'
  };

  beforeEach(() => {
    mockStudiesService = {
      updateStudy: vi.fn().mockResolvedValue(undefined)
    } as unknown as vi.Mocked<StudiesService>;

    TestBed.configureTestingModule({
      imports: [TranslocoTestingModule.forRoot({
          langs: { en: {} },
          translocoConfig: { availableLangs: ['en'], defaultLang: 'en' },
          preloadLangs: true
        })],
      providers: [SectionService, { provide: StudiesService, useValue: mockStudiesService }]
    });

    service = TestBed.inject(SectionService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('createOrUpdateSection', () => {
    it('should create a new section when it does not exist', async () => {
      const beforeCall = new Date().toISOString();
      const newSection: Section = {
        uuid: 'new-section-uuid',
        internal_id: 'INT-002',
        short_name: 'S2',
        created_at: '2025-01-01T00:00:00.000Z',
        updated_at: '2025-01-01T00:00:00.000Z',
        internal_catalog_id: 'CAT-002',
        type: 'phase',
        electric_phase_number: 2,
        name: 'New Section',
        cable_name: 'Test Cable',
        cable_short_name: 'TC',
        cables_amount: 3,
        optical_fibers_amount: 12,
        spans_amount: 5,
        begin_span_name: 'Span 1',
        last_span_name: 'Span 5',
        first_support_number: 1,
        last_support_number: 6,
        first_attachment_set: 'Set 1',
        last_attachment_set: 'Set 2',
        regional_maintenance_center_names: ['Center 1'],
        maintenance_center_names: ['Maintenance 1'],
        regional_team_id: 'GMR-001',
        maintenance_team_id: 'EEL-001',
        maintenance_center_id: 'CM-001',
        link_name: 'Link 1',
        lit_code: 'LIT-001',
        lit_name: 'LIT-001',
        branch_name: 'Branch 1',
        branch_idr: 'Branch 1',
        voltage_idr: '400kV',
        comment: 'Test comment',
        supports_comment: 'Test supports comment',
        supports: [],
        obstacles: [],
        initial_conditions: [],
        selected_initial_condition_uuid: undefined,
        charges: [],
        selected_charge_uuid: null,
        field_measures: [],
        selected_field_measure_uuid: undefined,
        vtl_and_guying: undefined,
        cable_modifications: [],
        selected_cable_modification_uuid: null,
        cable_span_manipulations: [],
        selected_cable_span_manipulation_uuid: null,
        start_latitude: null,
        start_longitude: null,
        start_azimuth: null,
        mean_reprojection_diff_meters: null
      };
      const studyWithoutNewSection: StudyEntity = {
        ...mockStudy,
        sections: [mockSection]
      };

      await service.createOrUpdateSection(studyWithoutNewSection, newSection);

      const afterCall = new Date().toISOString();

      expect(mockStudiesService.updateStudy).toHaveBeenCalledWith(
        expect.objectContaining({
          sections: expect.arrayContaining([
            mockSection,
            expect.objectContaining({
              uuid: newSection.uuid,
              name: newSection.name
            })
          ])
        })
      );
      expect(newSection.created_at).toBe(newSection.updated_at);
      expect(newSection.created_at >= beforeCall).toBe(true);
      expect(newSection.created_at <= afterCall).toBe(true);
    });

    it('should update an existing section', async () => {
      const previousUpdatedAt = mockSection.updated_at;
      const updatedSection: Section = {
        ...mockSection,
        name: 'Updated Section Name'
      };

      await service.createOrUpdateSection(mockStudy, updatedSection);

      expect(mockStudiesService.updateStudy).toHaveBeenCalledWith(
        expect.objectContaining({
          sections: expect.arrayContaining([
            expect.objectContaining({
              uuid: mockSection.uuid,
              name: 'Updated Section Name'
            })
          ])
        })
      );
      expect(updatedSection.updated_at).not.toBe(previousUpdatedAt);
    });

    it('should not modify created_at when updating existing section', async () => {
      const updatedSection: Section = {
        ...mockSection,
        name: 'Updated Section Name',
        created_at: '2025-01-01T00:00:00.000Z'
      };

      await service.createOrUpdateSection(mockStudy, updatedSection);

      expect(mockStudiesService.updateStudy).toHaveBeenCalledWith(
        expect.objectContaining({
          sections: expect.arrayContaining([
            expect.objectContaining({
              uuid: mockSection.uuid,
              created_at: '2025-01-01T00:00:00.000Z'
            })
          ])
        })
      );
    });
  });

  describe('deleteSection', () => {
    it('should delete a section from the study', async () => {
      await service.deleteSection(mockStudy, mockSection);

      expect(mockStudiesService.updateStudy).toHaveBeenCalledWith(
        expect.objectContaining({
          sections: []
        })
      );
    });
  });

  describe('duplicateSection', () => {
    it('should duplicate a section with a new UUID', async () => {
      const freshStudy = {
        ...mockStudy,
        sections: [...mockStudy.sections]
      };
      const result = await service.duplicateSection(freshStudy, mockSection);

      expect(result.uuid).toBe('mock-uuid-123');
      expect(result.name).toBe('Section 1 (Copy 1)');
      expect(mockStudiesService.updateStudy).toHaveBeenCalled();
    });
  });
});
