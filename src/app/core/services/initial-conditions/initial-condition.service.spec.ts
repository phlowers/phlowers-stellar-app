/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { TestBed } from '@angular/core/testing';
import { InitialConditionService } from './initial-condition.service';
import { StudiesService } from '../studies/studies.service';
import { Section } from '../../data/database/interfaces/section';
import { Study } from '../../data/database/interfaces/study';
import { InitialCondition } from '../../data/database/interfaces/initialCondition';

// Mock uuid
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid-123')
}));

// Mock findDuplicateTitle
jest.mock('@src/app/ui/shared/helpers/duplicate', () => ({
  findDuplicateTitle: jest.fn((titles, title) => `${title} (Copy 1)`)
}));

describe('InitialConditionService', () => {
  let service: InitialConditionService;
  let mockStudiesService: jest.Mocked<StudiesService>;

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
    gmr: 'GMR-001',
    eel: 'EEL-001',
    cm: 'CM-001',
    link_name: 'Link 1',
    lit: 'LIT-001',
    branch_name: 'Branch 1',
    electric_tension_level: '400kV',
    comment: 'Test comment',
    supports_comment: 'Test supports comment',
    supports: [],
    initial_conditions: [mockInitialCondition],
    selected_initial_condition_uuid: 'ic-uuid-1',
    charges: [],
    selected_charge_uuid: null
  };

  const mockStudy: Study = {
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
      updateStudy: jest.fn().mockResolvedValue(undefined),
      getStudy: jest.fn().mockResolvedValue(mockStudy)
    } as unknown as jest.Mocked<StudiesService>;

    TestBed.configureTestingModule({
      providers: [
        InitialConditionService,
        { provide: StudiesService, useValue: mockStudiesService }
      ]
    });

    service = TestBed.inject(InitialConditionService);
  });

  afterEach(() => {
    jest.clearAllMocks();
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
        })
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
              initial_conditions: expect.arrayContaining([
                mockInitialCondition,
                newIC
              ])
            })
          ])
        })
      );
    });
  });

  describe('deleteInitialCondition', () => {
    it('should delete an initial condition from a section', async () => {
      await service.deleteInitialCondition(
        mockStudy,
        mockSection,
        mockInitialCondition
      );

      expect(mockStudiesService.updateStudy).toHaveBeenCalledWith(
        expect.objectContaining({
          sections: expect.arrayContaining([
            expect.objectContaining({
              uuid: mockSection.uuid,
              initial_conditions: []
            })
          ])
        })
      );
    });
  });

  describe('duplicateInitialCondition', () => {
    it('should duplicate an initial condition with a new UUID', async () => {
      const newUuid = 'new-ic-uuid';

      const result = await service.duplicateInitialCondition(
        mockStudy,
        mockSection,
        mockInitialCondition,
        newUuid
      );

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
        })
      );
    });
  });

  describe('setInitialCondition', () => {
    it('should set the selected initial condition UUID for a section', async () => {
      const newSelectedUuid = 'ic-uuid-new';

      await service.setInitialCondition(
        mockStudy,
        mockSection,
        newSelectedUuid
      );

      expect(mockStudiesService.updateStudy).toHaveBeenCalledWith(
        expect.objectContaining({
          sections: expect.arrayContaining([
            expect.objectContaining({
              uuid: mockSection.uuid,
              selected_initial_condition_uuid: newSelectedUuid
            })
          ])
        })
      );
    });
  });

  describe('getInitialCondition', () => {
    it('should retrieve an initial condition by study, section, and IC UUIDs', async () => {
      const result = await service.getInitialCondition(
        'study-uuid-1',
        'section-uuid-1',
        'ic-uuid-1'
      );

      expect(mockStudiesService.getStudy).toHaveBeenCalledWith('study-uuid-1');
      expect(result).toEqual(mockInitialCondition);
    });
  });
});
