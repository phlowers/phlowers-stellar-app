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
  Distance,
  DistancePoint,
  PythonErrorCode
} from '@services/worker_python/tasks/types';
import { CatalogCable, Charge, Section, Study } from '@shared/domain';
import { defaultClimaticCharge } from '@shared/domain/helpers/climate.helpers';
import * as plotly from 'plotly.js-dist-min';
import { PlotOptions, PLOT_ID } from '@shared/types/plot.types';
import { Camera } from 'plotly.js-dist-min';
import { BehaviorSubject } from 'rxjs';
import { ObstacleStateService } from '@services/obstacle-state/obstacle-state.service';
import { NotificationService } from '@core/services/notification/notification.service';
import { LoggerService } from '@core/services/logger/logger.service';
import { RrtsCutStrandsData } from '@shared/domain/models/section.model';
import { isEqual } from 'lodash';

import { TranslocoTestingModule } from '@jsverse/transloco';
// Mock plotly
vi.mock('plotly.js-dist-min', () => ({
  purge: vi.fn()
}));

interface MockWorkerPythonService {
  ready: boolean;
  ready$: ReturnType<BehaviorSubject<boolean>['asObservable']>;
  runTask: vi.Mock;
  runTaskWithTimeout: vi.Mock;
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
    coords: {
      supports: [[[1, 2, 3]]],
      insulators: [[[4, 5, 6]]],
      spans: [[[7, 8, 9]]],
      obstacles: null,
      distances: null,
      loads: {}
    },
    output_parameters: {
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
      utilization_rate: [],
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
    }
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
    regional_team_id: 'GMR-001',
    maintenance_team_id: 'EEL-001',
    maintenance_center_id: 'CM-001',
    link_idr: 'Link 1',
    link_adr: 'Link 1',
    lit_idr: 'LIT-001',
    lit_adr: 'LIT-001',
    branch_adr: 'Branch 1',
    branch_idr: 'Branch 1',
    voltage_idr: '400kV',
    voltage_adr: undefined,
    cm_designation: undefined,
    gmr_designation: undefined,
    eel_designation: undefined,
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
        towerModel: 'Tower Model',
        spanAzimut: null,
        footLongitude: null,
        footLatitude: null
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
        towerModel: 'Tower Model',
        spanAzimut: null,
        footLongitude: null,
        footLatitude: null
      }
    ],
    obstacles: [],
    initial_conditions: [
      {
        uuid: 'ic-uuid-1',
        name: 'IC 1',
        base_parameters: 1000,
        base_temperature: 15,
        cable_pretension: 0,
        min_temperature: -5,
        max_wind_pressure: 480,
        max_frost_width: 10
      }
    ],
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
    start_azimuth: null,
    mean_reprojection_diff_meters: null
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
      runTaskWithTimeout: vi.fn(),
      setReady: (value: boolean) => {
        readyValue = value;
        readySubject.next(value);
      }
    };

    mockCablesService = {
      getCable: vi.fn()
    } as unknown as vi.Mocked<CablesService>;

    TestBed.configureTestingModule({
      imports: [
        TranslocoTestingModule.forRoot({
          langs: { en: {} },
          translocoConfig: { availableLangs: ['en'], defaultLang: 'en' },
          preloadLangs: true
        })
      ],
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

  describe('free positioning view restore', () => {
    const savedOptions: PlotOptions = { view: '3d', side: 'face', startSupport: 2, endSupport: 6, invert: true };
    const fpOptions: PlotOptions = { view: '2d', side: 'profile', startSupport: 3, endSupport: 4, invert: false };

    it('should restore the saved plot options when free positioning is switched off', () => {
      plotOptionsService.plotOptions.set(savedOptions);
      plotOptionsService.setFreePositioningMode(true, 'floor');
      // Simulate the forced 2D single-span reprojection applied while the mode is on.
      plotOptionsService.plotOptions.set(fpOptions);

      plotOptionsService.setFreePositioningMode(false, 'floor');
      TestBed.flushEffects();

      expect(plotOptionsService.plotOptions()).toEqual(savedOptions);
      expect(plotOptionsService.freePositioningSavedView()).toBeNull();
    });

    it('should restore the saved camera through pendingCameraRestore', () => {
      const cam: Camera = { eye: { x: 1, y: 1, z: 1 }, center: { x: 0, y: 0, z: 0 }, up: { x: 0, y: 0, z: 1 } };
      const originalGetElementById = document.getElementById.bind(document);
      document.getElementById = vi.fn().mockReturnValue({ _fullLayout: { scene: { camera: cam } } });
      try {
        plotOptionsService.plotOptions.set(savedOptions);
        plotOptionsService.setFreePositioningMode(true, 'floor');
        plotOptionsService.plotOptions.set(fpOptions);

        plotOptionsService.setFreePositioningMode(false, 'floor');
        TestBed.flushEffects();

        expect(plotOptionsService.pendingCameraRestore()).toEqual(cam);
      } finally {
        document.getElementById = originalGetElementById;
      }
    });

    it('should not set pendingCameraRestore when the previous view had no camera', () => {
      document.getElementById = vi.fn().mockReturnValue(null);
      plotOptionsService.plotOptions.set(savedOptions);
      plotOptionsService.setFreePositioningMode(true, 'floor');

      plotOptionsService.setFreePositioningMode(false, 'floor');
      TestBed.flushEffects();

      expect(plotOptionsService.pendingCameraRestore()).toBeNull();
    });

    it('should not restore the saved view while free positioning is still on', () => {
      plotOptionsService.plotOptions.set(savedOptions);
      plotOptionsService.setFreePositioningMode(true, 'floor');
      plotOptionsService.plotOptions.set(fpOptions);

      TestBed.flushEffects();

      expect(plotOptionsService.plotOptions()).toEqual(fpOptions);
      expect(plotOptionsService.freePositioningSavedView()?.plotOptions).toEqual(savedOptions);
    });
  });

  describe('initSectionStudio', () => {
    it('should clear error and litData at start', async () => {
      service.error.set(TaskError.CALCULATION_ERROR);
      service.litData.set(mockGetSectionOutput);

      mockWorkerPythonService.setReady?.(true);
      mockCablesService.getCable.mockResolvedValue(mockCable);
      mockWorkerPythonService.runTask.mockImplementation((task: unknown) => {
        if (task === Task.initLit) {
          return Promise.resolve({ result: { success: true }, error: null });
        }
        if (task === Task.refreshProjection) {
          return Promise.resolve({
            result: { sectionOutput: mockGetSectionWithBaseOutput, obstacles: [], distances: [] },
            error: null
          });
        }
        return Promise.resolve({ result: null, error: null });
      });

      await service.initSectionStudio(mockSection);

      expect(service.error()).toBeNull();
      expect(service.litData()).toEqual(mockGetSectionOutput);
    });

    it('should set error when workerPythonService is not ready', async () => {
      mockWorkerPythonService.setReady?.(false);

      await service.initSectionStudio(mockSection);

      expect(service.error()).toBe(DataError.NO_CABLE_FOUND);
      expect(service.loading()).toBe(false);
      expect(mockWorkerPythonService.runTask).not.toHaveBeenCalled();
    });

    it('should set error when section is null', async () => {
      mockWorkerPythonService.setReady?.(true);

      await service.initSectionStudio(null as unknown as Section);

      expect(service.error()).toBe(DataError.NO_CABLE_FOUND);
      expect(service.loading()).toBe(false);
    });

    it('should set error when section has no cable_name', async () => {
      mockWorkerPythonService.setReady?.(true);
      const sectionWithoutCable = { ...mockSection, cable_name: undefined };

      await service.initSectionStudio(sectionWithoutCable);

      expect(service.error()).toBe(DataError.NO_CABLE_FOUND);
      expect(service.loading()).toBe(false);
    });

    it('should call getCable with section cable_name', async () => {
      mockWorkerPythonService.setReady?.(true);
      mockCablesService.getCable.mockResolvedValue(mockCable);
      mockWorkerPythonService.runTask.mockImplementation((task: unknown) => {
        if (task === Task.initLit) {
          return Promise.resolve({ result: { success: true }, error: null });
        }
        if (task === Task.refreshProjection) {
          return Promise.resolve({
            result: { sectionOutput: mockGetSectionWithBaseOutput, obstacles: [], distances: [] },
            error: null
          });
        }
        return Promise.resolve({ result: null, error: null });
      });

      await service.initSectionStudio(mockSection);

      expect(mockCablesService.getCable).toHaveBeenCalledWith('Test Cable');
    });

    it('should call initLit then refreshProjection', async () => {
      mockWorkerPythonService.setReady?.(true);
      mockCablesService.getCable.mockResolvedValue(mockCable);
      mockWorkerPythonService.runTask.mockImplementation((task: unknown) => {
        if (task === Task.initLit) {
          return Promise.resolve({ result: { success: true }, error: null });
        }
        if (task === Task.refreshProjection) {
          return Promise.resolve({
            result: { sectionOutput: mockGetSectionWithBaseOutput, obstacles: [], distances: [] },
            error: null
          });
        }
        return Promise.resolve({ result: null, error: null });
      });

      await service.initSectionStudio(mockSection);

      expect(mockWorkerPythonService.runTask).toHaveBeenCalledWith(Task.initLit, {
        section: mockSection,
        cable: mockCable
      });
      expect(mockWorkerPythonService.runTask).toHaveBeenCalledWith(
        Task.refreshProjection,
        expect.objectContaining({
          startSupport: expect.any(Number),
          endSupport: expect.any(Number),
          view: expect.any(String)
        })
      );
    });

    it('should set error when initLit task fails', async () => {
      const taskError = TaskError.CALCULATION_ERROR;
      mockWorkerPythonService.setReady?.(true);
      mockCablesService.getCable.mockResolvedValue(mockCable);
      mockWorkerPythonService.runTask.mockImplementation((task: unknown) => {
        if (task === Task.initLit) {
          return Promise.resolve({ result: null, error: taskError });
        }
        return Promise.resolve({ result: null, error: null });
      });

      await service.initSectionStudio(mockSection);

      expect(service.error()).toBe(taskError);
    });

    it('should set loading to true at start', async () => {
      let loadingState = false;
      mockWorkerPythonService.setReady?.(true);
      mockCablesService.getCable.mockResolvedValue(mockCable);
      mockWorkerPythonService.runTask.mockImplementation((task: unknown) => {
        if (task === Task.initLit) {
          loadingState = service.loading();
          return Promise.resolve({ result: { success: true }, error: null });
        }
        if (task === Task.refreshProjection) {
          return Promise.resolve({
            result: { sectionOutput: mockGetSectionWithBaseOutput, obstacles: [], distances: [] },
            error: null
          });
        }
        return Promise.resolve({ result: null, error: null });
      });

      await service.initSectionStudio(mockSection);

      expect(loadingState).toBe(true);
    });

    it('should set loading to false after completion', async () => {
      mockWorkerPythonService.setReady?.(true);
      mockCablesService.getCable.mockResolvedValue(mockCable);
      mockWorkerPythonService.runTask.mockImplementation((task: unknown) => {
        if (task === Task.initLit) {
          return Promise.resolve({ result: { success: true }, error: null });
        }
        if (task === Task.refreshProjection) {
          return Promise.resolve({
            result: { sectionOutput: mockGetSectionWithBaseOutput, obstacles: [], distances: [] },
            error: null
          });
        }
        return Promise.resolve({ result: null, error: null });
      });

      await service.initSectionStudio(mockSection);

      expect(service.loading()).toBe(false);
    });
  });

  describe('high safety', () => {
    // A load case as created in the app: only its staff presence matters here
    const loadCase = (personnelPresence: boolean): Charge => ({
      uuid: 'charge-uuid',
      name: 'Load case 1',
      personnelPresence,
      description: '',
      data: { climate: { ...defaultClimaticCharge }, spanLoads: [], cableModifParams: [] }
    });

    const sectionWithStaff = (personnelPresence: boolean): Section => ({
      ...mockSection,
      charges: [loadCase(personnelPresence)],
      selected_charge_uuid: 'charge-uuid'
    });

    const runTasks = () => mockWorkerPythonService.runTask.mock.calls.map(([task]) => task);

    beforeEach(() => {
      mockWorkerPythonService.setReady?.(true);
      mockCablesService.getCable.mockResolvedValue(mockCable);
      mockWorkerPythonService.runTask.mockImplementation((task: unknown) => {
        if (task === Task.initLit) {
          return Promise.resolve({ result: { success: true }, error: null });
        }
        if (task === Task.refreshProjection) {
          return Promise.resolve({
            result: { sectionOutput: mockGetSectionWithBaseOutput, obstacles: [], distances: [] },
            error: null
          });
        }
        return Promise.resolve({ result: null, error: null });
      });
    });

    describe('at studio load', () => {
      it.each([true, false])(
        'should follow the staff presence on the selected charge: %s',
        async (personnelPresence) => {
          await service.initSectionStudio(sectionWithStaff(personnelPresence));

          expect(mockWorkerPythonService.runTask).toHaveBeenCalledWith(Task.setHighSafety, {
            highSafety: personnelPresence
          });
        }
      );

      it('should be on without selected charge, staff being assumed present', async () => {
        await service.initSectionStudio({ ...sectionWithStaff(false), selected_charge_uuid: null });

        expect(mockWorkerPythonService.runTask).toHaveBeenCalledWith(Task.setHighSafety, { highSafety: true });
      });

      it('should be set right after the engine study is created, before any output is calculated', async () => {
        await service.initSectionStudio(sectionWithStaff(true));

        const tasks = runTasks();
        expect(tasks.indexOf(Task.setHighSafety)).toBe(tasks.indexOf(Task.initLit) + 1);
      });

      it('should not be set when the engine study cannot be created', async () => {
        mockWorkerPythonService.runTask.mockResolvedValue({ result: null, error: TaskError.CALCULATION_ERROR });

        await service.initSectionStudio(sectionWithStaff(true));

        expect(mockWorkerPythonService.runTask).not.toHaveBeenCalledWith(Task.setHighSafety, expect.anything());
      });

      it('should use the charge selected while the engine study was being created', async () => {
        service.isStudioActive.set(true);
        mockWorkerPythonService.runTask.mockImplementation((task: unknown) => {
          if (task === Task.initLit) {
            spanService.section.set(sectionWithStaff(true));
            TestBed.flushEffects();
            return Promise.resolve({ result: { success: true }, error: null });
          }
          return Promise.resolve({ result: null, error: null });
        });

        await service.initSectionStudio(sectionWithStaff(false));

        const highSafetyCalls = mockWorkerPythonService.runTask.mock.calls.filter(
          ([task]) => task === Task.setHighSafety
        );
        expect(highSafetyCalls).toEqual([[Task.setHighSafety, { highSafety: true }]]);
      });

      it('should follow a charge selected while its high safety was being applied', async () => {
        service.isStudioActive.set(true);
        mockWorkerPythonService.runTask.mockImplementation((task: unknown) => {
          if (task === Task.initLit) {
            return Promise.resolve({ result: { success: true }, error: null });
          }
          if (task === Task.setHighSafety && runTasks().filter((t) => t === Task.setHighSafety).length === 1) {
            spanService.section.set(sectionWithStaff(true));
            TestBed.flushEffects();
          }
          return Promise.resolve({ result: null, error: null });
        });

        await service.initSectionStudio(sectionWithStaff(false));
        await new Promise((resolve) => setTimeout(resolve));

        const highSafetyCalls = mockWorkerPythonService.runTask.mock.calls.filter(
          ([task]) => task === Task.setHighSafety
        );
        expect(highSafetyCalls.at(-1)).toEqual([Task.setHighSafety, { highSafety: true }]);
      });
    });

    describe('when the selected charge changes in the studio', () => {
      // Selection, creation, duplication, deletion and edition of charges all reach the studio as a reloaded section
      const reloadSection = async (section: Section) => {
        spanService.section.set(section);
        TestBed.flushEffects();
        await new Promise((resolve) => setTimeout(resolve));
      };

      beforeEach(async () => {
        await service.initSectionStudio(sectionWithStaff(false));
        service.isStudioActive.set(true);
        TestBed.flushEffects();
        mockWorkerPythonService.runTask.mockClear();
      });

      it('should apply its staff presence, then refresh the outputs depending on it', async () => {
        await reloadSection(sectionWithStaff(true));

        expect(mockWorkerPythonService.runTask).toHaveBeenCalledWith(Task.setHighSafety, { highSafety: true });
        expect(runTasks().slice(0, 2)).toEqual([Task.setHighSafety, Task.refreshProjection]);
      });

      it('should turn it on when the selected charge is deleted, staff being assumed present', async () => {
        await reloadSection({ ...sectionWithStaff(false), selected_charge_uuid: null });

        expect(mockWorkerPythonService.runTask).toHaveBeenCalledWith(Task.setHighSafety, { highSafety: true });
      });

      it('should do nothing when the engine study already has it', async () => {
        await reloadSection({ ...sectionWithStaff(false), name: 'renamed' });

        expect(mockWorkerPythonService.runTask).not.toHaveBeenCalled();
      });

      it('should do nothing outside the studio, where no engine study belongs to the edited section', async () => {
        service.isStudioActive.set(false);

        await reloadSection(sectionWithStaff(true));

        expect(mockWorkerPythonService.runTask).not.toHaveBeenCalled();
      });

      it('should keep the previous engine value when applying it failed', async () => {
        mockWorkerPythonService.runTask.mockResolvedValueOnce({ result: null, error: TaskError.CALCULATION_ERROR });
        await reloadSection(sectionWithStaff(true));
        mockWorkerPythonService.runTask.mockClear();

        // The engine study kept its high safety off: no task is needed to go back to it
        await reloadSection(sectionWithStaff(false));

        expect(mockWorkerPythonService.runTask).not.toHaveBeenCalledWith(Task.setHighSafety, expect.anything());
      });

      it('should end on the last selected charge when it changes back while the previous one is being applied', async () => {
        let finishFirstRequest!: () => void;
        mockWorkerPythonService.runTask.mockImplementationOnce(
          () =>
            new Promise((resolve) => {
              finishFirstRequest = () => resolve({ result: null, error: null });
            })
        );

        spanService.section.set(sectionWithStaff(true));
        TestBed.flushEffects();
        await reloadSection(sectionWithStaff(false));
        finishFirstRequest();
        await new Promise((resolve) => setTimeout(resolve));

        const highSafetyCalls = mockWorkerPythonService.runTask.mock.calls.filter(
          ([task]) => task === Task.setHighSafety
        );
        expect(highSafetyCalls).toEqual([
          [Task.setHighSafety, { highSafety: true }],
          [Task.setHighSafety, { highSafety: false }]
        ]);
      });
    });
  });

  describe('cut strands', () => {
    const CUT = [1, 3, 0, 0, 0, 0, 0, 0];
    const OTHER_CUT = [5, 3, 0, 0, 0, 0, 0, 0];
    const NONE = [0, 0, 0, 0, 0, 0, 0, 0];

    const sectionWithCutStrands = (cutStrands: number[] | null, overrides: Partial<Section> = {}): Section => {
      const entry: RrtsCutStrandsData | null = cutStrands && {
        spanUuid: null,
        supportRef: null,
        distanceSupportRef: null,
        cutStrands,
        addMarking: false
      };
      return { ...mockSection, rrts_cut_strands: entry, ...overrides };
    };

    // Answers like the engine, rejecting the given cut strands
    const engine =
      (rejectedCutStrands: number[] | null = null) =>
      (task: unknown, inputs?: unknown) => {
        if (task === Task.initLit) {
          return Promise.resolve({ result: { success: true }, error: null, diagnostics: [] });
        }
        if (task === Task.refreshProjection) {
          return Promise.resolve({
            result: { sectionOutput: mockGetSectionWithBaseOutput, obstacles: [], distances: [] },
            error: null,
            diagnostics: []
          });
        }
        if (
          task === Task.setCutStrands &&
          isEqual((inputs as { cutStrands: number[] }).cutStrands, rejectedCutStrands)
        ) {
          return Promise.resolve({ result: null, error: TaskError.CALCULATION_ERROR, diagnostics: [] });
        }
        return Promise.resolve({ result: null, error: null, diagnostics: [] });
      };

    const runTasks = () => mockWorkerPythonService.runTask.mock.calls.map(([task]) => task);
    const engineCutStrands = () =>
      mockWorkerPythonService.runTask.mock.calls
        .filter(([task]) => task === Task.setCutStrands)
        .map(([, inputs]) => (inputs as { cutStrands: number[] }).cutStrands);

    let notificationService: NotificationService;
    let logger: LoggerService;

    beforeEach(() => {
      mockWorkerPythonService.setReady?.(true);
      mockCablesService.getCable.mockResolvedValue(mockCable);
      mockWorkerPythonService.runTask.mockImplementation(engine());
      notificationService = TestBed.inject(NotificationService);
      vi.spyOn(notificationService, 'error').mockImplementation(() => undefined);
      logger = TestBed.inject(LoggerService);
      vi.spyOn(logger, 'error').mockImplementation(() => undefined);
    });

    describe('at studio load', () => {
      it('should apply the saved ones right after high safety, before any output is calculated', async () => {
        await service.initSectionStudio(sectionWithCutStrands(CUT));

        const tasks = runTasks();
        expect(engineCutStrands()).toEqual([CUT]);
        expect(tasks.indexOf(Task.setCutStrands)).toBe(tasks.indexOf(Task.setHighSafety) + 1);
        expect(tasks.indexOf(Task.setCutStrands)).toBeLessThan(tasks.indexOf(Task.refreshProjection));
      });

      it('should flag the outputs as accounting for a cut strand', async () => {
        await service.initSectionStudio(sectionWithCutStrands(CUT));

        expect(service.isCutStrandApplied()).toBe(true);
      });

      it.each([
        ['without saved entry', null],
        ['with an entry saved at 0 on every layer', NONE]
      ])('should leave the new engine study without cut strands %s', async (_, cutStrands) => {
        await service.initSectionStudio(sectionWithCutStrands(cutStrands));

        expect(engineCutStrands()).toEqual([]);
        expect(service.isCutStrandApplied()).toBe(false);
      });

      it('should go on without them when the engine rejects them, and report it in the studio', async () => {
        service.isStudioActive.set(true);
        mockWorkerPythonService.runTask.mockImplementation(engine(CUT));

        await service.initSectionStudio(sectionWithCutStrands(CUT));

        expect(runTasks()).toContain(Task.refreshProjection);
        expect(service.isCutStrandApplied()).toBe(false);
        expect(logger.error).toHaveBeenCalledWith(
          'Failed to apply the saved RRTS cut strands',
          TaskError.CALCULATION_ERROR
        );
        expect(notificationService.error).toHaveBeenCalledOnce();
      });

      it.each([
        ['returns an error', { result: null, error: TaskError.CALCULATION_ERROR, diagnostics: [] }],
        [
          'returns no current output',
          {
            result: { sectionOutput: { current: null, base: null }, obstacles: [], distances: [] },
            error: null,
            diagnostics: []
          }
        ]
      ])('should not flag the cut strands as applied when the projection %s', async (_, projection) => {
        const answer = engine();
        mockWorkerPythonService.runTask.mockImplementation((task: unknown, inputs?: unknown) =>
          task === Task.refreshProjection ? Promise.resolve(projection) : answer(task, inputs)
        );

        await service.initSectionStudio(sectionWithCutStrands(CUT));

        expect(engineCutStrands()).toEqual([CUT]);
        expect(service.litData()).toBeNull();
        expect(service.isCutStrandApplied()).toBe(false);
      });

      it('should handle the task rejecting like an engine error, and not cache the cut strands', async () => {
        service.isStudioActive.set(true);
        const timeout = new Error('Task setCutStrands timed out after 30000ms');
        const answer = engine();
        mockWorkerPythonService.runTask.mockImplementation((task: unknown, inputs?: unknown) =>
          task === Task.setCutStrands ? Promise.reject(timeout) : answer(task, inputs)
        );

        await service.initSectionStudio(sectionWithCutStrands(CUT));

        expect(runTasks()).toContain(Task.refreshProjection);
        expect(service.isCutStrandApplied()).toBe(false);
        expect(logger.error).toHaveBeenCalledWith('Failed to apply the saved RRTS cut strands', timeout);
        expect(notificationService.error).toHaveBeenCalledOnce();
      });

      it('should not report a failure outside the studio, in the section preview', async () => {
        mockWorkerPythonService.runTask.mockImplementation(engine(CUT));

        await service.initSectionStudio(sectionWithCutStrands(CUT));

        expect(logger.error).toHaveBeenCalledWith(
          'Failed to apply the saved RRTS cut strands',
          TaskError.CALCULATION_ERROR
        );
        expect(notificationService.error).not.toHaveBeenCalled();
      });
    });

    describe('when the saved ones change in the studio', () => {
      // The RRTS tool saves and deletes them, which reloads the section
      const reloadSection = async (section: Section) => {
        spanService.section.set(section);
        TestBed.flushEffects();
        await new Promise((resolve) => setTimeout(resolve));
      };

      beforeEach(async () => {
        await service.initSectionStudio(sectionWithCutStrands(CUT));
        service.isStudioActive.set(true);
        TestBed.flushEffects();
        mockWorkerPythonService.runTask.mockClear();
      });

      it('should apply them, then refresh the outputs depending on them', async () => {
        await reloadSection(sectionWithCutStrands(OTHER_CUT));

        expect(engineCutStrands()).toEqual([OTHER_CUT]);
        expect(runTasks().slice(0, 2)).toEqual([Task.setCutStrands, Task.refreshProjection]);
        expect(service.isCutStrandApplied()).toBe(true);
      });

      it('should report a rejected worker task as a failed sync, without throwing', async () => {
        const timeout = new Error('Task refreshProjection timed out after 30000ms');
        const answer = engine();
        mockWorkerPythonService.runTask.mockImplementation((task: unknown, inputs?: unknown) =>
          task === Task.refreshProjection ? Promise.reject(timeout) : answer(task, inputs)
        );
        spanService.section.set(sectionWithCutStrands(OTHER_CUT));

        await expect(service.syncCutStrands()).resolves.toBeUndefined();

        expect(logger.error).toHaveBeenCalledWith('Failed to apply the saved RRTS cut strands', timeout);
        expect(notificationService.error).toHaveBeenCalledOnce();
      });

      it('should clear them, and the cut flag, once the entry is deleted', async () => {
        await reloadSection(sectionWithCutStrands(null));

        expect(engineCutStrands()).toEqual([NONE]);
        expect(service.isCutStrandApplied()).toBe(false);
      });

      it('should only raise the cut flag once the outputs account for them', async () => {
        await reloadSection(sectionWithCutStrands(null));
        mockWorkerPythonService.runTask.mockClear();
        let answerProjection!: () => void;
        mockWorkerPythonService.runTask.mockImplementation((task: unknown, inputs?: unknown) =>
          task === Task.refreshProjection
            ? new Promise((resolve) => (answerProjection = () => resolve(engine()(task, inputs))))
            : engine()(task, inputs)
        );

        spanService.section.set(sectionWithCutStrands(CUT));
        TestBed.flushEffects();
        await vi.waitFor(() => expect(runTasks()).toContain(Task.refreshProjection));
        expect(service.isCutStrandApplied()).toBe(false);

        answerProjection();
        await vi.waitFor(() => expect(service.isCutStrandApplied()).toBe(true));
      });

      it('should do nothing when the section reloads with the same ones', async () => {
        const section = sectionWithCutStrands(CUT, { name: 'renamed' });

        await reloadSection({ ...section, rrts_cut_strands: { ...section.rrts_cut_strands!, addMarking: true } });

        expect(mockWorkerPythonService.runTask).not.toHaveBeenCalled();
      });

      it('should do nothing outside the studio', async () => {
        service.isStudioActive.set(false);

        await reloadSection(sectionWithCutStrands(OTHER_CUT));

        expect(mockWorkerPythonService.runTask).not.toHaveBeenCalled();
      });

      it('should not apply them to the engine study of the previous section', async () => {
        spanService.section.set(sectionWithCutStrands(OTHER_CUT, { uuid: 'section-uuid-2' }));

        await service.syncCutStrands();

        expect(mockWorkerPythonService.runTask).not.toHaveBeenCalled();
      });

      it('should leave them to the engine study of a new section, once it is created', async () => {
        await reloadSection(sectionWithCutStrands(OTHER_CUT, { uuid: 'section-uuid-2' }));

        expect(runTasks()[0]).toBe(Task.initLit);
        expect(engineCutStrands()).toEqual([OTHER_CUT]);
      });

      it('should keep the previous ones when the engine rejects them, and retry them on the next request', async () => {
        mockWorkerPythonService.runTask.mockImplementation(engine(OTHER_CUT));
        await reloadSection(sectionWithCutStrands(OTHER_CUT));
        expect(notificationService.error).toHaveBeenCalledOnce();
        expect(runTasks()).not.toContain(Task.refreshProjection);

        mockWorkerPythonService.runTask.mockImplementation(engine());
        mockWorkerPythonService.runTask.mockClear();
        await service.syncCutStrands();

        expect(engineCutStrands()).toEqual([OTHER_CUT]);
        expect(runTasks()).toContain(Task.refreshProjection);
      });

      it('should not refresh the outputs once the studio is left while they are being applied', async () => {
        let answerCutStrands!: () => void;
        mockWorkerPythonService.runTask.mockImplementationOnce(
          () =>
            new Promise((resolve) => (answerCutStrands = () => resolve({ result: null, error: null, diagnostics: [] })))
        );
        spanService.section.set(sectionWithCutStrands(OTHER_CUT));
        TestBed.flushEffects();

        service.resetAll();
        answerCutStrands();
        await new Promise((resolve) => setTimeout(resolve));

        expect(runTasks()).not.toContain(Task.refreshProjection);
        expect(service.litData()).toBeNull();
      });

      it('should resolve once the outputs account for them, for the RRTS tool to await', async () => {
        spanService.section.set(sectionWithCutStrands(OTHER_CUT));

        await service.syncCutStrands();

        expect(runTasks()).toEqual(expect.arrayContaining([Task.setCutStrands, Task.refreshProjection]));
        expect(service.isCutStrandApplied()).toBe(true);
        mockWorkerPythonService.runTask.mockClear();
        TestBed.flushEffects();
        expect(mockWorkerPythonService.runTask).not.toHaveBeenCalled();
      });
    });

    describe('after an RRTS calculation with other cut strands', () => {
      beforeEach(async () => {
        await service.initSectionStudio(sectionWithCutStrands(CUT));
        service.isStudioActive.set(true);
        TestBed.flushEffects();
        mockWorkerPythonService.runTask.mockClear();
      });

      it('should give the engine study the saved ones back, the outputs already accounting for them', async () => {
        await service.restoreCutStrands(OTHER_CUT);

        expect(engineCutStrands()).toEqual([CUT]);
        expect(runTasks()).not.toContain(Task.refreshProjection);
      });

      it('should give them back in the preview of a section being edited too', async () => {
        service.isStudioActive.set(false);

        await service.restoreCutStrands(OTHER_CUT);

        expect(engineCutStrands()).toEqual([CUT]);
      });

      it('should leave the engine study alone after a calculation with the saved ones', async () => {
        await service.restoreCutStrands([...CUT]);

        expect(mockWorkerPythonService.runTask).not.toHaveBeenCalled();
      });

      it('should refresh the outputs when they were calculated without the saved ones', async () => {
        // Applying the saved ones failed: the outputs still account for the previous ones
        mockWorkerPythonService.runTask.mockImplementation(engine(OTHER_CUT));
        spanService.section.set(sectionWithCutStrands(OTHER_CUT));
        TestBed.flushEffects();
        await new Promise((resolve) => setTimeout(resolve));
        mockWorkerPythonService.runTask.mockImplementation(engine());
        mockWorkerPythonService.runTask.mockClear();

        await service.restoreCutStrands([2, 0, 0, 0, 0, 0, 0, 0]);

        expect(engineCutStrands()).toEqual([OTHER_CUT]);
        expect(runTasks()).toContain(Task.refreshProjection);
      });

      it('should catch up on the outputs once the engine study holds the saved ones', async () => {
        // Giving the saved ones back failed: the engine study kept the calculated ones
        mockWorkerPythonService.runTask.mockImplementation(engine(CUT));
        await service.restoreCutStrands(OTHER_CUT);
        mockWorkerPythonService.runTask.mockImplementation(engine());
        mockWorkerPythonService.runTask.mockClear();

        // Saving the calculated ones needs no engine call, only outputs that account for them
        spanService.section.set(sectionWithCutStrands(OTHER_CUT));
        await service.syncCutStrands();

        expect(engineCutStrands()).toEqual([]);
        expect(runTasks()).toContain(Task.refreshProjection);
      });

      it('should do nothing without engine study', async () => {
        service.resetAll();
        mockWorkerPythonService.runTask.mockClear();

        await service.restoreCutStrands(OTHER_CUT);

        expect(mockWorkerPythonService.runTask).not.toHaveBeenCalled();
      });
    });
  });

  describe('refreshProjection', () => {
    beforeEach(() => {
      mockWorkerPythonService.runTask.mockImplementation((task: unknown) => {
        if (task === Task.refreshProjection) {
          return Promise.resolve({
            result: { sectionOutput: mockGetSectionWithBaseOutput, obstacles: [], distances: [] },
            error: null
          });
        }
        return Promise.resolve({ result: null, error: null });
      });
    });

    it('should delegate to refreshProjection', async () => {
      await service.refreshProjection();

      expect(mockWorkerPythonService.runTask).toHaveBeenCalledWith(
        Task.refreshProjection,
        expect.objectContaining({
          startSupport: expect.any(Number),
          endSupport: expect.any(Number),
          view: expect.any(String)
        })
      );
    });

    it('should set litData with result when successful', async () => {
      await service.refreshProjection();

      expect(service.litData()).toEqual(mockGetSectionOutput);
    });

    it('should set loading to false after completion', async () => {
      await service.refreshProjection();

      expect(service.loading()).toBe(false);
    });

    it('should drop the intersection warning raised for a floor, but keep an obstacle one', async () => {
      // A floor's end points sit on the supports, where the engine's distance plane finds no cable:
      // it warns for every saved floor whatever its clearance, so the toast is pure noise there.
      const floorWarning = {
        code: PythonErrorCode.NoIntersectionPlaneWarning,
        severity: 'warning' as const,
        origin: 'warning' as const,
        rawText: "NoIntersectionPlaneWarning: No intersection found between obstacle 'floor-uuid' (point index 0)"
      };
      const obstacleWarning = { ...floorWarning, rawText: 'NoIntersectionPlaneWarning: obstacle obs-uuid point 1' };
      spanService.section.set({
        ...mockSection,
        floors: [{ uuid: 'floor-uuid', supportUuid: 'sup-0', referenceSupport: 'LEFT', points: [] }]
      } as unknown as Section);
      mockWorkerPythonService.runTask.mockResolvedValue({
        result: { sectionOutput: mockGetSectionWithBaseOutput, obstacles: [], distances: [] },
        error: null,
        diagnostics: [floorWarning, obstacleWarning]
      });

      await service.refreshProjection();

      expect(service.diagnostics()).toEqual([obstacleWarning]);
    });

    it("should complete a floor's distances with the end points the engine skipped", async () => {
      spanService.section.set({
        ...mockSection,
        supports: [{ uuid: 'sup-0' }, { uuid: 'sup-1' }],
        floors: [{ uuid: 'floor-uuid', supportUuid: 'sup-0', referenceSupport: 'LEFT', points: [] }]
      } as unknown as Section);
      const middlePoint = { pointIndex: 1, signedDistanceVertical: 5 } as DistancePoint;
      const obstacleDistance = { obstacleUuid: 'obs-uuid', points: [{ pointIndex: 0 } as DistancePoint] };
      mockWorkerPythonService.runTask.mockResolvedValue({
        result: {
          sectionOutput: {
            ...mockGetSectionWithBaseOutput,
            current: {
              ...mockGetSectionOutput,
              coords: {
                ...mockGetSectionOutput.coords,
                spans: [
                  [
                    [0, 0, 20],
                    [50, 0, 5],
                    [100, 0, 20]
                  ]
                ]
              }
            }
          },
          obstacles: [
            {
              uuid: 'floor-uuid',
              points: [
                [0, 0, 1],
                [50, 0, 0],
                [100, 0, 2]
              ]
            }
          ],
          distances: [obstacleDistance, { obstacleUuid: 'floor-uuid', points: [middlePoint] }]
        },
        error: null,
        diagnostics: []
      });

      await service.refreshProjection();

      const [obstacle, floor] = obstacleStateService.distances();
      expect(obstacle).toEqual(obstacleDistance);
      expect(floor.points.map((point) => point.pointIndex)).toEqual([0, 1, 2]);
      expect(floor.points[1]).toBe(middlePoint);
      expect(floor.points[0].signedDistanceVertical).toBe(19);
      expect(floor.points[2].signedDistanceVertical).toBe(18);
    });

    it('should update plotOptions with section supports range via initSectionStudio', async () => {
      mockWorkerPythonService.setReady?.(true);
      mockCablesService.getCable.mockResolvedValue(mockCable);
      mockWorkerPythonService.runTask.mockImplementation((task: unknown) => {
        if (task === Task.initLit) {
          return Promise.resolve({ result: { success: true }, error: null });
        }
        if (task === Task.refreshProjection) {
          return Promise.resolve({
            result: { sectionOutput: mockGetSectionWithBaseOutput, obstacles: [], distances: [] },
            error: null
          });
        }
        return Promise.resolve({ result: null, error: null });
      });

      await service.initSectionStudio(mockSection);

      const plotOptions = plotOptionsService.plotOptions();
      expect(plotOptions.startSupport).toBe(0);
      expect(plotOptions.endSupport).toBe(mockSection.supports.length - 1);
      expect(plotOptions.invert).toBe(false);
    });

    it('should preserve other plotOptions when updating support range via initSectionStudio', async () => {
      service.plotOptionsChange({ view: '2d' });
      service.plotOptionsChange({ side: 'face' });

      mockWorkerPythonService.setReady?.(true);
      mockCablesService.getCable.mockResolvedValue(mockCable);
      mockWorkerPythonService.runTask.mockImplementation((task: unknown) => {
        if (task === Task.initLit) {
          return Promise.resolve({ result: { success: true }, error: null });
        }
        if (task === Task.refreshProjection) {
          return Promise.resolve({
            result: { sectionOutput: mockGetSectionWithBaseOutput, obstacles: [], distances: [] },
            error: null
          });
        }
        return Promise.resolve({ result: null, error: null });
      });

      await service.initSectionStudio(mockSection);

      const plotOptions = plotOptionsService.plotOptions();
      expect(plotOptions.view).toBe('2d');
      expect(plotOptions.side).toBe('face');
      expect(plotOptions.startSupport).toBe(0);
      expect(plotOptions.endSupport).toBe(mockSection.supports.length - 1);
      expect(plotOptions.invert).toBe(false);
    });

    it('should handle section with empty supports array via initSectionStudio', async () => {
      const sectionWithNoSupports = { ...mockSection, supports: [] };
      mockWorkerPythonService.setReady?.(true);
      mockCablesService.getCable.mockResolvedValue(mockCable);
      mockWorkerPythonService.runTask.mockImplementation((task: unknown) => {
        if (task === Task.initLit) {
          return Promise.resolve({ result: { success: true }, error: null });
        }
        if (task === Task.refreshProjection) {
          return Promise.resolve({
            result: { sectionOutput: mockGetSectionWithBaseOutput, obstacles: [], distances: [] },
            error: null
          });
        }
        return Promise.resolve({ result: null, error: null });
      });

      await service.initSectionStudio(sectionWithNoSupports);

      const plotOptions = plotOptionsService.plotOptions();
      expect(plotOptions.startSupport).toBe(0);
      expect(plotOptions.endSupport).toBe(1);
    });
  });

  describe('purgePlot', () => {
    beforeEach(() => {
      // Mock document.getElementById
      document.getElementById = vi.fn();
    });

    it('should call plotly.purge when plotly-output element exists', () => {
      (document.getElementById as vi.Mock).mockReturnValue({
        id: PLOT_ID
      });

      service.purgePlot();

      expect(plotly.purge).toHaveBeenCalledWith(PLOT_ID);
    });

    // purgePlot runs from SectionPlotComponent.ngOnDestroy, which fires whenever the
    // studio template swaps the plot out for the loading spinner or the error image.
    // Mutating loading/error/litData here would immediately deactivate the branch that
    // triggered the swap (the spinner cancelled itself one frame after appearing on
    // studio reopen), so purgePlot must leave all state signals untouched.
    it('should not mutate state signals (loading, error, litData, baseLitData, distanceMeasuringPoints)', () => {
      service.litData.set(mockGetSectionOutput);
      service.baseLitData.set(mockGetSectionOutput);
      service.error.set(TaskError.CALCULATION_ERROR);
      service.loading.set(true);
      service.distanceMeasuringPoints.set([
        { uuid: 'measure-group-1', points: [[1, 2, 3]] as [number, number, number][] }
      ]);
      (document.getElementById as vi.Mock).mockReturnValue({
        id: PLOT_ID
      });

      service.purgePlot();

      expect(plotly.purge).toHaveBeenCalledWith(PLOT_ID);
      expect(service.litData()).toEqual(mockGetSectionOutput);
      expect(service.baseLitData()).toEqual(mockGetSectionOutput);
      expect(service.error()).toBe(TaskError.CALCULATION_ERROR);
      expect(service.loading()).toBe(true);
      expect(service.distanceMeasuringPoints()).toEqual([{ uuid: 'measure-group-1', points: [[1, 2, 3]] }]);
    });
  });

  describe('resetAll', () => {
    beforeEach(() => {
      // Mock document.getElementById
      document.getElementById = vi.fn();
    });

    it('should call purgePlot', () => {
      (document.getElementById as vi.Mock).mockReturnValue({
        id: PLOT_ID
      });

      service.resetAll();

      expect(plotly.purge).toHaveBeenCalledWith(PLOT_ID);
    });

    it('should reset error to null', () => {
      service.error.set(TaskError.CALCULATION_ERROR);
      (document.getElementById as vi.Mock).mockReturnValue({
        id: PLOT_ID
      });

      service.resetAll();

      expect(service.error()).toBeNull();
    });

    it('should reset litData to null', () => {
      service.litData.set(mockGetSectionOutput);
      (document.getElementById as vi.Mock).mockReturnValue({
        id: PLOT_ID
      });

      service.resetAll();

      expect(service.litData()).toBeNull();
    });

    it('should reset baseLitData to null', () => {
      service.baseLitData.set(mockGetSectionOutput);
      (document.getElementById as vi.Mock).mockReturnValue({
        id: PLOT_ID
      });

      service.resetAll();

      expect(service.baseLitData()).toBeNull();
    });

    it('should set loading to false', () => {
      service.loading.set(true);
      (document.getElementById as vi.Mock).mockReturnValue({
        id: PLOT_ID
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
        id: PLOT_ID
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
        id: PLOT_ID
      });

      service.resetAll();

      expect(plotOptionsService.camera()).toBeNull();
    });

    it('should reset section to null', () => {
      spanService.section.set(mockSection);
      (document.getElementById as vi.Mock).mockReturnValue({
        id: PLOT_ID
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
        id: PLOT_ID
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
        id: PLOT_ID
      });

      service.resetAll();

      // Verify all state is reset
      expect(plotly.purge).toHaveBeenCalledWith(PLOT_ID);
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

    it('should clear distanceMeasuringPoints', () => {
      (document.getElementById as vi.Mock).mockReturnValue(null);
      service.distanceMeasuringPoints.set([
        { uuid: 'measure-group-1', points: [[1, 2, 3]] as [number, number, number][] }
      ]);

      service.resetAll();

      expect(service.distanceMeasuringPoints()).toEqual([]);
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
        result: {
          sectionOutput: { current: mockGetSectionOutput, base: mockGetSectionOutput },
          obstacles: [],
          distances: []
        },
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
        result: {
          sectionOutput: { current: mockGetSectionOutput, base: mockGetSectionOutput },
          obstacles: [],
          distances: []
        },
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
            distanceVertical: 3,
            signedDistanceVertical: 3
          }
        ]
      };
      mockWorkerPythonService.runTask.mockResolvedValue({
        result: {
          sectionOutput: { current: mockGetSectionOutput, base: mockGetSectionOutput },
          obstacles: [],
          distances: [mockDist]
        },
        error: null
      });

      await service.refreshProjection();

      expect(obstacleStateService.distances()).toEqual([mockDist]);
    });

    it('should include obstacle coordinates returned by Python in litData', async () => {
      const obstacleCoords = [{ uuid: 'obstacle-uuid-1', points: [[100, 20, 5]] as [number, number, number][] }];
      mockWorkerPythonService.runTask.mockResolvedValue({
        result: {
          sectionOutput: { current: mockGetSectionOutput, base: mockGetSectionOutput },
          obstacles: obstacleCoords,
          distances: []
        },
        error: null
      });

      await service.refreshProjection();

      expect(service.litData()).toEqual({ ...mockGetSectionOutput, obstacles: obstacleCoords });
      expect(service.litData()?.obstacles).toEqual(obstacleCoords);
    });

    it('should NOT call Task.addBulkObstacles — obstacle coordinates come from sectionOutput', async () => {
      mockWorkerPythonService.runTask.mockResolvedValue({
        result: {
          sectionOutput: { current: mockGetSectionOutput, base: mockGetSectionOutput },
          obstacles: [],
          distances: []
        },
        error: null
      });

      await service.refreshProjection();

      expect(mockWorkerPythonService.runTaskWithTimeout).not.toHaveBeenCalledWith(
        Task.addBulkObstacles,
        expect.anything()
      );
    });

    it('should set distanceMeasuringPoints from the distanceMeasuringPoints returned by Python', async () => {
      const distanceMeasuringPoints = [{ uuid: 'measure-group-1', points: [[1, 2, 3]] as [number, number, number][] }];
      mockWorkerPythonService.runTask.mockResolvedValue({
        result: {
          sectionOutput: { current: mockGetSectionOutput, base: mockGetSectionOutput },
          obstacles: [],
          distances: [],
          distanceMeasuringPoints
        },
        error: null
      });

      await service.refreshProjection();

      expect(service.distanceMeasuringPoints()).toEqual(distanceMeasuringPoints);
    });

    it('should default distanceMeasuringPoints to an empty array when Python does not return any', async () => {
      mockWorkerPythonService.runTask.mockResolvedValue({
        result: {
          sectionOutput: { current: mockGetSectionOutput, base: mockGetSectionOutput },
          obstacles: [],
          distances: []
        },
        error: null
      });

      await service.refreshProjection();

      expect(service.distanceMeasuringPoints()).toEqual([]);
    });
  });
});
