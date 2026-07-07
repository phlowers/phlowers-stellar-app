/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { CableSpanManipService } from './cableSpanManip.service';
import { PlotService } from '@services/plot/plot.service';
import { PlotSpanService } from '@services/plot/plot-span.service';
import { StudiesService } from '@services/studies/studies.service';
import { CableSpanManipulation, Section } from '@shared/domain';
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

const mockManip: CableSpanManipulation = {
  uuid: 'manip-uuid-1',
  spanUuid: 'support-uuid-1',
  referenceSupport: 'LEFT',
  distanceToRefSupport: 5,
  cableManipType: 'with_a_crane',
  cableManipMethod: 'clamp',
  longitudinalDistance: 10,
  lateralDistance: 0,
  altitude: 100,
  anchoring: 'with_sling',
  chainName: null,
  chainLength: null,
  chainWeight: null,
  chainSurface: null,
  counterWeight: null,
  slingLength: 5
};

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
  start_latitude: null,
  start_longitude: null,
  start_azimuth: null,
  mean_gps_diff_meters: null
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

describe('CableSpanManipService', () => {
  let service: CableSpanManipService;
  let mockPlotService: vi.Mocked<PlotService>;
  let mockPlotSpanService: vi.Mocked<PlotSpanService>;
  let mockStudiesService: vi.Mocked<StudiesService>;

  beforeEach(() => {
    mockPlotService = {
      study: createSignalMock<Study | null>({ uuid: 'study-uuid-1' } as Study),
      loading: createSignalMock(false),
      litData: createSignalMock(null),
      baseLitData: createSignalMock(null),
      error: createSignalMock(null)
    } as unknown as vi.Mocked<PlotService>;

    mockPlotSpanService = {
      section: createSignalMock<Section | null>(mockSectionBase)
    } as unknown as vi.Mocked<PlotSpanService>;

    mockStudiesService = {
      getStudy: vi.fn().mockResolvedValue(mockStudy),
      updateStudy: vi.fn().mockResolvedValue(undefined)
    } as unknown as vi.Mocked<StudiesService>;

    TestBed.configureTestingModule({
      providers: [
        CableSpanManipService,
        { provide: PlotService, useValue: mockPlotService },
        { provide: PlotSpanService, useValue: mockPlotSpanService },
        { provide: StudiesService, useValue: mockStudiesService }
      ]
    });

    service = TestBed.inject(CableSpanManipService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // ---------------------------------------------------------------------------
  // clearPersistedFormData()
  // ---------------------------------------------------------------------------
  describe('clearPersistedFormData()', () => {
    it('should not throw for any span uuid', () => {
      expect(() => service.clearPersistedFormData('any-uuid')).not.toThrow();
    });
  });

  // ---------------------------------------------------------------------------
  // save()
  // ---------------------------------------------------------------------------
  describe('save()', () => {
    it('should return early when studyUuid is missing', async () => {
      mockPlotService.study.mockReturnValue(null);

      await service.save({ ...mockManip });

      expect(mockStudiesService.getStudy).not.toHaveBeenCalled();
    });

    it('should return early when sectionUuid is missing', async () => {
      mockPlotSpanService.section.mockReturnValue(null);

      await service.save({ ...mockManip });

      expect(mockStudiesService.getStudy).not.toHaveBeenCalled();
    });

    it('should return early when study is not found', async () => {
      mockStudiesService.getStudy.mockResolvedValue(undefined);

      await service.save({ ...mockManip });

      expect(mockStudiesService.updateStudy).not.toHaveBeenCalled();
    });

    it('should add a new manipulation and call updateStudy', async () => {
      const { uuid: _uuid, ...manip } = mockManip;

      await service.save(manip);

      expect(mockStudiesService.updateStudy).toHaveBeenCalled();
      const updatedStudy = mockStudiesService.updateStudy.mock.calls[0][0] as StudyEntity;
      const section = updatedStudy.sections.find((s) => s?.uuid === 'section-uuid-1');
      expect(section?.cable_span_manipulations).toHaveLength(1);
      expect(section?.cable_span_manipulations[0].spanUuid).toBe('support-uuid-1');
    });

    it('should generate a uuid when none is provided', async () => {
      const { uuid: _uuid, ...manip } = mockManip;

      await service.save(manip);

      const updatedStudy = mockStudiesService.updateStudy.mock.calls[0][0] as StudyEntity;
      const section = updatedStudy.sections.find((s) => s?.uuid === 'section-uuid-1');
      expect(section?.cable_span_manipulations[0].uuid).toBeTruthy();
    });

    it('should set selected_cable_span_manipulation_uuid after save', async () => {
      const { uuid: _uuid, ...manip } = mockManip;

      await service.save(manip);

      const updatedStudy = mockStudiesService.updateStudy.mock.calls[0][0] as StudyEntity;
      const section = updatedStudy.sections.find((s) => s?.uuid === 'section-uuid-1');
      expect(section?.selected_cable_span_manipulation_uuid).toBeTruthy();
    });

    it('should update an existing manipulation when one with the same spanUuid already exists', async () => {
      const existingUuid = 'existing-manip-uuid';
      const studyWithManip: StudyEntity = {
        ...mockStudy,
        sections: [
          {
            ...mockSectionBase,
            cable_span_manipulations: [{ ...mockManip, uuid: existingUuid }]
          }
        ]
      };
      mockStudiesService.getStudy.mockResolvedValue(studyWithManip);

      await service.save({ ...mockManip, slingLength: 42 });

      const updatedStudy = mockStudiesService.updateStudy.mock.calls[0][0] as StudyEntity;
      const section = updatedStudy.sections.find((s) => s?.uuid === 'section-uuid-1');
      expect(section?.cable_span_manipulations).toHaveLength(1);
      expect(section?.cable_span_manipulations[0].uuid).toBe(existingUuid);
      expect(section?.cable_span_manipulations[0].slingLength).toBe(42);
    });

    it('should preserve the uuid when provided and no existing manipulation exists for the span', async () => {
      const providedUuid = 'provided-uuid';

      await service.save({ ...mockManip, uuid: providedUuid, spanUuid: 'new-span-uuid' });

      const updatedStudy = mockStudiesService.updateStudy.mock.calls[0][0] as StudyEntity;
      const section = updatedStudy.sections.find((s) => s?.uuid === 'section-uuid-1');
      expect(section?.cable_span_manipulations[0].uuid).toBe(providedUuid);
    });

    it('should prepend the new manipulation to the existing list', async () => {
      const existingManip: CableSpanManipulation = { ...mockManip, uuid: 'other-uuid', spanUuid: 'other-span' };
      const studyWithManip: StudyEntity = {
        ...mockStudy,
        sections: [{ ...mockSectionBase, cable_span_manipulations: [existingManip] }]
      };
      mockStudiesService.getStudy.mockResolvedValue(studyWithManip);

      await service.save({ ...mockManip, spanUuid: 'new-span', uuid: 'new-uuid' });

      const updatedStudy = mockStudiesService.updateStudy.mock.calls[0][0] as StudyEntity;
      const section = updatedStudy.sections.find((s) => s?.uuid === 'section-uuid-1');
      expect(section?.cable_span_manipulations).toHaveLength(2);
      expect(section?.cable_span_manipulations[0].spanUuid).toBe('new-span');
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
      mockPlotSpanService.section.mockReturnValue(null);

      await service.delete('some-uuid');

      expect(mockStudiesService.getStudy).not.toHaveBeenCalled();
    });

    it('should return early when study is not found', async () => {
      mockStudiesService.getStudy.mockResolvedValue(undefined);

      await service.delete('some-uuid');

      expect(mockStudiesService.updateStudy).not.toHaveBeenCalled();
    });

    it('should remove the manipulation from section and call updateStudy', async () => {
      const uuid = 'manip-to-delete';
      const studyWithManip: StudyEntity = {
        ...mockStudy,
        sections: [
          {
            ...mockSectionBase,
            cable_span_manipulations: [{ ...mockManip, uuid }],
            selected_cable_span_manipulation_uuid: uuid
          }
        ]
      };
      mockStudiesService.getStudy.mockResolvedValue(studyWithManip);

      await service.delete(uuid);

      expect(mockStudiesService.updateStudy).toHaveBeenCalled();
      const updatedStudy = mockStudiesService.updateStudy.mock.calls[0][0] as StudyEntity;
      const section = updatedStudy.sections.find((s) => s?.uuid === 'section-uuid-1');
      expect(section?.cable_span_manipulations).toHaveLength(0);
    });

    it('should clear selected_cable_span_manipulation_uuid when the deleted one was selected', async () => {
      const uuid = 'manip-to-delete';
      const studyWithManip: StudyEntity = {
        ...mockStudy,
        sections: [
          {
            ...mockSectionBase,
            cable_span_manipulations: [{ ...mockManip, uuid }],
            selected_cable_span_manipulation_uuid: uuid
          }
        ]
      };
      mockStudiesService.getStudy.mockResolvedValue(studyWithManip);

      await service.delete(uuid);

      const updatedStudy = mockStudiesService.updateStudy.mock.calls[0][0] as StudyEntity;
      const section = updatedStudy.sections.find((s) => s?.uuid === 'section-uuid-1');
      expect(section?.selected_cable_span_manipulation_uuid).toBeNull();
    });

    it('should select the first remaining manipulation when the deleted one was selected', async () => {
      const uuid = 'manip-to-delete';
      const otherId = 'other-manip';
      const studyWithManip: StudyEntity = {
        ...mockStudy,
        sections: [
          {
            ...mockSectionBase,
            cable_span_manipulations: [
              { ...mockManip, uuid },
              { ...mockManip, uuid: otherId, spanUuid: 'other-span' }
            ],
            selected_cable_span_manipulation_uuid: uuid
          }
        ]
      };
      mockStudiesService.getStudy.mockResolvedValue(studyWithManip);

      await service.delete(uuid);

      const updatedStudy = mockStudiesService.updateStudy.mock.calls[0][0] as StudyEntity;
      const section = updatedStudy.sections.find((s) => s?.uuid === 'section-uuid-1');
      expect(section?.selected_cable_span_manipulation_uuid).toBe(otherId);
    });

    it('should not change selection when deleted uuid was not selected', async () => {
      const uuid = 'manip-to-delete';
      const selectedId = 'selected-manip';
      const studyWithManip: StudyEntity = {
        ...mockStudy,
        sections: [
          {
            ...mockSectionBase,
            cable_span_manipulations: [
              { ...mockManip, uuid, spanUuid: 'span-to-delete' },
              { ...mockManip, uuid: selectedId, spanUuid: 'selected-span' }
            ],
            selected_cable_span_manipulation_uuid: selectedId
          }
        ]
      };
      mockStudiesService.getStudy.mockResolvedValue(studyWithManip);

      await service.delete(uuid);

      const updatedStudy = mockStudiesService.updateStudy.mock.calls[0][0] as StudyEntity;
      const section = updatedStudy.sections.find((s) => s?.uuid === 'section-uuid-1');
      expect(section?.selected_cable_span_manipulation_uuid).toBe(selectedId);
    });
  });

  // ---------------------------------------------------------------------------
  // reloadSection()
  // ---------------------------------------------------------------------------
  describe('reloadSection()', () => {
    it('should return early when studyUuid is missing', async () => {
      mockPlotService.study.mockReturnValue(null);

      await service.reloadSection();

      expect(mockStudiesService.getStudy).not.toHaveBeenCalled();
    });

    it('should return early when sectionUuid is missing', async () => {
      mockPlotSpanService.section.mockReturnValue(null);

      await service.reloadSection();

      expect(mockStudiesService.getStudy).not.toHaveBeenCalled();
    });

    it('should update spanService.section with the reloaded section', async () => {
      await service.reloadSection();

      expect(mockPlotSpanService.section.set).toHaveBeenCalledWith(mockSectionBase);
    });

    it('should not update section when study is not found', async () => {
      mockStudiesService.getStudy.mockResolvedValue(undefined);

      await service.reloadSection();

      expect(mockPlotSpanService.section.set).not.toHaveBeenCalled();
    });
  });
});
