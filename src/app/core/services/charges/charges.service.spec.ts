/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { TestBed } from '@angular/core/testing';
import { ChargesService } from './charges.service';
import { StudiesService } from '../studies/studies.service';
import { MessageService } from 'primeng/api';
import { Charge } from '../../data/database/interfaces/charge';
import { Section } from '../../data/database/interfaces/section';
import { Study } from '../../data/database/interfaces/study';

// Mock uuid
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid-123')
}));

// Mock findDuplicateTitle
jest.mock('@src/app/ui/shared/helpers/duplicate', () => ({
  findDuplicateTitle: jest.fn((titles, title) => `${title} (Copy 1)`)
}));

const mockChargeData: Charge = {
  uuid: 'charge-uuid-1',
  name: 'Charge 1',
  personnelPresence: true,
  description: 'Test charge description',
  data: {
    climate: {
      windPressure: 0,
      cableTemperature: 15,
      symmetryType: 'symmetric',
      iceThickness: 0,
      frontierSupportNumber: null,
      iceThicknessBefore: null,
      iceThicknessAfter: null
    }
  }
};

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
  initial_conditions: [],
  selected_initial_condition_uuid: undefined,
  charges: [mockChargeData],
  selected_charge_uuid: 'charge-uuid-1'
};

describe('ChargesService', () => {
  let service: ChargesService;
  let mockStudiesService: jest.Mocked<StudiesService>;
  let mockMessageService: jest.Mocked<MessageService>;

  const mockCharge: Charge = {
    ...mockChargeData,
    uuid: 'charge-uuid-1',
    name: 'Charge 1'
  };

  const mockSection: Section = {
    ...mockSectionData,
    uuid: 'section-uuid-1',
    charges: [mockCharge]
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
      getStudy: jest.fn().mockResolvedValue(mockStudy),
      updateStudy: jest.fn().mockResolvedValue(undefined)
    } as unknown as jest.Mocked<StudiesService>;

    mockMessageService = {
      add: jest.fn()
    } as unknown as jest.Mocked<MessageService>;

    TestBed.configureTestingModule({
      providers: [
        ChargesService,
        { provide: StudiesService, useValue: mockStudiesService },
        { provide: MessageService, useValue: mockMessageService }
      ]
    });

    service = TestBed.inject(ChargesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('createOrUpdateCharge', () => {
    it('should create a new charge when it does not exist', async () => {
      const newCharge: Charge = {
        uuid: 'new-charge-uuid',
        name: 'New Charge',
        personnelPresence: false,
        description: 'New charge description',
        data: {
          climate: {
            windPressure: 0,
            cableTemperature: 15,
            symmetryType: 'symmetric',
            iceThickness: 0,
            frontierSupportNumber: null,
            iceThicknessBefore: null,
            iceThicknessAfter: null
          }
        }
      };

      const studyWithoutNewCharge: Study = {
        ...mockStudy,
        sections: [
          {
            ...mockSection,
            charges: [mockCharge]
          }
        ]
      };

      mockStudiesService.getStudy.mockResolvedValue(studyWithoutNewCharge);

      await service.createOrUpdateCharge(
        'study-uuid-1',
        'section-uuid-1',
        newCharge
      );

      expect(mockStudiesService.updateStudy).toHaveBeenCalledWith(
        expect.objectContaining({
          sections: expect.arrayContaining([
            expect.objectContaining({
              uuid: 'section-uuid-1',
              charges: expect.arrayContaining([newCharge, mockCharge]),
              selected_charge_uuid: 'new-charge-uuid'
            })
          ])
        })
      );

      expect(mockMessageService.add).toHaveBeenCalledWith({
        severity: 'success',
        summary: expect.any(String),
        detail: expect.any(String),
        life: 500
      });
    });

    it('should update an existing charge', async () => {
      const updatedCharge: Charge = {
        ...mockCharge,
        name: 'Updated Charge Name',
        description: 'Updated description'
      };

      await service.createOrUpdateCharge(
        'study-uuid-1',
        'section-uuid-1',
        updatedCharge
      );

      expect(mockStudiesService.updateStudy).toHaveBeenCalledWith(
        expect.objectContaining({
          sections: expect.arrayContaining([
            expect.objectContaining({
              uuid: 'section-uuid-1',
              charges: expect.arrayContaining([
                expect.objectContaining({
                  uuid: 'charge-uuid-1',
                  name: 'Updated Charge Name',
                  description: 'Updated description'
                })
              ]),
              selected_charge_uuid: 'charge-uuid-1'
            })
          ])
        })
      );

      expect(mockMessageService.add).toHaveBeenCalledWith({
        severity: 'success',
        summary: expect.any(String),
        detail: expect.any(String),
        life: 500
      });
    });

    it('should throw an error when study is not found', async () => {
      mockStudiesService.getStudy.mockResolvedValue(undefined);

      await expect(
        service.createOrUpdateCharge(
          'non-existent-study',
          'section-uuid-1',
          mockCharge
        )
      ).rejects.toThrow('Study with uuid non-existent-study not found');
    });

    it('should throw an error when section is not found', async () => {
      const studyWithoutSection: Study = {
        ...mockStudy,
        sections: []
      };

      mockStudiesService.getStudy.mockResolvedValue(studyWithoutSection);

      await expect(
        service.createOrUpdateCharge(
          'study-uuid-1',
          'non-existent-section',
          mockCharge
        )
      ).rejects.toThrow('Section with uuid non-existent-section not found');
    });
  });

  describe('deleteCharge', () => {
    it('should delete a charge from the section', async () => {
      await service.deleteCharge(
        'study-uuid-1',
        'section-uuid-1',
        'charge-uuid-1'
      );

      expect(mockStudiesService.updateStudy).toHaveBeenCalledWith(
        expect.objectContaining({
          sections: expect.arrayContaining([
            expect.objectContaining({
              uuid: 'section-uuid-1',
              charges: []
            })
          ])
        })
      );

      expect(mockMessageService.add).toHaveBeenCalledWith({
        severity: 'success',
        summary: expect.any(String),
        detail: expect.any(String),
        life: 500
      });
    });

    it('should set selected_charge_uuid to the first remaining charge when deleting selected charge', async () => {
      const secondCharge: Charge = {
        uuid: 'charge-uuid-2',
        name: 'Charge 2',
        personnelPresence: false,
        description: 'Second charge',
        data: {
          climate: {
            windPressure: 0,
            cableTemperature: 15,
            symmetryType: 'symmetric',
            iceThickness: 0,
            frontierSupportNumber: null,
            iceThicknessBefore: null,
            iceThicknessAfter: null
          }
        }
      };

      const studyWithMultipleCharges: Study = {
        ...mockStudy,
        sections: [
          {
            ...mockSection,
            charges: [mockCharge, secondCharge],
            selected_charge_uuid: 'charge-uuid-1'
          }
        ]
      };

      mockStudiesService.getStudy.mockResolvedValue(studyWithMultipleCharges);

      await service.deleteCharge(
        'study-uuid-1',
        'section-uuid-1',
        'charge-uuid-1'
      );

      expect(mockStudiesService.updateStudy).toHaveBeenCalledWith(
        expect.objectContaining({
          sections: expect.arrayContaining([
            expect.objectContaining({
              uuid: 'section-uuid-1',
              charges: [secondCharge],
              selected_charge_uuid: 'charge-uuid-2'
            })
          ])
        })
      );
    });

    it('should set selected_charge_uuid to null when deleting the last charge', async () => {
      await service.deleteCharge(
        'study-uuid-1',
        'section-uuid-1',
        'charge-uuid-1'
      );

      expect(mockStudiesService.updateStudy).toHaveBeenCalledWith(
        expect.objectContaining({
          sections: expect.arrayContaining([
            expect.objectContaining({
              uuid: 'section-uuid-1',
              charges: [],
              selected_charge_uuid: null
            })
          ])
        })
      );
    });

    it('should throw an error when study is not found', async () => {
      mockStudiesService.getStudy.mockResolvedValue(undefined);

      await expect(
        service.deleteCharge(
          'non-existent-study',
          'section-uuid-1',
          'charge-uuid-1'
        )
      ).rejects.toThrow('Study with uuid non-existent-study not found');
    });

    it('should throw an error when section is not found', async () => {
      const studyWithoutSection: Study = {
        ...mockStudy,
        sections: []
      };

      mockStudiesService.getStudy.mockResolvedValue(studyWithoutSection);

      await expect(
        service.deleteCharge(
          'study-uuid-1',
          'non-existent-section',
          'charge-uuid-1'
        )
      ).rejects.toThrow('Section with uuid non-existent-section not found');
    });
  });

  describe('duplicateCharge', () => {
    it('should duplicate a charge with a new UUID', async () => {
      const freshStudy: Study = {
        ...mockStudy,
        sections: [
          {
            ...mockSection,
            charges: [mockCharge]
          }
        ]
      };

      mockStudiesService.getStudy.mockResolvedValue(freshStudy);

      const result = await service.duplicateCharge(
        'study-uuid-1',
        'section-uuid-1',
        'charge-uuid-1'
      );

      expect(result.uuid).toBe('mock-uuid-123');
      expect(result.name).toBe('Charge 1 (Copy 1)');
      expect(result.personnelPresence).toBe(mockCharge.personnelPresence);
      expect(result.description).toBe(mockCharge.description);

      expect(mockStudiesService.updateStudy).toHaveBeenCalledWith(
        expect.objectContaining({
          sections: expect.arrayContaining([
            expect.objectContaining({
              uuid: 'section-uuid-1',
              charges: expect.arrayContaining([
                expect.objectContaining({
                  uuid: 'mock-uuid-123',
                  name: 'Charge 1 (Copy 1)'
                }),
                mockCharge
              ]),
              selected_charge_uuid: 'mock-uuid-123'
            })
          ])
        })
      );
    });

    it('should throw an error when study is not found', async () => {
      mockStudiesService.getStudy.mockResolvedValue(undefined);

      await expect(
        service.duplicateCharge(
          'non-existent-study',
          'section-uuid-1',
          'charge-uuid-1'
        )
      ).rejects.toThrow('Study with uuid non-existent-study not found');
    });

    it('should throw an error when section is not found', async () => {
      const studyWithoutSection: Study = {
        ...mockStudy,
        sections: []
      };

      mockStudiesService.getStudy.mockResolvedValue(studyWithoutSection);

      await expect(
        service.duplicateCharge(
          'study-uuid-1',
          'non-existent-section',
          'charge-uuid-1'
        )
      ).rejects.toThrow('Section with uuid non-existent-section not found');
    });

    it('should throw an error when charge is not found', async () => {
      const studyWithoutCharge: Study = {
        ...mockStudy,
        sections: [
          {
            ...mockSection,
            charges: []
          }
        ]
      };

      mockStudiesService.getStudy.mockResolvedValue(studyWithoutCharge);

      await expect(
        service.duplicateCharge(
          'study-uuid-1',
          'section-uuid-1',
          'non-existent-charge'
        )
      ).rejects.toThrow('Charge with uuid non-existent-charge not found');
    });
  });

  describe('setSelectedCharge', () => {
    it('should set the selected charge uuid', async () => {
      await service.setSelectedCharge(
        'study-uuid-1',
        'section-uuid-1',
        'charge-uuid-1'
      );

      expect(mockStudiesService.updateStudy).toHaveBeenCalledWith(
        expect.objectContaining({
          sections: expect.arrayContaining([
            expect.objectContaining({
              uuid: 'section-uuid-1',
              selected_charge_uuid: 'charge-uuid-1'
            })
          ])
        }),
        true
      );
    });

    it('should throw an error when study is not found', async () => {
      mockStudiesService.getStudy.mockResolvedValue(undefined);

      await expect(
        service.setSelectedCharge(
          'non-existent-study',
          'section-uuid-1',
          'charge-uuid-1'
        )
      ).rejects.toThrow('Study with uuid non-existent-study not found');
    });

    it('should throw an error when section is not found', async () => {
      const studyWithoutSection: Study = {
        ...mockStudy,
        sections: []
      };

      mockStudiesService.getStudy.mockResolvedValue(studyWithoutSection);

      await expect(
        service.setSelectedCharge(
          'study-uuid-1',
          'non-existent-section',
          'charge-uuid-1'
        )
      ).rejects.toThrow('Section with uuid non-existent-section not found');
    });
  });

  describe('getCharge', () => {
    it('should return a charge when it exists', async () => {
      const freshStudy: Study = {
        ...mockStudy,
        sections: [
          {
            ...mockSection,
            charges: [mockCharge]
          }
        ]
      };

      mockStudiesService.getStudy.mockResolvedValue(freshStudy);

      const result = await service.getCharge(
        'study-uuid-1',
        'section-uuid-1',
        'charge-uuid-1'
      );

      expect(result).toEqual(mockCharge);
    });

    it('should return null when charge does not exist', async () => {
      const studyWithoutCharge: Study = {
        ...mockStudy,
        sections: [
          {
            ...mockSection,
            charges: []
          }
        ]
      };

      mockStudiesService.getStudy.mockResolvedValue(studyWithoutCharge);

      const result = await service.getCharge(
        'study-uuid-1',
        'section-uuid-1',
        'non-existent-charge'
      );

      expect(result).toBeNull();
    });

    it('should throw an error when study is not found', async () => {
      mockStudiesService.getStudy.mockResolvedValue(undefined);

      await expect(
        service.getCharge(
          'non-existent-study',
          'section-uuid-1',
          'charge-uuid-1'
        )
      ).rejects.toThrow('Study with uuid non-existent-study not found');
    });

    it('should throw an error when section is not found', async () => {
      const studyWithoutSection: Study = {
        ...mockStudy,
        sections: []
      };

      mockStudiesService.getStudy.mockResolvedValue(studyWithoutSection);

      await expect(
        service.getCharge(
          'study-uuid-1',
          'non-existent-section',
          'charge-uuid-1'
        )
      ).rejects.toThrow('Section with uuid non-existent-section not found');
    });
  });
});
