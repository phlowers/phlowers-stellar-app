/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { TestBed } from '@angular/core/testing';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { PlotService } from './plot.service';
import { PlotSpanService } from './plot-span.service';
import { PlotOptionsService } from './plot-options.service';
import { checkIfProjectionNeedRefresh } from './plot-options.utils';
import { WorkerPythonService } from '@services/worker_python/worker-python.service';
import { CablesService } from '@shared/catalog/services/cables.service';
import {
  Task,
  TaskError,
  DataError,
  GetSectionWithBaseOutput,
  GetSectionOutput,
  ObstacleOutput,
  Distance
} from '@services/worker_python/tasks/types';
import { CatalogCable, Section, Study } from '@shared/domain';
import { Obstacle, LateralDistanceType, ReferenceSupport } from '@shared/domain/models/obstacle.model';
import * as plotly from 'plotly.js-dist-min';
import { PlotOptions } from '@shared/types/plot.types';
import { Camera } from 'plotly.js-dist-min';
import { BehaviorSubject } from 'rxjs';
import { ObstacleStateService } from '@services/obstacle-state/obstacle-state.service';

// Mock plotly
vi.mock('plotly.js-dist-min', () => ({
  purge: vi.fn()
}));

interface MockWorkerPythonService {
  ready: boolean;
  ready$: ReturnType<BehaviorSubject<boolean>['asObservable']>;
  runTask: vi.Mock;
  setReady?: (value: boolean) => void;
}

describe('PlotService', () => {
  let service: PlotService;
  let spanService: PlotSpanService;
  let plotOptionsService: PlotOptionsService;
  let mockWorkerPythonService: MockWorkerPythonService;
  let mockCablesService: vi.Mocked<CablesService>;
  let obstacleStateService: ObstacleStateService;

  const mockGetSectionOutput: GetSectionOutput = {
    supports: [[[1, 2, 3]]],
    insulators: [[[4, 5, 6]]],
    spans: [[[7, 8, 9]]],
    line_angle: [],
    vtl_under_chain: [],
    vtl_under_console: [],
    r_under_chain: [],
    r_under_console: [],
    ground_altitude: [],
    load_angle: [],
    displacement: [],
    loads_coords: {},
    span_length: [],
    elevation: [],
    parameter: [],
    tension_sup: [],
    tension_inf: [],
    L0: [],
    horizontal_distance: [],
    arc_length: [],
    T_h: [],
    slope_left: [],
    slope_right: [],
    sag: [],
    sag_s2: []
  };

  const mockGetSectionWithBaseOutput: GetSectionWithBaseOutput = {
    current: mockGetSectionOutput,
    base: mockGetSectionOutput
  };

  const mockCable: CatalogCable = {
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
    linear_resistance_temperature_coef: undefined,
    radial_thermal_conductivity: undefined,
    has_magnetic_heart: undefined,
    is_bimetallic: undefined,
    rts_cable: undefined,
    rts_layer_1: undefined,
    nb_strand_layer_1: undefined,
    rts_layer_2: undefined,
    nb_strand_layer_2: undefined,
    rts_layer_3: undefined,
    nb_strand_layer_3: undefined,
    rts_layer_4: undefined,
    nb_strand_layer_4: undefined,
    rts_layer_5: undefined,
    nb_strand_layer_5: undefined,
    rts_layer_6: undefined,
    nb_strand_layer_6: undefined,
    rts_layer_7: undefined,
    nb_strand_layer_7: undefined,
    rts_layer_8: undefined,
    nb_strand_layer_8: undefined,
    safety_coefficient: undefined
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
    lit_code: 'LIT-001',
    lit_name: 'LIT-001',
    branch_name: 'Branch 1',
    branch_idr: 'Branch 1',
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
        chainSurface: 0.1,
        towerModel: 'Tower Model'
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
        chainSurface: 0.1,
        towerModel: 'Tower Model'
      }
    ],
    obstacles: [],
    initial_conditions: [],
    selected_initial_condition_uuid: undefined,
    charges: [],
    selected_charge_uuid: null,
    field_measures: [],
    selected_field_measure_uuid: undefined,
    vtl_and_guying: undefined,
    cable_modifications: [],
    selected_cable_modification_uuid: null
  };

  beforeEach(() => {
    let readyValue = false;
    const readySubject = new BehaviorSubject<boolean>(readyValue);
    mockWorkerPythonService = {
      get ready() {
        return readyValue;
      },
      get ready$() {
        return readySubject.asObservable();
      },
      runTask: vi.fn(),
      setReady: (value: boolean) => {
        readyValue = value;
        readySubject.next(value);
      }
    };

    mockCablesService = {
      getCable: vi.fn()
    } as unknown as vi.Mocked<CablesService>;

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        PlotService,
        {
          provide: WorkerPythonService,
          useValue: mockWorkerPythonService as unknown as WorkerPythonService
        },
        { provide: CablesService, useValue: mockCablesService }
      ]
    });

    service = TestBed.inject(PlotService);
    spanService = TestBed.inject(PlotSpanService);
    plotOptionsService = TestBed.inject(PlotOptionsService);
    obstacleStateService = TestBed.inject(ObstacleStateService);
  });

  afterEach(() => {
    vi.clearAllMocks();
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
      expect(spanService.section()).toBeNull();
    });

    it('should initialize plotOptions with default values', () => {
      const plotOptions = plotOptionsService.plotOptions();
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
      expect(plotOptionsService.plotOptions().view).toBe('2d');
      expect(plotOptionsService.plotOptions().side).toBe('profile'); // Other options unchanged
    });

    it('should update side option', () => {
      service.plotOptionsChange({ side: 'face' });
      expect(plotOptionsService.plotOptions().side).toBe('face');
    });

    it('should update startSupport option', () => {
      service.plotOptionsChange({ startSupport: 5 });
      expect(plotOptionsService.plotOptions().startSupport).toBe(5);
    });

    it('should update endSupport option', () => {
      service.plotOptionsChange({ endSupport: 10 });
      expect(plotOptionsService.plotOptions().endSupport).toBe(10);
    });

    it('should update invert option', () => {
      service.plotOptionsChange({ invert: true });
      expect(plotOptionsService.plotOptions().invert).toBe(true);
    });

    it('should set spanAmountChoice to single when diff is 1', () => {
      service.plotOptionsChange({ startSupport: 2, endSupport: 3 });
      expect(spanService.spanAmountChoice()).toBe('single');
    });

    it('should set spanAmountChoice to double when diff is 2', () => {
      service.plotOptionsChange({ startSupport: 1, endSupport: 3 });
      expect(spanService.spanAmountChoice()).toBe('double');
    });

    it('should set spanAmountChoice to all when diff is greater than 2', () => {
      service.plotOptionsChange({ startSupport: 0, endSupport: 5 });
      expect(spanService.spanAmountChoice()).toBe('all');
    });

    it('should not change spanAmountChoice when only view changes', () => {
      spanService.spanAmountChoice.set('single');
      service.plotOptionsChange({ view: '2d' });
      expect(spanService.spanAmountChoice()).toBe('single');
    });

    it('should not change spanAmountChoice when only invert changes', () => {
      spanService.spanAmountChoice.set('double');
      service.plotOptionsChange({ invert: true });
      expect(spanService.spanAmountChoice()).toBe('double');
    });
  });

  describe('refreshSection', () => {
    it('should clear error and litData at start', async () => {
      service.error.set(TaskError.CALCULATION_ERROR);
      service.litData.set(mockGetSectionOutput);

      mockWorkerPythonService.setReady?.(true);
      mockCablesService.getCable.mockResolvedValue(mockCable);
      mockWorkerPythonService.runTask.mockResolvedValue({
        result: mockGetSectionWithBaseOutput,
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
        result: mockGetSectionWithBaseOutput,
        error: null
      });

      await service.refreshSection(mockSection);

      expect(mockCablesService.getCable).toHaveBeenCalledWith('Test Cable');
    });

    it('should call workerPythonService.runTask with section and cable', async () => {
      mockWorkerPythonService.setReady?.(true);
      mockCablesService.getCable.mockResolvedValue(mockCable);
      mockWorkerPythonService.runTask.mockResolvedValue({
        result: mockGetSectionWithBaseOutput,
        error: null
      });

      await service.refreshSection(mockSection);

      expect(mockWorkerPythonService.runTask).toHaveBeenCalledWith(Task.getLit, {
        section: mockSection,
        cable: mockCable
      });
    });

    it('should update plotOptions with section supports range', async () => {
      mockWorkerPythonService.setReady?.(true);
      mockCablesService.getCable.mockResolvedValue(mockCable);
      mockWorkerPythonService.runTask.mockResolvedValue({
        result: mockGetSectionWithBaseOutput,
        error: null
      });

      await service.refreshSection(mockSection);

      const plotOptions = plotOptionsService.plotOptions();
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
        result: mockGetSectionWithBaseOutput,
        error: null
      });

      await service.refreshSection(mockSection);

      const plotOptions = plotOptionsService.plotOptions();
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
        result: mockGetSectionWithBaseOutput,
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
        result: mockGetSectionWithBaseOutput,
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
        return Promise.resolve({
          result: mockGetSectionWithBaseOutput,
          error: null
        });
      });

      await service.refreshSection(mockSection);

      expect(loadingState).toBe(true);
    });

    it('should set loading to false after completion', async () => {
      mockWorkerPythonService.setReady?.(true);
      mockCablesService.getCable.mockResolvedValue(mockCable);
      mockWorkerPythonService.runTask.mockResolvedValue({
        result: mockGetSectionWithBaseOutput,
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
        result: mockGetSectionWithBaseOutput,
        error: null
      });

      await service.refreshSection(sectionWithNoSupports);

      const plotOptions = plotOptionsService.plotOptions();
      expect(plotOptions.startSupport).toBe(0);
      expect(plotOptions.endSupport).toBe(1); // default value, refreshSection doesn't update plotOptions
    });

    describe('with obstacles', () => {
      const mockObstacle: Obstacle = {
        uuid: 'obstacle-uuid-1',
        supportUuid: 'support-uuid-1',
        supportIndex: 0,
        name: 'Test Obstacle',
        type: 'building',
        altitudeType: 'absolute',
        referenceSupport: ReferenceSupport.LEFT,
        lateralDistanceType: LateralDistanceType.SPAN_AXIS,
        positions: [{ x: 100, y: 20, z: 5 }]
      };

      const mockObstacleOutput: ObstacleOutput = {
        obstacles: [{ uuid: 'obstacle-uuid-1', points: [[100, 20, 5]] }]
      };

      const mockDistance: Distance = {
        obstacleUuid: 'obstacle-uuid-1',
        points: [
          {
            pointIndex: 0,
            linePoint: [100, 0, 40],
            virtualPointHorizontal: [100, 20, 0],
            virtualPointVertical: [100, 0, 40],
            distanceDiagonal: 234,
            distanceHorizontal: 555,
            distanceVertical: 666
          }
        ]
      };

      beforeEach(() => {
        mockWorkerPythonService.setReady?.(true);
        mockCablesService.getCable.mockResolvedValue(mockCable);
        mockWorkerPythonService.runTask.mockImplementation((task: unknown) => {
          if (task === Task.getLit) {
            return Promise.resolve({ result: mockGetSectionWithBaseOutput, error: null });
          }
          if (task === Task.addObstacle) {
            return Promise.resolve({ result: mockObstacleOutput, error: null });
          }
          if (task === Task.calculateObstaclesDistances) {
            return Promise.resolve({ result: [mockDistance], error: null });
          }
          return Promise.resolve({ result: null, error: null });
        });
      });

      it('should call Task.addObstacle once with all section obstacles', async () => {
        const sectionWithObstacles: Section = { ...mockSection, obstacles: [mockObstacle] };

        await service.refreshSection(sectionWithObstacles);

        expect(mockWorkerPythonService.runTask).toHaveBeenCalledWith(Task.addObstacle,
          expect.objectContaining({ obstacles: [mockObstacle] })
        );
      });

      it('should call Task.addObstacle once with all obstacles when section has multiple', async () => {
        const secondObstacle: Obstacle = { ...mockObstacle, uuid: 'obstacle-uuid-2' };
        const sectionWithObstacles: Section = {
          ...mockSection,
          obstacles: [mockObstacle, secondObstacle]
        };

        await service.refreshSection(sectionWithObstacles);

        expect(mockWorkerPythonService.runTask).toHaveBeenCalledWith(Task.addObstacle,
          expect.objectContaining({ obstacles: [mockObstacle, secondObstacle] })
        );
      });

      it('should call Task.calculateObstaclesDistances after adding obstacles', async () => {
        const sectionWithObstacles: Section = { ...mockSection, obstacles: [mockObstacle] };

        await service.refreshSection(sectionWithObstacles);

        expect(mockWorkerPythonService.runTask).toHaveBeenCalledWith(
          Task.calculateObstaclesDistances,
          expect.objectContaining({ startSupport: expect.any(Number), endSupport: expect.any(Number) })
        );
      });

      it('should update distances signal from calculateObstaclesDistances result', async () => {
        const sectionWithObstacles: Section = { ...mockSection, obstacles: [mockObstacle] };

        await service.refreshSection(sectionWithObstacles);

        expect(obstacleStateService.distances()).toEqual([mockDistance]);
      });

      it('should update litData with the obstacle result merged into section data', async () => {
        const sectionWithObstacles: Section = { ...mockSection, obstacles: [mockObstacle] };

        await service.refreshSection(sectionWithObstacles);

        expect(service.litData()).toEqual({ ...mockGetSectionOutput, obstacles: mockObstacleOutput.obstacles });
      });

      it('should not call Task.addObstacle when getLit returns an error', async () => {
        mockWorkerPythonService.runTask.mockImplementation((task: unknown) => {
          if (task === Task.getLit) {
            return Promise.resolve({ result: mockGetSectionWithBaseOutput, error: TaskError.CALCULATION_ERROR });
          }
          return Promise.resolve({ result: null, error: null });
        });
        const sectionWithObstacles: Section = { ...mockSection, obstacles: [mockObstacle] };

        await service.refreshSection(sectionWithObstacles);

        expect(mockWorkerPythonService.runTask).not.toHaveBeenCalledWith(Task.addObstacle, expect.anything());
      });

      it('should clear distances and distanceType when getLit returns an error', async () => {
        obstacleStateService.distances.set([mockDistance]);
        obstacleStateService.distanceType.set('oblique');
        mockWorkerPythonService.runTask.mockImplementation((task: unknown) => {
          if (task === Task.getLit) {
            return Promise.resolve({ result: mockGetSectionWithBaseOutput, error: TaskError.CALCULATION_ERROR });
          }
          return Promise.resolve({ result: null, error: null });
        });
        const sectionWithObstacles: Section = { ...mockSection, obstacles: [mockObstacle] };

        await service.refreshSection(sectionWithObstacles);

        expect(obstacleStateService.distances()).toEqual([]);
        expect(obstacleStateService.distanceType()).toBeNull();
      });

      it('should not call Task.addObstacle when section has no obstacles', async () => {
        await service.refreshSection(mockSection);

        expect(mockWorkerPythonService.runTask).not.toHaveBeenCalledWith(Task.addObstacle, expect.anything());
        expect(mockWorkerPythonService.runTask).not.toHaveBeenCalledWith(
          Task.calculateObstaclesDistances,
          expect.anything()
        );
      });

      it('should clear distances when section has no obstacles', async () => {
        obstacleStateService.distances.set([mockDistance]);

        await service.refreshSection(mockSection);

        expect(obstacleStateService.distances()).toEqual([]);
      });
    });
  });

  describe('purgePlot', () => {
    beforeEach(() => {
      // Mock document.getElementById
      document.getElementById = vi.fn();
    });

    it('should call plotly.purge when plotly-output element exists', () => {
      (document.getElementById as vi.Mock).mockReturnValue({
        id: 'plotly-output'
      });

      service.purgePlot();

      expect(plotly.purge).toHaveBeenCalledWith('plotly-output');
    });

    it('should clear litData', () => {
      service.litData.set(mockGetSectionOutput);
      (document.getElementById as vi.Mock).mockReturnValue({
        id: 'plotly-output'
      });

      service.purgePlot();

      expect(service.litData()).toBeNull();
    });

    it('should clear baseLitData', () => {
      service.baseLitData.set(mockGetSectionOutput);
      (document.getElementById as vi.Mock).mockReturnValue({
        id: 'plotly-output'
      });

      service.purgePlot();

      expect(service.baseLitData()).toBeNull();
    });

    it('should clear all state when plotly-output exists', () => {
      service.litData.set(mockGetSectionOutput);
      service.baseLitData.set(mockGetSectionOutput);
      service.error.set(TaskError.CALCULATION_ERROR);
      service.loading.set(true);
      (document.getElementById as vi.Mock).mockReturnValue({
        id: 'plotly-output'
      });

      service.purgePlot();

      expect(plotly.purge).toHaveBeenCalledWith('plotly-output');
      expect(service.litData()).toBeNull();
      expect(service.baseLitData()).toBeNull();
      expect(service.error()).toBeNull();
      expect(service.loading()).toBe(false);
    });
  });

  describe('resetAll', () => {
    beforeEach(() => {
      // Mock document.getElementById
      document.getElementById = vi.fn();
    });

    it('should call purgePlot', () => {
      (document.getElementById as vi.Mock).mockReturnValue({
        id: 'plotly-output'
      });

      service.resetAll();

      expect(plotly.purge).toHaveBeenCalledWith('plotly-output');
    });

    it('should reset error to null', () => {
      service.error.set(TaskError.CALCULATION_ERROR);
      (document.getElementById as vi.Mock).mockReturnValue({
        id: 'plotly-output'
      });

      service.resetAll();

      expect(service.error()).toBeNull();
    });

    it('should reset litData to null', () => {
      service.litData.set(mockGetSectionOutput);
      (document.getElementById as vi.Mock).mockReturnValue({
        id: 'plotly-output'
      });

      service.resetAll();

      expect(service.litData()).toBeNull();
    });

    it('should reset baseLitData to null', () => {
      service.baseLitData.set(mockGetSectionOutput);
      (document.getElementById as vi.Mock).mockReturnValue({
        id: 'plotly-output'
      });

      service.resetAll();

      expect(service.baseLitData()).toBeNull();
    });

    it('should set loading to false', () => {
      service.loading.set(true);
      (document.getElementById as vi.Mock).mockReturnValue({
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
      (document.getElementById as vi.Mock).mockReturnValue({
        id: 'plotly-output'
      });

      service.resetAll();

      const plotOptions = plotOptionsService.plotOptions();
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
      plotOptionsService.camera.set(mockCamera);
      (document.getElementById as vi.Mock).mockReturnValue({
        id: 'plotly-output'
      });

      service.resetAll();

      expect(plotOptionsService.camera()).toBeNull();
    });

    it('should reset section to null', () => {
      spanService.section.set(mockSection);
      (document.getElementById as vi.Mock).mockReturnValue({
        id: 'plotly-output'
      });

      service.resetAll();

      expect(spanService.section()).toBeNull();
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
      (document.getElementById as vi.Mock).mockReturnValue({
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
      plotOptionsService.camera.set(mockCamera);
      spanService.section.set(mockSection);
      service.study.set(mockStudy);

      (document.getElementById as vi.Mock).mockReturnValue({
        id: 'plotly-output'
      });

      service.resetAll();

      // Verify all state is reset
      expect(plotly.purge).toHaveBeenCalledWith('plotly-output');
      expect(service.error()).toBeNull();
      expect(service.litData()).toBeNull();
      expect(service.loading()).toBe(false);
      expect(plotOptionsService.camera()).toBeNull();
      expect(spanService.section()).toBeNull();
      expect(service.study()).toBeNull();

      const plotOptions = plotOptionsService.plotOptions();
      expect(plotOptions.view).toBe('3d');
      expect(plotOptions.side).toBe('profile');
      expect(plotOptions.startSupport).toBe(0);
      expect(plotOptions.endSupport).toBe(1);
      expect(plotOptions.invert).toBe(false);
    });

    it('should handle reset when plotly-output element does not exist', () => {
      (document.getElementById as vi.Mock).mockReturnValue(null);

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

        expect(checkIfProjectionNeedRefresh(oldOptions, newOptions, true)).toBe(false);
      });

      it('should return false even when all options are identical', () => {
        const options: PlotOptions = { ...baseOptions };
        expect(checkIfProjectionNeedRefresh(options, options, true)).toBe(false);
      });
    });

    describe('when loading is false', () => {
      describe('view or side changes', () => {
        it('should return true when view changes from 3d to 2d', () => {
          const oldOptions: PlotOptions = { ...baseOptions, view: '3d' };
          const newOptions: PlotOptions = { ...baseOptions, view: '2d' };

          expect(checkIfProjectionNeedRefresh(oldOptions, newOptions, false)).toBe(true);
        });

        it('should return true when view changes from 2d to 3d', () => {
          const oldOptions: PlotOptions = { ...baseOptions, view: '2d' };
          const newOptions: PlotOptions = { ...baseOptions, view: '3d' };

          expect(checkIfProjectionNeedRefresh(oldOptions, newOptions, false)).toBe(true);
        });

        it('should return true when side changes from profile to face', () => {
          const oldOptions: PlotOptions = { ...baseOptions, side: 'profile' };
          const newOptions: PlotOptions = { ...baseOptions, side: 'face' };

          expect(checkIfProjectionNeedRefresh(oldOptions, newOptions, false)).toBe(true);
        });

        it('should return true when side changes from face to profile', () => {
          const oldOptions: PlotOptions = { ...baseOptions, side: 'face' };
          const newOptions: PlotOptions = { ...baseOptions, side: 'profile' };

          expect(checkIfProjectionNeedRefresh(oldOptions, newOptions, false)).toBe(true);
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

          expect(checkIfProjectionNeedRefresh(oldOptions, newOptions, false)).toBe(true);
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

          expect(checkIfProjectionNeedRefresh(oldOptions, newOptions, false)).toBe(false);
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

          expect(checkIfProjectionNeedRefresh(oldOptions, newOptions, false)).toBe(false);
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

          expect(checkIfProjectionNeedRefresh(oldOptions, newOptions, false)).toBe(false);
        });

        it('should return false when view is 3d and all options are identical', () => {
          const options: PlotOptions = { ...baseOptions, view: '3d' };
          expect(checkIfProjectionNeedRefresh(options, options, false)).toBe(false);
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

          expect(checkIfProjectionNeedRefresh(oldOptions, newOptions, false)).toBe(true);
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

          expect(checkIfProjectionNeedRefresh(oldOptions, newOptions, false)).toBe(true);
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

          expect(checkIfProjectionNeedRefresh(oldOptions, newOptions, false)).toBe(true);
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

          expect(checkIfProjectionNeedRefresh(oldOptions, newOptions, false)).toBe(false);
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

          expect(checkIfProjectionNeedRefresh(oldOptions, newOptions, false)).toBe(false);
        });

        it('should return false when all options are identical', () => {
          const options: PlotOptions = { ...baseOptions, view: '2d' };
          expect(checkIfProjectionNeedRefresh(options, options, false)).toBe(false);
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

        expect(checkIfProjectionNeedRefresh(oldOptions, newOptions, false)).toBe(true);
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

        expect(checkIfProjectionNeedRefresh(oldOptions, newOptions, false)).toBe(true);
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

        expect(checkIfProjectionNeedRefresh(oldOptions, newOptions, false)).toBe(true);
      });
    });
  });

  describe('modifySection', () => {
    it('should return undefined when study is null', async () => {
      service.study.set(null);
      spanService.section.set(mockSection);
      const result = await service.modifySection({ name: 'Updated' });
      expect(result).toBeUndefined();
    });

    it('should return undefined when section is null', async () => {
      service.study.set({
        uuid: 'study-1',
        author_email: '',
        title: '',
        description: '',
        shareable: false,
        created_at_offline: '',
        updated_at_offline: '',
        saved: true,
        sections: []
      });
      spanService.section.set(null);
      const result = await service.modifySection({ name: 'Updated' });
      expect(result).toBeUndefined();
    });
  });

  describe('refreshProjection', () => {
    it('should call workerPythonService with correct task params', async () => {
      service.plotOptionsChange({ view: '2d', startSupport: 2, endSupport: 5 });
      mockWorkerPythonService.runTask.mockResolvedValue({
        result: { sectionOutput: { current: mockGetSectionOutput, base: mockGetSectionOutput }, obstacles: [], distances: [] },
        error: null
      });

      await service.refreshProjection();

      expect(mockWorkerPythonService.runTask).toHaveBeenCalledWith(Task.refreshProjection, {
        startSupport: 2,
        endSupport: 5,
        view: '2d'
      });
    });

    it('should set loading to false after completion', async () => {
      mockWorkerPythonService.runTask.mockResolvedValue({ result: null, error: TaskError.CALCULATION_ERROR });
      await service.refreshProjection();
      expect(service.loading()).toBe(false);
      expect(service.error()).toBe(TaskError.CALCULATION_ERROR);
    });

    it('should set litData directly from sectionOutput.current', async () => {
      mockWorkerPythonService.runTask.mockResolvedValue({
        result: { sectionOutput: { current: mockGetSectionOutput, base: mockGetSectionOutput }, obstacles: [], distances: [] },
        error: null
      });

      await service.refreshProjection();

      expect(service.litData()).toEqual(mockGetSectionOutput);
    });

    it('should set distances from result', async () => {
      const mockDist: Distance = {
        obstacleUuid: 'x',
        points: [
          {
            pointIndex: 0,
            linePoint: [0, 0, 0],
            virtualPointHorizontal: [0, 0, 0],
            virtualPointVertical: [0, 0, 0],
            distanceDiagonal: 1,
            distanceHorizontal: 2,
            distanceVertical: 3
          }
        ]
      };
      mockWorkerPythonService.runTask.mockResolvedValue({
        result: { sectionOutput: { current: mockGetSectionOutput, base: mockGetSectionOutput }, obstacles: [], distances: [mockDist] },
        error: null
      });

      await service.refreshProjection();

      expect(obstacleStateService.distances()).toEqual([mockDist]);
    });

    it('should include obstacle coordinates returned by Python in litData', async () => {
      const obstacleCoords = [{ uuid: 'obstacle-uuid-1', points: [[100, 20, 5]] as [number, number, number][] }];
      mockWorkerPythonService.runTask.mockResolvedValue({
        result: { sectionOutput: { current: mockGetSectionOutput, base: mockGetSectionOutput }, obstacles: obstacleCoords, distances: [] },
        error: null
      });

      await service.refreshProjection();

      expect(service.litData()).toEqual({ ...mockGetSectionOutput, obstacles: obstacleCoords });
      expect(service.litData()?.obstacles).toEqual(obstacleCoords);
    });

    it('should NOT call Task.addObstacle — obstacle coordinates come from sectionOutput', async () => {
      mockWorkerPythonService.runTask.mockResolvedValue({
        result: { sectionOutput: { current: mockGetSectionOutput, base: mockGetSectionOutput }, obstacles: [], distances: [] },
        error: null
      });

      await service.refreshProjection();

      expect(mockWorkerPythonService.runTask).not.toHaveBeenCalledWith(Task.addObstacle, expect.anything());
    });
  });
});
