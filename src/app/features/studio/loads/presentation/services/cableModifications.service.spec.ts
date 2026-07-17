/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { CableModificationsService } from './cableModifications.service';
import { CableModificationParams } from './cableModifications.service.interfaces';
import { PlotService } from '@services/plot/plot.service';
import { PlotSpanService } from '@services/plot/plot-span.service';
import { PlotOptionsService } from '@services/plot/plot-options.service';
import { WorkerPythonService } from '@services/worker_python/worker-python.service';
import { StudiesService } from '@services/studies/studies.service';
import { Task, TaskError } from '@services/worker_python/tasks/types';
import { Charge, Section, SymmetryType } from '@shared/domain';
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

const mockChargeData: Charge = {
  uuid: 'charge-uuid-1',
  name: 'Charge 1',
  personnelPresence: true,
  description: 'Test charge description',
  data: {
    climate: {
      windPressure: 0,
      cableTemperature: 15,
      symmetryType: SymmetryType.SYMMETRIC,
      iceThickness: 0,
      frontierSupportNumber: null,
      iceThicknessBefore: null,
      iceThicknessAfter: null
    },
    spanLoads: []
  }
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
  charges: [mockChargeData],
  selected_charge_uuid: 'charge-uuid-1',
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

const mockParams: CableModificationParams = {
  spanUuid: 'support-uuid-1',
  supportRef: 'LEFT',
  modificationType: 'lengthening',
  modifiedLengthCable: 0.5,
  distanceSupportRef: 10
};

describe('CableModificationsService', () => {
  let service: CableModificationsService;
  let mockPlotService: vi.Mocked<PlotService>;
  let mockSpanService: vi.Mocked<PlotSpanService>;
  let plotOptionsServiceMock: { refreshCamera: ReturnType<typeof vi.fn> };
  let mockWorkerPythonService: vi.Mocked<WorkerPythonService>;
  let mockStudiesService: vi.Mocked<StudiesService>;

  beforeEach(() => {
    mockPlotService = {
      study: createSignalMock<Study | null>({ uuid: 'study-uuid-1' } as Study),
      loading: createSignalMock(false),
      litData: createSignalMock(null),
      baseLitData: createSignalMock(null),
      error: createSignalMock(null),
      diagnostics: createSignalMock([])
    } as unknown as vi.Mocked<PlotService>;
    mockSpanService = {
      section: createSignalMock<Section | null>(mockSectionBase),
      getSupportIndex: vi.fn().mockReturnValue(0)
    } as unknown as vi.Mocked<PlotSpanService>;
    plotOptionsServiceMock = {
      refreshCamera: vi.fn()
    };

    mockWorkerPythonService = {
      runTask: vi.fn()
    } as unknown as vi.Mocked<WorkerPythonService>;

    mockStudiesService = {
      getStudy: vi.fn().mockResolvedValue(mockStudy),
      updateStudy: vi.fn().mockResolvedValue(undefined)
    } as unknown as vi.Mocked<StudiesService>;

    TestBed.configureTestingModule({
      providers: [
        CableModificationsService,
        { provide: PlotService, useValue: mockPlotService },
        { provide: PlotSpanService, useValue: mockSpanService },
        { provide: PlotOptionsService, useValue: plotOptionsServiceMock },
        { provide: WorkerPythonService, useValue: mockWorkerPythonService },
        { provide: StudiesService, useValue: mockStudiesService }
      ]
    });

    service = TestBed.inject(CableModificationsService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // ---------------------------------------------------------------------------
  // calculate()
  // ---------------------------------------------------------------------------
  describe('calculate()', () => {
    it('should return early when spanIndex is -1', async () => {
      mockSpanService.getSupportIndex.mockReturnValue(-1);

      await service.calculate(mockParams);

      expect(mockWorkerPythonService.runTask).not.toHaveBeenCalled();
    });

    it('should call refreshCamera and set loading to true then false', async () => {
      mockWorkerPythonService.runTask.mockResolvedValue({
        result: { success: true },
        error: null,
        diagnostics: []
      });

      await service.calculate(mockParams);

      expect(plotOptionsServiceMock.refreshCamera).toHaveBeenCalled();
      expect(mockPlotService.loading.set).toHaveBeenCalledWith(true);
      expect(mockPlotService.loading.set).toHaveBeenCalledWith(false);
    });

    it('should call runTask with shortenLengthenCable task and correct inputs', async () => {
      mockWorkerPythonService.runTask.mockResolvedValue({
        result: { success: true },
        error: null,
        diagnostics: []
      });

      await service.calculate(mockParams);

      expect(mockWorkerPythonService.runTask).toHaveBeenCalledWith(Task.shortenLengthenCable, {
        spanIndex: 0,
        modificationType: mockParams.modificationType,
        modifiedLengthCable: mockParams.modifiedLengthCable,
        distanceSupportRef: mockParams.distanceSupportRef,
        supportRef: mockParams.supportRef
      });
    });

    it('should propagate task error to plotService.error', async () => {
      const taskError = TaskError.CALCULATION_ERROR;
      mockWorkerPythonService.runTask.mockResolvedValue({
        result: { success: true },
        error: taskError,
        diagnostics: []
      });

      await service.calculate(mockParams);

      expect(mockPlotService.error.set).toHaveBeenCalledWith(taskError);
    });
  });

  // ---------------------------------------------------------------------------
  // save()
  // ---------------------------------------------------------------------------
  describe('save()', () => {
    it('should return early when studyUuid is missing', async () => {
      mockPlotService.study.mockReturnValue(null);

      await service.save({
        spanUuid: 'su',
        supportRef: 'LEFT',
        modificationType: 'lengthening',
        modifiedLengthCable: 1,
        distanceSupportRef: 5
      });

      expect(mockStudiesService.getStudy).not.toHaveBeenCalled();
    });

    it('should return early when sectionUuid is missing', async () => {
      mockSpanService.section.mockReturnValue(null);

      await service.save({
        spanUuid: 'su',
        supportRef: 'LEFT',
        modificationType: 'lengthening',
        modifiedLengthCable: 1,
        distanceSupportRef: 5
      });

      expect(mockStudiesService.getStudy).not.toHaveBeenCalled();
    });

    it('should return early when study is not found', async () => {
      mockStudiesService.getStudy.mockResolvedValue(undefined);

      await service.save({
        spanUuid: 'su',
        supportRef: 'LEFT',
        modificationType: 'lengthening',
        modifiedLengthCable: 1,
        distanceSupportRef: 5
      });

      expect(mockStudiesService.updateStudy).not.toHaveBeenCalled();
    });

    it('should return early when section is not found in study', async () => {
      const studyWithoutSection: StudyEntity = { ...mockStudy, sections: [] };
      mockStudiesService.getStudy.mockResolvedValue(studyWithoutSection);

      await service.save({
        spanUuid: 'su',
        supportRef: 'LEFT',
        modificationType: 'lengthening',
        modifiedLengthCable: 1,
        distanceSupportRef: 5
      });

      expect(mockStudiesService.updateStudy).not.toHaveBeenCalled();
    });

    it('should add new cable modification and call updateStudy', async () => {
      const modification = {
        spanUuid: 'support-uuid-1',
        supportRef: 'LEFT' as const,
        modificationType: 'lengthening' as const,
        modifiedLengthCable: 0.5,
        distanceSupportRef: 10
      };

      await service.save(modification);

      expect(mockStudiesService.updateStudy).toHaveBeenCalled();
      const updatedStudy = mockStudiesService.updateStudy.mock.calls[0][0] as StudyEntity;
      const section = updatedStudy.sections.find((s) => s?.uuid === 'section-uuid-1');
      expect(section?.cable_modifications).toHaveLength(1);
      expect(section?.cable_modifications[0].spanUuid).toBe('support-uuid-1');
    });

    it('should set selected_cable_modification_uuid after save', async () => {
      const modification = {
        spanUuid: 'support-uuid-1',
        supportRef: 'LEFT' as const,
        modificationType: 'lengthening' as const,
        modifiedLengthCable: 0.5,
        distanceSupportRef: 10
      };

      await service.save(modification);

      const updatedStudy = mockStudiesService.updateStudy.mock.calls[0][0] as StudyEntity;
      const section = updatedStudy.sections.find((s) => s?.uuid === 'section-uuid-1');
      expect(section?.selected_cable_modification_uuid).toBeTruthy();
    });

    it('should update an existing cable modification by spanUuid when no uuid is provided', async () => {
      const existingUuid = 'existing-mod-uuid';
      const studyWithMod: StudyEntity = {
        ...mockStudy,
        sections: [
          {
            ...mockSectionBase,
            cable_modifications: [
              {
                uuid: existingUuid,
                spanUuid: 'support-uuid-1',
                supportRef: 'LEFT',
                modificationType: 'lengthening',
                modifiedLengthCable: 0.1,
                distanceSupportRef: 5
              }
            ]
          }
        ]
      };
      mockStudiesService.getStudy.mockResolvedValue(studyWithMod);

      // No uuid provided — should still find and replace by spanUuid
      await service.save({
        spanUuid: 'support-uuid-1',
        supportRef: 'RIGHT',
        modificationType: 'shortening',
        modifiedLengthCable: 0.9,
        distanceSupportRef: 20
      });

      const updatedStudy = mockStudiesService.updateStudy.mock.calls[0][0] as StudyEntity;
      const section = updatedStudy.sections.find((s) => s?.uuid === 'section-uuid-1');
      expect(section?.cable_modifications).toHaveLength(1);
      expect(section?.cable_modifications[0].uuid).toBe(existingUuid);
      expect(section?.cable_modifications[0].modifiedLengthCable).toBe(0.9);
      expect(section?.cable_modifications[0].supportRef).toBe('RIGHT');
    });

    it('should update an existing cable modification', async () => {
      const existingUuid = 'existing-mod-uuid';
      const studyWithMod: StudyEntity = {
        ...mockStudy,
        sections: [
          {
            ...mockSectionBase,
            cable_modifications: [
              {
                uuid: existingUuid,
                spanUuid: 'support-uuid-1',
                supportRef: 'LEFT',
                modificationType: 'lengthening',
                modifiedLengthCable: 0.1,
                distanceSupportRef: 5
              }
            ]
          }
        ]
      };
      mockStudiesService.getStudy.mockResolvedValue(studyWithMod);

      await service.save({
        uuid: existingUuid,
        spanUuid: 'support-uuid-1',
        supportRef: 'RIGHT',
        modificationType: 'shortening',
        modifiedLengthCable: 0.9,
        distanceSupportRef: 20
      });

      const updatedStudy = mockStudiesService.updateStudy.mock.calls[0][0] as StudyEntity;
      const section = updatedStudy.sections.find((s) => s?.uuid === 'section-uuid-1');
      expect(section?.cable_modifications).toHaveLength(1);
      expect(section?.cable_modifications[0].modifiedLengthCable).toBe(0.9);
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
      const studyWithoutMatchingSection: StudyEntity = {
        ...mockStudy,
        sections: []
      };
      mockStudiesService.getStudy.mockResolvedValue(studyWithoutMatchingSection);

      await service.delete('some-uuid');

      expect(mockStudiesService.updateStudy).not.toHaveBeenCalled();
    });

    it('should remove the modification from section and call updateStudy', async () => {
      const uuid = 'mod-to-delete';
      const studyWithMod: StudyEntity = {
        ...mockStudy,
        sections: [
          {
            ...mockSectionBase,
            cable_modifications: [
              {
                uuid,
                spanUuid: 'support-uuid-1',
                supportRef: 'LEFT',
                modificationType: 'lengthening',
                modifiedLengthCable: 1,
                distanceSupportRef: 5
              }
            ],
            selected_cable_modification_uuid: uuid
          }
        ]
      };
      mockStudiesService.getStudy.mockResolvedValue(studyWithMod);

      await service.delete(uuid);

      expect(mockStudiesService.updateStudy).toHaveBeenCalled();
      const updatedStudy = mockStudiesService.updateStudy.mock.calls[0][0] as StudyEntity;
      const section = updatedStudy.sections.find((s) => s?.uuid === 'section-uuid-1');
      expect(section?.cable_modifications).toHaveLength(0);
      expect(section?.selected_cable_modification_uuid).toBeNull();
    });

    it('should not change selection when deleted uuid was not selected', async () => {
      const uuid = 'mod-to-delete';
      const otherId = 'other-mod';
      const studyWithMod: StudyEntity = {
        ...mockStudy,
        sections: [
          {
            ...mockSectionBase,
            cable_modifications: [
              {
                uuid,
                spanUuid: 'su1',
                supportRef: 'LEFT',
                modificationType: 'lengthening',
                modifiedLengthCable: 1,
                distanceSupportRef: 5
              },
              {
                uuid: otherId,
                spanUuid: 'su1',
                supportRef: 'RIGHT',
                modificationType: 'shortening',
                modifiedLengthCable: 2,
                distanceSupportRef: 3
              }
            ],
            selected_cable_modification_uuid: otherId
          }
        ]
      };
      mockStudiesService.getStudy.mockResolvedValue(studyWithMod);

      await service.delete(uuid);

      const updatedStudy = mockStudiesService.updateStudy.mock.calls[0][0] as StudyEntity;
      const section = updatedStudy.sections.find((s) => s?.uuid === 'section-uuid-1');
      expect(section?.selected_cable_modification_uuid).toBe(otherId);
    });
  });

  // ---------------------------------------------------------------------------
  // clearPersistedFormData()
  // ---------------------------------------------------------------------------
  describe('clearPersistedFormData()', () => {
    it('should execute without throwing', () => {
      expect(() => service.clearPersistedFormData('some-span-uuid')).not.toThrow();
    });
  });

  // ---------------------------------------------------------------------------
  // selectSpan() / clearSelectedSpan()
  // ---------------------------------------------------------------------------
  describe('selectSpan() / clearSelectedSpan()', () => {
    it('should expose a null selectedSpanUuid signal by default', () => {
      expect(service.selectedSpanUuid()).toBeNull();
    });

    it('should update the signal when selectSpan is called', () => {
      service.selectSpan('span-xyz');
      expect(service.selectedSpanUuid()).toBe('span-xyz');
    });

    it('should reset the signal to null when clearSelectedSpan is called', () => {
      service.selectSpan('span-xyz');
      service.clearSelectedSpan();
      expect(service.selectedSpanUuid()).toBeNull();
    });
  });
});
