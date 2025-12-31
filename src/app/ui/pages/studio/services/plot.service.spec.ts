/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { TestBed } from '@angular/core/testing';
import { PlotService, checkIfProjectionNeedRefresh } from './plot.service';
import { WorkerPythonService } from '@src/app/core/services/worker_python/worker-python.service';
import { CablesService } from '@src/app/core/services/cables/cables.service';
import {
  Task,
  TaskError,
  DataError
} from '@src/app/core/services/worker_python/tasks/types';
import { Section } from '@core/data/database/interfaces/section';
import { Cable } from '@core/data/database/interfaces/cable';
import { GetSectionOutput } from '@src/app/core/services/worker_python/tasks/types';
import * as plotly from 'plotly.js-dist-min';
import { PlotOptions } from '@src/app/ui/shared/components/studio/section/helpers/types';
import { Study } from '@core/data/database/interfaces/study';
import { Camera } from 'plotly.js-dist-min';

// Mock plotly
jest.mock('plotly.js-dist-min', () => ({
  purge: jest.fn()
}));

interface MockWorkerPythonService extends Partial<WorkerPythonService> {
  ready: boolean;
  runTask: jest.Mock;
  setReady?: (value: boolean) => void;
}

describe('PlotService', () => {
  let service: PlotService;
  let mockWorkerPythonService: MockWorkerPythonService;
  let mockCablesService: jest.Mocked<CablesService>;

  const mockGetSectionOutput: GetSectionOutput = {
    supports: [[[1, 2, 3]]],
    insulators: [[[4, 5, 6]]],
    spans: [[[7, 8, 9]]],
    L0: [],
    elevation: [],
    line_angle: [],
    vtl_under_chain: [],
    vtl_under_console: [],
    r_under_chain: [],
    r_under_console: [],
    ground_altitude: [],
    load_angle: [],
    displacement: [],
    span_length: []
  };

  const mockCable: Cable = {
    name: 'Test Cable',
    data_source: 'test-source',
    section: 100,
    diameter: 30,
    young_modulus: 200000,
    linear_mass: 1.5,
    dilatation_coefficient: 0.000017,
    temperature_reference: 20,
    stress_strain_a0: undefined,
    stress_strain_a1: undefined,
    stress_strain_a2: undefined,
    stress_strain_a3: undefined,
    stress_strain_a4: undefined,
    stress_strain_b0: undefined,
    stress_strain_b1: undefined,
    stress_strain_b2: undefined,
    stress_strain_b3: undefined,
    stress_strain_b4: undefined,
    is_polynomial: false,
    diameter_heart: undefined,
    section_conductor: undefined,
    section_heart: undefined,
    solar_absorption: undefined,
    emissivity: undefined,
    electric_resistance_20: undefined,
    linear_resistance_temperature_coef: undefined
  };

  const mockSection: Section = {
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
    lit: 'LIT-001',
    branch_name: 'Branch 1',
    voltage_idr: '400kV',
    comment: 'Test comment',
    supports_comment: 'Supports comment',
    supports: [
      {
        uuid: 'support-uuid-1',
        number: '1',
        name: 'Support 1',
        spanLength: 100,
        spanAngle: 0,
        attachmentSet: 1,
        attachmentHeight: 10,
        heightBelowConsole: 5,
        cableType: 'type1',
        armLength: 2,
        chainName: 'chain1',
        chainLength: 1,
        chainWeight: 0.5,
        chainV: true,
        counterWeight: 10,
        supportFootAltitude: 100,
        attachmentPosition: 'top',
        chainSurface: 0.1
      },
      {
        uuid: 'support-uuid-2',
        number: '2',
        name: 'Support 2',
        spanLength: 150,
        spanAngle: 0,
        attachmentSet: 1,
        attachmentHeight: 10,
        heightBelowConsole: 5,
        cableType: 'type1',
        armLength: 2,
        chainName: 'chain1',
        chainLength: 1,
        chainWeight: 0.5,
        chainV: true,
        counterWeight: 10,
        supportFootAltitude: 100,
        attachmentPosition: 'top',
        chainSurface: 0.1
      }
    ],
    initial_conditions: [],
    selected_initial_condition_uuid: undefined,
    charges: [],
    selected_charge_uuid: null
  };

  beforeEach(() => {
    let readyValue = true;
    mockWorkerPythonService = {
      get ready() {
        return readyValue;
      },
      runTask: jest.fn(),
      setReady: (value: boolean) => {
        readyValue = value;
      }
    };

    mockCablesService = {
      getCable: jest.fn()
    } as unknown as jest.Mocked<CablesService>;

    TestBed.configureTestingModule({
      providers: [
        PlotService,
        {
          provide: WorkerPythonService,
          useValue: mockWorkerPythonService as unknown as WorkerPythonService
        },
        { provide: CablesService, useValue: mockCablesService }
      ]
    });

    service = TestBed.inject(PlotService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('initialization', () => {
    it('should initialize with default values', () => {
      expect(service.error()).toBeNull();
      expect(service.litData()).toBeNull();
      expect(service.loading()).toBe(true);
      expect(service.workerReady()).toBe(false);
      expect(service.study()).toBeNull();
      expect(service.section()).toBeNull();
      expect(service.isSidebarOpen()).toBe(false);
    });

    it('should initialize plotOptions with default values', () => {
      const plotOptions = service.plotOptions();
      expect(plotOptions.view).toBe('3d');
      expect(plotOptions.side).toBe('profile');
      expect(plotOptions.startSupport).toBe(0);
      expect(plotOptions.endSupport).toBe(1);
      expect(plotOptions.invert).toBe(false);
    });
  });

  describe('plotOptionsChange', () => {
    it('should update a single plot option', () => {
      service.plotOptionsChange({ view: '2d' });
      expect(service.plotOptions().view).toBe('2d');
      expect(service.plotOptions().side).toBe('profile'); // Other options unchanged
    });

    it('should update side option', () => {
      service.plotOptionsChange({ side: 'face' });
      expect(service.plotOptions().side).toBe('face');
    });

    it('should update startSupport option', () => {
      service.plotOptionsChange({ startSupport: 5 });
      expect(service.plotOptions().startSupport).toBe(5);
    });

    it('should update endSupport option', () => {
      service.plotOptionsChange({ endSupport: 10 });
      expect(service.plotOptions().endSupport).toBe(10);
    });

    it('should update invert option', () => {
      service.plotOptionsChange({ invert: true });
      expect(service.plotOptions().invert).toBe(true);
    });
  });

  describe('calculateCharge', () => {
    it('should call workerPythonService.runTask with correct parameters', async () => {
      mockWorkerPythonService.runTask.mockResolvedValue({
        result: mockGetSectionOutput,
        error: null
      });

      await service.calculateCharge(100, 20, 5);

      expect(mockWorkerPythonService.runTask).toHaveBeenCalledWith(
        Task.changeClimateLoad,
        {
          windPressure: 100,
          cableTemperature: 20,
          iceThickness: 5
        }
      );
    });

    it('should set loading to true at start', async () => {
      let loadingState = false;
      mockWorkerPythonService.runTask.mockImplementation(() => {
        loadingState = service.loading();
        return Promise.resolve({ result: mockGetSectionOutput, error: null });
      });

      await service.calculateCharge(100, 20, 5);

      expect(loadingState).toBe(true);
    });

    it('should set loading to false after completion', async () => {
      mockWorkerPythonService.runTask.mockResolvedValue({
        result: mockGetSectionOutput,
        error: null
      });

      await service.calculateCharge(100, 20, 5);

      expect(service.loading()).toBe(false);
    });

    it('should set litData with result when successful', async () => {
      mockWorkerPythonService.runTask.mockResolvedValue({
        result: mockGetSectionOutput,
        error: null
      });

      await service.calculateCharge(100, 20, 5);

      expect(service.litData()).toEqual(mockGetSectionOutput);
    });

    it('should set error when task fails', async () => {
      const taskError = TaskError.CALCULATION_ERROR;
      mockWorkerPythonService.runTask.mockResolvedValue({
        result: mockGetSectionOutput,
        error: taskError
      });

      await service.calculateCharge(100, 20, 5);

      expect(service.error()).toBe(taskError);
    });

    it('should handle different parameter values', async () => {
      mockWorkerPythonService.runTask.mockResolvedValue({
        result: mockGetSectionOutput,
        error: null
      });

      await service.calculateCharge(50, 15, 2);

      expect(mockWorkerPythonService.runTask).toHaveBeenCalledWith(
        Task.changeClimateLoad,
        {
          windPressure: 50,
          cableTemperature: 15,
          iceThickness: 2
        }
      );
    });
  });

  describe('refreshSection', () => {
    it('should clear error and litData at start', async () => {
      service.error.set(TaskError.CALCULATION_ERROR);
      service.litData.set(mockGetSectionOutput);

      mockWorkerPythonService.setReady?.(true);
      mockCablesService.getCable.mockResolvedValue(mockCable);
      mockWorkerPythonService.runTask.mockResolvedValue({
        result: mockGetSectionOutput,
        error: null
      });

      await service.refreshSection(mockSection);

      expect(service.error()).toBeNull();
      expect(service.litData()).toEqual(mockGetSectionOutput);
    });

    it('should set error when workerPythonService is not ready', async () => {
      mockWorkerPythonService.setReady?.(false);

      await service.refreshSection(mockSection);

      expect(service.error()).toBe(DataError.NO_CABLE_FOUND);
      expect(service.loading()).toBe(false);
      expect(mockWorkerPythonService.runTask).not.toHaveBeenCalled();
    });

    it('should set error when section is null', async () => {
      mockWorkerPythonService.setReady?.(true);

      await service.refreshSection(null as unknown as Section);

      expect(service.error()).toBe(DataError.NO_CABLE_FOUND);
      expect(service.loading()).toBe(false);
    });

    it('should set error when section has no cable_name', async () => {
      mockWorkerPythonService.setReady?.(true);
      const sectionWithoutCable = { ...mockSection, cable_name: undefined };

      await service.refreshSection(sectionWithoutCable);

      expect(service.error()).toBe(DataError.NO_CABLE_FOUND);
      expect(service.loading()).toBe(false);
    });

    it('should call getCable with section cable_name', async () => {
      mockWorkerPythonService.setReady?.(true);
      mockCablesService.getCable.mockResolvedValue(mockCable);
      mockWorkerPythonService.runTask.mockResolvedValue({
        result: mockGetSectionOutput,
        error: null
      });

      await service.refreshSection(mockSection);

      expect(mockCablesService.getCable).toHaveBeenCalledWith('Test Cable');
    });

    it('should call workerPythonService.runTask with section and cable', async () => {
      mockWorkerPythonService.setReady?.(true);
      mockCablesService.getCable.mockResolvedValue(mockCable);
      mockWorkerPythonService.runTask.mockResolvedValue({
        result: mockGetSectionOutput,
        error: null
      });

      await service.refreshSection(mockSection);

      expect(mockWorkerPythonService.runTask).toHaveBeenCalledWith(
        Task.getLit,
        {
          section: mockSection,
          cable: mockCable
        }
      );
    });

    it('should update plotOptions with section supports range', async () => {
      mockWorkerPythonService.setReady?.(true);
      mockCablesService.getCable.mockResolvedValue(mockCable);
      mockWorkerPythonService.runTask.mockResolvedValue({
        result: mockGetSectionOutput,
        error: null
      });

      await service.refreshSection(mockSection);

      const plotOptions = service.plotOptions();
      expect(plotOptions.startSupport).toBe(0);
      expect(plotOptions.endSupport).toBe(mockSection.supports.length - 1);
      expect(plotOptions.invert).toBe(false);
    });

    it('should preserve other plotOptions when updating support range', async () => {
      service.plotOptionsChange({ view: '2d' });
      service.plotOptionsChange({ side: 'face' });

      mockWorkerPythonService.setReady?.(true);
      mockCablesService.getCable.mockResolvedValue(mockCable);
      mockWorkerPythonService.runTask.mockResolvedValue({
        result: mockGetSectionOutput,
        error: null
      });

      await service.refreshSection(mockSection);

      const plotOptions = service.plotOptions();
      expect(plotOptions.view).toBe('2d');
      expect(plotOptions.side).toBe('face');
      expect(plotOptions.startSupport).toBe(0);
      expect(plotOptions.endSupport).toBe(mockSection.supports.length - 1);
      expect(plotOptions.invert).toBe(false);
    });

    it('should set litData with result when successful', async () => {
      mockWorkerPythonService.setReady?.(true);
      mockCablesService.getCable.mockResolvedValue(mockCable);
      mockWorkerPythonService.runTask.mockResolvedValue({
        result: mockGetSectionOutput,
        error: null
      });

      await service.refreshSection(mockSection);

      expect(service.litData()).toEqual(mockGetSectionOutput);
    });

    it('should set error when task fails', async () => {
      const taskError = TaskError.CALCULATION_ERROR;
      mockWorkerPythonService.setReady?.(true);
      mockCablesService.getCable.mockResolvedValue(mockCable);
      mockWorkerPythonService.runTask.mockResolvedValue({
        result: mockGetSectionOutput,
        error: taskError
      });

      await service.refreshSection(mockSection);

      expect(service.error()).toBe(taskError);
    });

    it('should set loading to true at start', async () => {
      let loadingState = false;
      mockWorkerPythonService.setReady?.(true);
      mockCablesService.getCable.mockResolvedValue(mockCable);
      mockWorkerPythonService.runTask.mockImplementation(() => {
        loadingState = service.loading();
        return Promise.resolve({ result: mockGetSectionOutput, error: null });
      });

      await service.refreshSection(mockSection);

      expect(loadingState).toBe(true);
    });

    it('should set loading to false after completion', async () => {
      mockWorkerPythonService.setReady?.(true);
      mockCablesService.getCable.mockResolvedValue(mockCable);
      mockWorkerPythonService.runTask.mockResolvedValue({
        result: mockGetSectionOutput,
        error: null
      });

      await service.refreshSection(mockSection);

      expect(service.loading()).toBe(false);
    });

    it('should handle section with empty supports array', async () => {
      const sectionWithNoSupports = { ...mockSection, supports: [] };
      mockWorkerPythonService.setReady?.(true);
      mockCablesService.getCable.mockResolvedValue(mockCable);
      mockWorkerPythonService.runTask.mockResolvedValue({
        result: mockGetSectionOutput,
        error: null
      });

      await service.refreshSection(sectionWithNoSupports);

      const plotOptions = service.plotOptions();
      expect(plotOptions.startSupport).toBe(0);
      expect(plotOptions.endSupport).toBe(-1); // length - 1 = -1
    });
  });

  describe('purgePlot', () => {
    beforeEach(() => {
      // Mock document.getElementById
      document.getElementById = jest.fn();
    });

    it('should call plotly.purge when plotly-output element exists', () => {
      (document.getElementById as jest.Mock).mockReturnValue({
        id: 'plotly-output'
      });

      service.purgePlot();

      expect(plotly.purge).toHaveBeenCalledWith('plotly-output');
    });

    it('should clear litData', () => {
      service.litData.set(mockGetSectionOutput);
      (document.getElementById as jest.Mock).mockReturnValue({
        id: 'plotly-output'
      });

      service.purgePlot();

      expect(service.litData()).toBeNull();
    });

    it('should clear all state when plotly-output exists', () => {
      service.litData.set(mockGetSectionOutput);
      service.error.set(TaskError.CALCULATION_ERROR);
      service.loading.set(true);
      (document.getElementById as jest.Mock).mockReturnValue({
        id: 'plotly-output'
      });

      service.purgePlot();

      expect(plotly.purge).toHaveBeenCalledWith('plotly-output');
      expect(service.litData()).toBeNull();
      expect(service.error()).toBeNull();
      expect(service.loading()).toBe(false);
    });
  });

  describe('resetAll', () => {
    beforeEach(() => {
      // Mock document.getElementById
      document.getElementById = jest.fn();
    });

    it('should call purgePlot', () => {
      (document.getElementById as jest.Mock).mockReturnValue({
        id: 'plotly-output'
      });

      service.resetAll();

      expect(plotly.purge).toHaveBeenCalledWith('plotly-output');
    });

    it('should reset error to null', () => {
      service.error.set(TaskError.CALCULATION_ERROR);
      (document.getElementById as jest.Mock).mockReturnValue({
        id: 'plotly-output'
      });

      service.resetAll();

      expect(service.error()).toBeNull();
    });

    it('should reset litData to null', () => {
      service.litData.set(mockGetSectionOutput);
      (document.getElementById as jest.Mock).mockReturnValue({
        id: 'plotly-output'
      });

      service.resetAll();

      expect(service.litData()).toBeNull();
    });

    it('should set loading to false', () => {
      service.loading.set(true);
      (document.getElementById as jest.Mock).mockReturnValue({
        id: 'plotly-output'
      });

      service.resetAll();

      expect(service.loading()).toBe(false);
    });

    it('should reset plotOptions to default values', () => {
      service.plotOptionsChange({
        view: '2d',
        side: 'face',
        startSupport: 5,
        endSupport: 10,
        invert: true
      });
      (document.getElementById as jest.Mock).mockReturnValue({
        id: 'plotly-output'
      });

      service.resetAll();

      const plotOptions = service.plotOptions();
      expect(plotOptions.view).toBe('3d');
      expect(plotOptions.side).toBe('profile');
      expect(plotOptions.startSupport).toBe(0);
      expect(plotOptions.endSupport).toBe(1);
      expect(plotOptions.invert).toBe(false);
    });

    it('should reset camera to null', () => {
      const mockCamera: Camera = {
        eye: { x: 1, y: 1, z: 1 },
        center: { x: 0, y: 0, z: 0 },
        up: { x: 0, y: 0, z: 1 }
      };
      service.camera.set(mockCamera);
      (document.getElementById as jest.Mock).mockReturnValue({
        id: 'plotly-output'
      });

      service.resetAll();

      expect(service.camera()).toBeNull();
    });

    it('should reset section to null', () => {
      service.section.set(mockSection);
      (document.getElementById as jest.Mock).mockReturnValue({
        id: 'plotly-output'
      });

      service.resetAll();

      expect(service.section()).toBeNull();
    });

    it('should reset study to null', () => {
      const mockStudy: Study = {
        uuid: 'study-uuid-1',
        author_email: 'test@example.com',
        title: 'Test Study',
        description: 'Test Description',
        shareable: false,
        created_at_offline: '2025-01-01T00:00:00.000Z',
        updated_at_offline: '2025-01-01T00:00:00.000Z',
        saved: true,
        sections: [mockSection]
      };
      service.study.set(mockStudy);
      (document.getElementById as jest.Mock).mockReturnValue({
        id: 'plotly-output'
      });

      service.resetAll();

      expect(service.study()).toBeNull();
    });

    it('should reset all state properties at once', () => {
      const mockStudy: Study = {
        uuid: 'study-uuid-1',
        author_email: 'test@example.com',
        title: 'Test Study',
        description: 'Test Description',
        shareable: false,
        created_at_offline: '2025-01-01T00:00:00.000Z',
        updated_at_offline: '2025-01-01T00:00:00.000Z',
        saved: true,
        sections: [mockSection]
      };
      const mockCamera: Camera = {
        eye: { x: 1, y: 1, z: 1 },
        center: { x: 0, y: 0, z: 0 },
        up: { x: 0, y: 0, z: 1 }
      };

      // Set all state to non-default values
      service.error.set(TaskError.CALCULATION_ERROR);
      service.litData.set(mockGetSectionOutput);
      service.loading.set(true);
      service.plotOptionsChange({
        view: '2d',
        side: 'face',
        startSupport: 5,
        endSupport: 10,
        invert: true
      });
      service.camera.set(mockCamera);
      service.section.set(mockSection);
      service.study.set(mockStudy);

      (document.getElementById as jest.Mock).mockReturnValue({
        id: 'plotly-output'
      });

      service.resetAll();

      // Verify all state is reset
      expect(plotly.purge).toHaveBeenCalledWith('plotly-output');
      expect(service.error()).toBeNull();
      expect(service.litData()).toBeNull();
      expect(service.loading()).toBe(false);
      expect(service.camera()).toBeNull();
      expect(service.section()).toBeNull();
      expect(service.study()).toBeNull();

      const plotOptions = service.plotOptions();
      expect(plotOptions.view).toBe('3d');
      expect(plotOptions.side).toBe('profile');
      expect(plotOptions.startSupport).toBe(0);
      expect(plotOptions.endSupport).toBe(1);
      expect(plotOptions.invert).toBe(false);
    });

    it('should handle reset when plotly-output element does not exist', () => {
      (document.getElementById as jest.Mock).mockReturnValue(null);

      service.error.set(TaskError.CALCULATION_ERROR);
      service.litData.set(mockGetSectionOutput);
      service.loading.set(true);

      service.resetAll();

      // purgePlot should not throw, but other resets should work
      expect(service.error()).toBeNull();
      expect(service.litData()).toBeNull();
      expect(service.loading()).toBe(false);
    });
  });

  describe('checkIfProjectionNeedRefresh', () => {
    const baseOptions: PlotOptions = {
      view: '3d',
      side: 'profile',
      startSupport: 0,
      endSupport: 1,
      invert: false
    };

    describe('when loading is true', () => {
      it('should return false regardless of options changes', () => {
        const oldOptions: PlotOptions = { ...baseOptions };
        const newOptions: PlotOptions = {
          ...baseOptions,
          view: '2d',
          side: 'face',
          startSupport: 5,
          endSupport: 10
        };

        expect(checkIfProjectionNeedRefresh(oldOptions, newOptions, true)).toBe(
          false
        );
      });

      it('should return false even when all options are identical', () => {
        const options: PlotOptions = { ...baseOptions };
        expect(checkIfProjectionNeedRefresh(options, options, true)).toBe(
          false
        );
      });
    });

    describe('when loading is false', () => {
      describe('view or side changes', () => {
        it('should return true when view changes from 3d to 2d', () => {
          const oldOptions: PlotOptions = { ...baseOptions, view: '3d' };
          const newOptions: PlotOptions = { ...baseOptions, view: '2d' };

          expect(
            checkIfProjectionNeedRefresh(oldOptions, newOptions, false)
          ).toBe(true);
        });

        it('should return true when view changes from 2d to 3d', () => {
          const oldOptions: PlotOptions = { ...baseOptions, view: '2d' };
          const newOptions: PlotOptions = { ...baseOptions, view: '3d' };

          expect(
            checkIfProjectionNeedRefresh(oldOptions, newOptions, false)
          ).toBe(true);
        });

        it('should return true when side changes from profile to face', () => {
          const oldOptions: PlotOptions = { ...baseOptions, side: 'profile' };
          const newOptions: PlotOptions = { ...baseOptions, side: 'face' };

          expect(
            checkIfProjectionNeedRefresh(oldOptions, newOptions, false)
          ).toBe(true);
        });

        it('should return true when side changes from face to profile', () => {
          const oldOptions: PlotOptions = { ...baseOptions, side: 'face' };
          const newOptions: PlotOptions = { ...baseOptions, side: 'profile' };

          expect(
            checkIfProjectionNeedRefresh(oldOptions, newOptions, false)
          ).toBe(true);
        });

        it('should return true when both view and side change', () => {
          const oldOptions: PlotOptions = {
            ...baseOptions,
            view: '3d',
            side: 'profile'
          };
          const newOptions: PlotOptions = {
            ...baseOptions,
            view: '2d',
            side: 'face'
          };

          expect(
            checkIfProjectionNeedRefresh(oldOptions, newOptions, false)
          ).toBe(true);
        });
      });

      describe('when view is not 2d', () => {
        it('should return false when view is 3d and only startSupport changes', () => {
          const oldOptions: PlotOptions = {
            ...baseOptions,
            view: '3d',
            startSupport: 0
          };
          const newOptions: PlotOptions = {
            ...baseOptions,
            view: '3d',
            startSupport: 5
          };

          expect(
            checkIfProjectionNeedRefresh(oldOptions, newOptions, false)
          ).toBe(false);
        });

        it('should return false when view is 3d and only endSupport changes', () => {
          const oldOptions: PlotOptions = {
            ...baseOptions,
            view: '3d',
            endSupport: 1
          };
          const newOptions: PlotOptions = {
            ...baseOptions,
            view: '3d',
            endSupport: 10
          };

          expect(
            checkIfProjectionNeedRefresh(oldOptions, newOptions, false)
          ).toBe(false);
        });

        it('should return false when view is 3d and both supports change', () => {
          const oldOptions: PlotOptions = {
            ...baseOptions,
            view: '3d',
            startSupport: 0,
            endSupport: 1
          };
          const newOptions: PlotOptions = {
            ...baseOptions,
            view: '3d',
            startSupport: 5,
            endSupport: 10
          };

          expect(
            checkIfProjectionNeedRefresh(oldOptions, newOptions, false)
          ).toBe(false);
        });

        it('should return false when view is 3d and all options are identical', () => {
          const options: PlotOptions = { ...baseOptions, view: '3d' };
          expect(checkIfProjectionNeedRefresh(options, options, false)).toBe(
            false
          );
        });
      });

      describe('when view is 2d', () => {
        it('should return true when startSupport changes', () => {
          const oldOptions: PlotOptions = {
            ...baseOptions,
            view: '2d',
            startSupport: 0
          };
          const newOptions: PlotOptions = {
            ...baseOptions,
            view: '2d',
            startSupport: 5
          };

          expect(
            checkIfProjectionNeedRefresh(oldOptions, newOptions, false)
          ).toBe(true);
        });

        it('should return true when endSupport changes', () => {
          const oldOptions: PlotOptions = {
            ...baseOptions,
            view: '2d',
            endSupport: 1
          };
          const newOptions: PlotOptions = {
            ...baseOptions,
            view: '2d',
            endSupport: 10
          };

          expect(
            checkIfProjectionNeedRefresh(oldOptions, newOptions, false)
          ).toBe(true);
        });

        it('should return true when both startSupport and endSupport change', () => {
          const oldOptions: PlotOptions = {
            ...baseOptions,
            view: '2d',
            startSupport: 0,
            endSupport: 1
          };
          const newOptions: PlotOptions = {
            ...baseOptions,
            view: '2d',
            startSupport: 5,
            endSupport: 10
          };

          expect(
            checkIfProjectionNeedRefresh(oldOptions, newOptions, false)
          ).toBe(true);
        });

        it('should return false when supports do not change', () => {
          const oldOptions: PlotOptions = {
            ...baseOptions,
            view: '2d',
            startSupport: 0,
            endSupport: 1
          };
          const newOptions: PlotOptions = {
            ...baseOptions,
            view: '2d',
            startSupport: 0,
            endSupport: 1
          };

          expect(
            checkIfProjectionNeedRefresh(oldOptions, newOptions, false)
          ).toBe(false);
        });

        it('should return false when only invert changes', () => {
          const oldOptions: PlotOptions = {
            ...baseOptions,
            view: '2d',
            invert: false
          };
          const newOptions: PlotOptions = {
            ...baseOptions,
            view: '2d',
            invert: true
          };

          expect(
            checkIfProjectionNeedRefresh(oldOptions, newOptions, false)
          ).toBe(false);
        });

        it('should return false when all options are identical', () => {
          const options: PlotOptions = { ...baseOptions, view: '2d' };
          expect(checkIfProjectionNeedRefresh(options, options, false)).toBe(
            false
          );
        });
      });
    });

    describe('edge cases', () => {
      it('should handle zero values for supports', () => {
        const oldOptions: PlotOptions = {
          ...baseOptions,
          view: '2d',
          startSupport: 0,
          endSupport: 0
        };
        const newOptions: PlotOptions = {
          ...baseOptions,
          view: '2d',
          startSupport: 0,
          endSupport: 1
        };

        expect(
          checkIfProjectionNeedRefresh(oldOptions, newOptions, false)
        ).toBe(true);
      });

      it('should handle large values for supports', () => {
        const oldOptions: PlotOptions = {
          ...baseOptions,
          view: '2d',
          startSupport: 100,
          endSupport: 200
        };
        const newOptions: PlotOptions = {
          ...baseOptions,
          view: '2d',
          startSupport: 100,
          endSupport: 201
        };

        expect(
          checkIfProjectionNeedRefresh(oldOptions, newOptions, false)
        ).toBe(true);
      });

      it('should handle negative values for supports', () => {
        const oldOptions: PlotOptions = {
          ...baseOptions,
          view: '2d',
          startSupport: -1,
          endSupport: 0
        };
        const newOptions: PlotOptions = {
          ...baseOptions,
          view: '2d',
          startSupport: -1,
          endSupport: 1
        };

        expect(
          checkIfProjectionNeedRefresh(oldOptions, newOptions, false)
        ).toBe(true);
      });
    });
  });
});
