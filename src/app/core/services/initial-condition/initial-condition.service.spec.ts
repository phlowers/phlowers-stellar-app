/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { TestBed } from '@angular/core/testing';
import { InitialConditionService } from './initial-condition.service';
import { StudiesService } from '@services/studies/studies.service';
import { Section, InitialCondition } from '@shared/domain';
import { StudyEntity } from '@infrastructure/database';

// Mock uuid
vi.mock('uuid', () => ({
  v4: vi.fn(() => 'mock-uuid-123')
}));

// Mock findDuplicateTitle
vi.mock('@shared/helpers/duplicate', () => ({
  findDuplicateTitle: vi.fn((titles, title) => `${title} (Copy 1)`)
}));

describe('InitialConditionService', () => {
  let service: InitialConditionService;
  let mockStudiesService: vi.Mocked<StudiesService>;

  const mockInitialCondition: InitialCondition = {
    uuid: 'ic-uuid-1',
    name: 'Initial Condition 1',
    base_parameters: 0,
    base_temperature: 15,
    cable_pretension: 0,
    min_temperature: 0,
    max_wind_pressure: 10,
    max_frost_width: 0
  };

  const mockSection: Section = {
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
    initial_conditions: [mockInitialCondition],
    selected_initial_condition_uuid: 'ic-uuid-1',
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
    start_azimuth: null
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
      updateStudy: vi.fn().mockResolvedValue(undefined),
      getStudy: vi.fn().mockResolvedValue(mockStudy)
    } as unknown as vi.Mocked<StudiesService>;

    TestBed.configureTestingModule({
      providers: [InitialConditionService, { provide: StudiesService, useValue: mockStudiesService }]
    });

    service = TestBed.inject(InitialConditionService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('updateInitialCondition', () => {
    it('should update an initial condition in a section', async () => {
      const updatedIC: InitialCondition = {
        ...mockInitialCondition,
        base_temperature: 20
      };

      await service.updateInitialCondition(mockStudy, mockSection, updatedIC);

      expect(mockStudiesService.updateStudy).toHaveBeenCalledWith(
        expect.objectContaining({
          sections: expect.arrayContaining([
            expect.objectContaining({
              uuid: mockSection.uuid,
              initial_conditions: expect.arrayContaining([updatedIC])
            })
          ])
        }),
        false
      );
    });
  });

  describe('addInitialCondition', () => {
    it('should add an initial condition to a section', async () => {
      const newIC: InitialCondition = {
        uuid: 'ic-uuid-2',
        name: 'Initial Condition 2',
        base_parameters: 0,
        base_temperature: 25,
        cable_pretension: 0,
        min_temperature: 0,
        max_wind_pressure: 15,
        max_frost_width: 5
      };

      await service.addInitialCondition(mockStudy, mockSection, newIC);

      expect(mockStudiesService.updateStudy).toHaveBeenCalledWith(
        expect.objectContaining({
          sections: expect.arrayContaining([
            expect.objectContaining({
              uuid: mockSection.uuid,
              initial_conditions: expect.arrayContaining([mockInitialCondition, newIC])
            })
          ])
        }),
        false
      );
    });
  });

  describe('deleteInitialCondition', () => {
    it('should delete an initial condition from a section', async () => {
      await service.deleteInitialCondition(mockStudy, mockSection, mockInitialCondition);

      expect(mockStudiesService.updateStudy).toHaveBeenCalledWith(
        expect.objectContaining({
          sections: expect.arrayContaining([
            expect.objectContaining({
              uuid: mockSection.uuid,
              initial_conditions: []
            })
          ])
        }),
        false
      );
    });
  });

  describe('duplicateInitialCondition', () => {
    it('should duplicate an initial condition with a new UUID', async () => {
      const newUuid = 'new-ic-uuid';
      const duplicatedIc: InitialCondition = {
        ...mockInitialCondition,
        uuid: newUuid,
        name: 'Initial Condition 1 (Copy 1)'
      };

      const result = await service.duplicateInitialCondition(mockStudy, mockSection, duplicatedIc, newUuid);

      expect(result).toBe(newUuid);
      expect(mockStudiesService.updateStudy).toHaveBeenCalledWith(
        expect.objectContaining({
          sections: expect.arrayContaining([
            expect.objectContaining({
              uuid: mockSection.uuid,
              initial_conditions: expect.arrayContaining([
                mockInitialCondition,
                expect.objectContaining({
                  uuid: newUuid,
                  name: 'Initial Condition 1 (Copy 1)'
                })
              ])
            })
          ])
        }),
        false
      );
    });
  });

  describe('setInitialCondition', () => {
    it('should set the selected initial condition UUID for a section', async () => {
      const newSelectedUuid = 'ic-uuid-new';

      await service.setInitialCondition(mockStudy, mockSection, newSelectedUuid);

      expect(mockStudiesService.updateStudy).toHaveBeenCalledWith(
        expect.objectContaining({
          sections: expect.arrayContaining([
            expect.objectContaining({
              uuid: mockSection.uuid,
              selected_initial_condition_uuid: newSelectedUuid
            })
          ])
        }),
        true
      );
    });
  });

  describe('getInitialCondition', () => {
    it('should retrieve an initial condition by study, section, and IC UUIDs', async () => {
      const result = await service.getInitialCondition('study-uuid-1', 'section-uuid-1', 'ic-uuid-1');

      expect(mockStudiesService.getStudy).toHaveBeenCalledWith('study-uuid-1');
      expect(result).toEqual(mockInitialCondition);
    });
  });

  describe('clone isolation', () => {
    it('should not mutate original study when updating initial condition', async () => {
      const originalSections = JSON.stringify(mockStudy.sections);
      const updatedIC: InitialCondition = {
        ...mockInitialCondition,
        base_temperature: 99
      };

      await service.updateInitialCondition(mockStudy, mockSection, updatedIC);

      expect(JSON.stringify(mockStudy.sections)).toBe(originalSections);
    });

    it('should not mutate original study when deleting initial condition', async () => {
      const originalSections = JSON.stringify(mockStudy.sections);

      await service.deleteInitialCondition(mockStudy, mockSection, mockInitialCondition);

      expect(JSON.stringify(mockStudy.sections)).toBe(originalSections);
    });

    it('should not mutate original study when duplicating initial condition', async () => {
      const originalSections = JSON.stringify(mockStudy.sections);

      await service.duplicateInitialCondition(mockStudy, mockSection, mockInitialCondition, 'dup-uuid');

      expect(JSON.stringify(mockStudy.sections)).toBe(originalSections);
    });
  });

  describe('deleteInitialCondition - selected IC', () => {
    it('should clear selected_initial_condition_uuid when deleting the selected IC', async () => {
      await service.deleteInitialCondition(mockStudy, mockSection, mockInitialCondition);

      const calledStudy = mockStudiesService.updateStudy.mock.calls[0][0];
      const updatedSection = calledStudy.sections.find((s: Section) => s.uuid === mockSection.uuid);
      expect(updatedSection?.selected_initial_condition_uuid).toBeUndefined();
    });

    it('should preserve selected_initial_condition_uuid when deleting a non-selected IC', async () => {
      const otherIC: InitialCondition = {
        ...mockInitialCondition,
        uuid: 'other-ic-uuid',
        name: 'Other IC'
      };
      const sectionWithMultipleICs: Section = {
        ...mockSection,
        initial_conditions: [mockInitialCondition, otherIC],
        selected_initial_condition_uuid: 'ic-uuid-1'
      };
      const studyWithMultipleICs: StudyEntity = {
        ...mockStudy,
        sections: [sectionWithMultipleICs]
      };

      await service.deleteInitialCondition(studyWithMultipleICs, sectionWithMultipleICs, otherIC);

      const calledStudy = mockStudiesService.updateStudy.mock.calls[0][0];
      const updatedSection = calledStudy.sections.find((s: Section) => s.uuid === sectionWithMultipleICs.uuid);
      expect(updatedSection?.selected_initial_condition_uuid).toBe('ic-uuid-1');
    });
  });
});
