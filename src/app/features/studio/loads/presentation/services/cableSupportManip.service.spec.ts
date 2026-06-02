/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { CableSupportManipService } from './cableSupportManip.service';
import { PlotService } from '@services/plot/plot.service';
import { PlotSpanService } from '@services/plot/plot-span.service';
import { StudiesService } from '@services/studies/studies.service';
import { Section } from '@shared/domain';
import { Study } from '@shared/domain/models/study.model';
import { StudyEntity } from '@infrastructure/database';

function createSignalMock<T>(initialValue: T) {
  let value = initialValue;
  const fn = vi.fn(() => value) as vi.Mock & { set: vi.Mock };
  fn.set = vi.fn((v: T) => {
    value = v;
  });
  return fn;
}

const mockSectionBase: Section = {
  uuid: 'section-uuid-1',
  internal_id: 'INT-001',
  name: 'Test Section',
  short_name: 'TS',
  created_at: '2025-01-01T00:00:00.000Z',
  updated_at: '2025-01-01T00:00:00.000Z',
  internal_catalog_id: 'CAT-001',
  type: 'phase',
  electric_phase_number: 1,
  cable_name: 'Test Cable',
  cable_short_name: 'TC',
  cables_amount: 1,
  optical_fibers_amount: 0,
  spans_amount: 1,
  begin_span_name: 'S1',
  last_span_name: 'S2',
  first_support_number: 1,
  last_support_number: 2,
  first_attachment_set: 'Set1',
  last_attachment_set: 'Set2',
  regional_maintenance_center_names: [],
  maintenance_center_names: [],
  regional_team_id: undefined,
  maintenance_team_id: undefined,
  maintenance_center_id: undefined,
  link_name: undefined,
  lit_code: undefined,
  lit_name: undefined,
  branch_name: undefined,
  branch_idr: undefined,
  voltage_idr: undefined,
  comment: undefined,
  supports_comment: undefined,
  supports: [{ uuid: 'support-uuid-1' } as Section['supports'][0]],
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
  cable_support_manipulations: [],
  selected_cable_support_manipulation_uuid: null,
  start_latitude: null,
  start_longitude: null,
  start_azimuth: null
};

const mockStudy: StudyEntity = {
  uuid: 'study-uuid-1',
  author_email: 'test@test.com',
  title: 'Test Study',
  description: '',
  shareable: false,
  created_at_offline: '2025-01-01T00:00:00.000Z',
  updated_at_offline: '2025-01-01T00:00:00.000Z',
  saved: true,
  sections: [mockSectionBase]
};

describe('CableSupportManipService', () => {
  let service: CableSupportManipService;
  let mockPlotService: vi.Mocked<PlotService>;
  let mockSpanService: vi.Mocked<PlotSpanService>;
  let mockStudiesService: vi.Mocked<StudiesService>;

  beforeEach(() => {
    mockPlotService = {
      study: createSignalMock<Study | null>({ uuid: 'study-uuid-1' } as Study)
    } as unknown as vi.Mocked<PlotService>;

    mockSpanService = {
      section: createSignalMock<Section | null>(mockSectionBase)
    } as unknown as vi.Mocked<PlotSpanService>;

    mockStudiesService = {
      getStudy: vi.fn().mockResolvedValue(mockStudy),
      updateStudy: vi.fn().mockResolvedValue(undefined)
    } as unknown as vi.Mocked<StudiesService>;

    TestBed.configureTestingModule({
      providers: [
        CableSupportManipService,
        { provide: PlotService, useValue: mockPlotService },
        { provide: PlotSpanService, useValue: mockSpanService },
        { provide: StudiesService, useValue: mockStudiesService }
      ]
    });

    service = TestBed.inject(CableSupportManipService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // ---------------------------------------------------------------------------
  // save()
  // ---------------------------------------------------------------------------
  describe('save()', () => {
    const newManip = {
      supportUuid: 'support-uuid-1',
      chargeUuid: 'charge-uuid-1',
      manip1: {
        type: 'shifting' as const,
        vertDisplacement: null,
        anchoring: null,
        lateralDistance: null,
        ropeLength: null,
        shiftingClampLength: 2
      },
      manip2: null
    };

    it('should return early when studyUuid is missing', async () => {
      mockPlotService.study.mockReturnValue(null);
      await service.save(newManip);
      expect(mockStudiesService.getStudy).not.toHaveBeenCalled();
    });

    it('should return early when sectionUuid is missing', async () => {
      mockSpanService.section.mockReturnValue(null);
      await service.save(newManip);
      expect(mockStudiesService.getStudy).not.toHaveBeenCalled();
    });

    it('should return early when study is not found', async () => {
      mockStudiesService.getStudy.mockResolvedValue(undefined);
      await service.save(newManip);
      expect(mockStudiesService.updateStudy).not.toHaveBeenCalled();
    });

    it('should return early when section is not found in study', async () => {
      mockStudiesService.getStudy.mockResolvedValue({ ...mockStudy, sections: [] });
      await service.save(newManip);
      expect(mockStudiesService.updateStudy).not.toHaveBeenCalled();
    });

    it('should add a new manipulation and call updateStudy', async () => {
      await service.save(newManip);

      expect(mockStudiesService.updateStudy).toHaveBeenCalled();
      const updated = mockStudiesService.updateStudy.mock.calls[0][0] as StudyEntity;
      const section = updated.sections.find((s) => s?.uuid === 'section-uuid-1');
      expect(section?.cable_support_manipulations).toHaveLength(1);
      expect(section?.cable_support_manipulations![0].supportUuid).toBe('support-uuid-1');
      expect(section?.cable_support_manipulations![0].chargeUuid).toBe('charge-uuid-1');
    });

    it('should assign a uuid to the new manipulation', async () => {
      await service.save(newManip);
      const updated = mockStudiesService.updateStudy.mock.calls[0][0] as StudyEntity;
      const section = updated.sections.find((s) => s?.uuid === 'section-uuid-1');
      expect(section?.cable_support_manipulations![0].uuid).toBeTruthy();
    });

    it('should set selected_cable_support_manipulation_uuid after save', async () => {
      await service.save(newManip);
      const updated = mockStudiesService.updateStudy.mock.calls[0][0] as StudyEntity;
      const section = updated.sections.find((s) => s?.uuid === 'section-uuid-1');
      expect(section?.selected_cable_support_manipulation_uuid).toBeTruthy();
    });

    it('should update an existing manipulation when (supportUuid, chargeUuid) pair already exists', async () => {
      const existingUuid = 'existing-manip-uuid';
      mockStudiesService.getStudy.mockResolvedValue({
        ...mockStudy,
        sections: [
          {
            ...mockSectionBase,
            cable_support_manipulations: [
              {
                uuid: existingUuid,
                supportUuid: 'support-uuid-1',
                chargeUuid: 'charge-uuid-1',
                manip1: {
                  type: 'crane' as const,
                  vertDisplacement: 5,
                  anchoring: 'without_chain' as const,
                  lateralDistance: 0,
                  ropeLength: null,
                  shiftingClampLength: null
                },
                manip2: null
              }
            ]
          }
        ]
      });

      await service.save({ ...newManip, manip1: { ...newManip.manip1, shiftingClampLength: 9 } });

      const updated = mockStudiesService.updateStudy.mock.calls[0][0] as StudyEntity;
      const section = updated.sections.find((s) => s?.uuid === 'section-uuid-1');
      expect(section?.cable_support_manipulations).toHaveLength(1);
      expect(section?.cable_support_manipulations![0].uuid).toBe(existingUuid);
      expect(section?.cable_support_manipulations![0].manip1.shiftingClampLength).toBe(9);
    });

    it('should keep each (supportUuid, chargeUuid) pair independent', async () => {
      const existingUuid = 'existing-uuid';
      mockStudiesService.getStudy.mockResolvedValue({
        ...mockStudy,
        sections: [
          {
            ...mockSectionBase,
            cable_support_manipulations: [
              {
                uuid: existingUuid,
                supportUuid: 'support-uuid-1',
                chargeUuid: 'charge-uuid-1',
                manip1: {
                  type: 'shifting' as const,
                  vertDisplacement: null,
                  anchoring: null,
                  lateralDistance: null,
                  ropeLength: null,
                  shiftingClampLength: 1
                },
                manip2: null
              }
            ]
          }
        ]
      });

      // Save for a different charge case — must not overwrite the existing one.
      await service.save({ ...newManip, chargeUuid: 'charge-uuid-2' });

      const updated = mockStudiesService.updateStudy.mock.calls[0][0] as StudyEntity;
      const section = updated.sections.find((s) => s?.uuid === 'section-uuid-1');
      expect(section?.cable_support_manipulations).toHaveLength(2);
    });

    it('should deduplicate legacy entries with the same (supportUuid, chargeUuid) pair', async () => {
      const firstUuid = 'first-duplicate-uuid';
      mockStudiesService.getStudy.mockResolvedValue({
        ...mockStudy,
        sections: [
          {
            ...mockSectionBase,
            cable_support_manipulations: [
              {
                uuid: firstUuid,
                supportUuid: 'support-uuid-1',
                chargeUuid: 'charge-uuid-1',
                manip1: {
                  type: 'shifting' as const,
                  vertDisplacement: null,
                  anchoring: null,
                  lateralDistance: null,
                  ropeLength: null,
                  shiftingClampLength: 1
                },
                manip2: null
              },
              {
                uuid: 'second-duplicate-uuid',
                supportUuid: 'support-uuid-1',
                chargeUuid: 'charge-uuid-1',
                manip1: {
                  type: 'shifting' as const,
                  vertDisplacement: null,
                  anchoring: null,
                  lateralDistance: null,
                  ropeLength: null,
                  shiftingClampLength: 2
                },
                manip2: null
              }
            ]
          }
        ]
      });

      await service.save({ ...newManip, manip1: { ...newManip.manip1, shiftingClampLength: 9 } });

      const updated = mockStudiesService.updateStudy.mock.calls[0][0] as StudyEntity;
      const section = updated.sections.find((s) => s?.uuid === 'section-uuid-1');
      expect(section?.cable_support_manipulations).toHaveLength(1);
      expect(section?.cable_support_manipulations![0].uuid).toBe(firstUuid);
      expect(section?.cable_support_manipulations![0].manip1.shiftingClampLength).toBe(9);
    });
  });

  // ---------------------------------------------------------------------------
  // delete()
  // ---------------------------------------------------------------------------
  describe('delete()', () => {
    it('should return early when studyUuid is missing', async () => {
      mockPlotService.study.mockReturnValue(null);
      await service.delete('some-uuid');
      expect(mockStudiesService.getStudy).not.toHaveBeenCalled();
    });

    it('should return early when sectionUuid is missing', async () => {
      mockSpanService.section.mockReturnValue(null);
      await service.delete('some-uuid');
      expect(mockStudiesService.getStudy).not.toHaveBeenCalled();
    });

    it('should return early when study is not found', async () => {
      mockStudiesService.getStudy.mockResolvedValue(undefined);
      await service.delete('some-uuid');
      expect(mockStudiesService.updateStudy).not.toHaveBeenCalled();
    });

    it('should return early when section is not found in study', async () => {
      mockStudiesService.getStudy.mockResolvedValue({ ...mockStudy, sections: [] });
      await service.delete('some-uuid');
      expect(mockStudiesService.updateStudy).not.toHaveBeenCalled();
    });

    it('should remove the manipulation from section and call updateStudy', async () => {
      const uuid = 'manip-to-delete';
      mockStudiesService.getStudy.mockResolvedValue({
        ...mockStudy,
        sections: [
          {
            ...mockSectionBase,
            cable_support_manipulations: [
              {
                uuid,
                supportUuid: 'support-uuid-1',
                chargeUuid: 'charge-uuid-1',
                manip1: {
                  type: 'shifting' as const,
                  vertDisplacement: null,
                  anchoring: null,
                  lateralDistance: null,
                  ropeLength: null,
                  shiftingClampLength: 1
                },
                manip2: null
              }
            ],
            selected_cable_support_manipulation_uuid: uuid
          }
        ]
      });

      await service.delete(uuid);

      expect(mockStudiesService.updateStudy).toHaveBeenCalled();
      const updated = mockStudiesService.updateStudy.mock.calls[0][0] as StudyEntity;
      const section = updated.sections.find((s) => s?.uuid === 'section-uuid-1');
      expect(section?.cable_support_manipulations).toHaveLength(0);
    });

    it('should clear the selection when the deleted uuid was selected', async () => {
      const uuid = 'manip-to-delete';
      mockStudiesService.getStudy.mockResolvedValue({
        ...mockStudy,
        sections: [
          {
            ...mockSectionBase,
            cable_support_manipulations: [
              {
                uuid,
                supportUuid: 'support-uuid-1',
                chargeUuid: 'charge-uuid-1',
                manip1: {
                  type: 'shifting' as const,
                  vertDisplacement: null,
                  anchoring: null,
                  lateralDistance: null,
                  ropeLength: null,
                  shiftingClampLength: 1
                },
                manip2: null
              }
            ],
            selected_cable_support_manipulation_uuid: uuid
          }
        ]
      });

      await service.delete(uuid);

      const updated = mockStudiesService.updateStudy.mock.calls[0][0] as StudyEntity;
      const section = updated.sections.find((s) => s?.uuid === 'section-uuid-1');
      expect(section?.selected_cable_support_manipulation_uuid).toBeNull();
    });

    it('should not change selection when the deleted uuid was not selected', async () => {
      const uuid = 'manip-to-delete';
      const otherId = 'other-manip';
      mockStudiesService.getStudy.mockResolvedValue({
        ...mockStudy,
        sections: [
          {
            ...mockSectionBase,
            cable_support_manipulations: [
              {
                uuid,
                supportUuid: 'support-uuid-1',
                chargeUuid: 'charge-uuid-1',
                manip1: {
                  type: 'shifting' as const,
                  vertDisplacement: null,
                  anchoring: null,
                  lateralDistance: null,
                  ropeLength: null,
                  shiftingClampLength: 1
                },
                manip2: null
              },
              {
                uuid: otherId,
                supportUuid: 'support-uuid-2',
                chargeUuid: 'charge-uuid-1',
                manip1: {
                  type: 'crane' as const,
                  vertDisplacement: 5,
                  anchoring: 'without_chain' as const,
                  lateralDistance: 0,
                  ropeLength: null,
                  shiftingClampLength: null
                },
                manip2: null
              }
            ],
            selected_cable_support_manipulation_uuid: otherId
          }
        ]
      });

      await service.delete(uuid);

      const updated = mockStudiesService.updateStudy.mock.calls[0][0] as StudyEntity;
      const section = updated.sections.find((s) => s?.uuid === 'section-uuid-1');
      expect(section?.selected_cable_support_manipulation_uuid).toBe(otherId);
    });
  });

  // ---------------------------------------------------------------------------
  // reloadSection()
  // ---------------------------------------------------------------------------
  describe('reloadSection()', () => {
    it('should update spanService.section with the freshly fetched section', async () => {
      const freshSection = { ...mockSectionBase, name: 'Updated Name' };
      mockStudiesService.getStudy.mockResolvedValue({
        ...mockStudy,
        sections: [freshSection]
      });

      await service.reloadSection();

      expect(mockSpanService.section.set).toHaveBeenCalledWith(freshSection);
    });

    it('should do nothing when studyUuid is missing', async () => {
      mockPlotService.study.mockReturnValue(null);
      await service.reloadSection();
      expect(mockStudiesService.getStudy).not.toHaveBeenCalled();
    });

    it('should do nothing when sectionUuid is missing', async () => {
      mockSpanService.section.mockReturnValue(null);
      await service.reloadSection();
      expect(mockStudiesService.getStudy).not.toHaveBeenCalled();
    });

    it('should do nothing when study is not found', async () => {
      mockStudiesService.getStudy.mockResolvedValue(undefined);
      await service.reloadSection();
      expect(mockSpanService.section.set).not.toHaveBeenCalled();
    });

    it('should do nothing when section is not found in study', async () => {
      mockStudiesService.getStudy.mockResolvedValue({ ...mockStudy, sections: [] });
      await service.reloadSection();
      expect(mockSpanService.section.set).not.toHaveBeenCalled();
    });
  });
});
