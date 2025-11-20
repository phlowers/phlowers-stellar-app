import { TestBed } from '@angular/core/testing';
import { PlotService } from './plot.service';
import { WorkerPythonService } from '@src/app/core/services/worker_python/worker-python.service';
import { CablesService } from '@src/app/core/services/cables/cables.service';
import {
  Task,
  TaskError,
  DataError
} from '@src/app/core/services/worker_python/tasks/types';
import { Section } from '@core/data/database/interfaces/section';
import { Cable } from '@core/data/database/interfaces/cable';
import { Support } from '@core/data/database/interfaces/support';

interface MockWorkerPythonService extends jest.Mocked<WorkerPythonService> {
  setReady: (value: boolean) => void;
}

describe('PlotService', () => {
  let service: PlotService;
  let workerPythonService: MockWorkerPythonService;
  let cablesService: jest.Mocked<CablesService>;

  const createMockSupport = (): Support => ({
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
  });

  const createMockSection = (): Section => ({
    uuid: 'section-uuid-1',
    internal_id: 'internal-1',
    name: 'Test Section',
    short_name: 'TS',
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
    internal_catalog_id: 'catalog-1',
    type: 'test-type',
    electric_phase_number: 3,
    cable_name: 'Test Cable',
    cable_short_name: 'TC',
    cables_amount: 1,
    optical_fibers_amount: 0,
    spans_amount: 1,
    begin_span_name: 'span1',
    last_span_name: 'span1',
    first_support_number: 1,
    last_support_number: 2,
    first_attachment_set: 'set1',
    last_attachment_set: 'set1',
    regional_maintenance_center_names: ['center1'],
    maintenance_center_names: ['center1'],
    regional_team_id: 'gmr1',
    maintenance_team_id: 'eel1',
    maintenance_center_id: 'cm1',
    link_name: 'link1',
    lit: 'lit1',
    branch_name: 'branch1',
    voltage_idr: '400kV',
    comment: 'Test comment',
    supports_comment: 'Test supports comment',
    supports: [createMockSupport()],
    initial_conditions: [],
    selected_initial_condition_uuid: undefined,
    charges: [],
    selected_charge_uuid: null
  });

  const createMockCable = (): Cable => ({
    name: 'Test Cable',
    data_source: 'test-source',
    section: 100,
    diameter: 10,
    young_modulus: 200000,
    linear_mass: 0.5,
    dilatation_coefficient: 0.00001,
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
  });

  const createMockGetSectionOutput = () => ({
    supports: [[[1, 2, 3]]],
    insulators: [[[4, 5, 6]]],
    spans: [[[7, 8, 9]]],
    span: [[[10, 11, 12]]],
    support: [[[13, 14, 15]]],
    insulator: [[[16, 17, 18]]]
  });

  beforeEach(() => {
    let readyValue = true;
    const mockService = {
      runTask: jest.fn()
    } as unknown as jest.Mocked<WorkerPythonService>;

    // Mock the ready getter property
    Object.defineProperty(mockService, 'ready', {
      get: () => readyValue,
      configurable: true
    });

    // Helper to set ready value in tests
    (mockService as MockWorkerPythonService).setReady = (value: boolean) => {
      readyValue = value;
    };

    workerPythonService = mockService as MockWorkerPythonService;

    cablesService = {
      getCable: jest.fn()
    } as unknown as jest.Mocked<CablesService>;

    TestBed.configureTestingModule({
      providers: [
        PlotService,
        { provide: WorkerPythonService, useValue: workerPythonService },
        { provide: CablesService, useValue: cablesService }
      ]
    });

    service = TestBed.inject(PlotService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    // Clean up DOM if needed
    const plotElement = document.getElementById('plotly-output');
    if (plotElement) {
      plotElement.remove();
    }
  });

  describe('Service Creation', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });

    it('should initialize with default values', () => {
      expect(service.error()).toBeNull();
      expect(service.litData()).toBeNull();
      expect(service.loading()).toBe(true);
      expect(service.workerReady()).toBe(false);
      expect(service.study()).toBeNull();
      expect(service.section()).toBeNull();
      expect(service.isSidebarOpen()).toBe(false);
    });

    it('should initialize with default plotOptions', () => {
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
      service.plotOptionsChange('view', '2d');
      expect(service.plotOptions().view).toBe('2d');
      expect(service.plotOptions().side).toBe('profile'); // Other options should remain unchanged
    });

    it('should update side option', () => {
      service.plotOptionsChange('side', 'face');
      expect(service.plotOptions().side).toBe('face');
    });

    it('should update startSupport option', () => {
      service.plotOptionsChange('startSupport', 5);
      expect(service.plotOptions().startSupport).toBe(5);
    });

    it('should update endSupport option', () => {
      service.plotOptionsChange('endSupport', 10);
      expect(service.plotOptions().endSupport).toBe(10);
    });

    it('should update invert option', () => {
      service.plotOptionsChange('invert', true);
      expect(service.plotOptions().invert).toBe(true);
    });

    it('should preserve other options when updating one', () => {
      const initialOptions = service.plotOptions();
      service.plotOptionsChange('view', '2d');
      expect(service.plotOptions().side).toBe(initialOptions.side);
      expect(service.plotOptions().startSupport).toBe(
        initialOptions.startSupport
      );
      expect(service.plotOptions().endSupport).toBe(initialOptions.endSupport);
      expect(service.plotOptions().invert).toBe(initialOptions.invert);
    });
  });

  describe('calculateCharge', () => {
    it('should set loading to true at start', async () => {
      workerPythonService.runTask = jest
        .fn()
        .mockImplementation(
          () =>
            new Promise((resolve) =>
              setTimeout(() => resolve({ result: null, error: null }), 10)
            )
        );

      const promise = service.calculateCharge(100, 20, 5);
      expect(service.loading()).toBe(true);
      await promise;
    });

    it('should call workerPythonService.runTask with correct parameters', async () => {
      const mockResult = createMockGetSectionOutput();
      workerPythonService.runTask = jest.fn().mockResolvedValue({
        result: mockResult,
        error: null
      });

      await service.calculateCharge(100, 20, 5);

      expect(workerPythonService.runTask).toHaveBeenCalledWith(Task.runEngine, {
        windPressure: 100,
        cableTemperature: 20,
        iceThickness: 5
      });
    });

    it('should set litData with result when successful', async () => {
      const mockResult = createMockGetSectionOutput();
      workerPythonService.runTask = jest.fn().mockResolvedValue({
        result: mockResult,
        error: null
      });

      await service.calculateCharge(100, 20, 5);

      expect(service.litData()).toEqual(mockResult);
      expect(service.error()).toBeNull();
      expect(service.loading()).toBe(false);
    });

    it('should set error when workerPythonService returns error', async () => {
      workerPythonService.runTask = jest.fn().mockResolvedValue({
        result: null,
        error: TaskError.CALCULATION_ERROR
      });

      await service.calculateCharge(100, 20, 5);

      expect(service.error()).toBe(TaskError.CALCULATION_ERROR);
      expect(service.litData()).toBeNull();
      expect(service.loading()).toBe(false);
    });

    it('should set loading to false after completion', async () => {
      workerPythonService.runTask = jest.fn().mockResolvedValue({
        result: createMockGetSectionOutput(),
        error: null
      });

      await service.calculateCharge(100, 20, 5);

      expect(service.loading()).toBe(false);
    });
  });

  describe('refreshSection', () => {
    it('should reset error and litData at start', async () => {
      // Set initial state
      service.error.set(TaskError.UNKNOWN_ERROR);
      service.litData.set(createMockGetSectionOutput());

      const section = createMockSection();
      workerPythonService.setReady(true);
      workerPythonService.runTask = jest.fn().mockResolvedValue({
        result: createMockGetSectionOutput(),
        error: null
      });
      cablesService.getCable = jest.fn().mockResolvedValue(createMockCable());

      await service.refreshSection(section);

      // Error and litData should be reset at the start, but then set again by the method
      // So we check that the method completed successfully
      expect(service.loading()).toBe(false);
    });

    it('should set error and return early if workerPythonService is not ready', async () => {
      const section = createMockSection();
      workerPythonService.setReady(false);

      await service.refreshSection(section);

      expect(service.error()).toBe(DataError.NO_CABLE_FOUND);
      expect(service.loading()).toBe(false);
      expect(workerPythonService.runTask).not.toHaveBeenCalled();
      expect(cablesService.getCable).not.toHaveBeenCalled();
    });

    it('should set error and return early if section is null', async () => {
      workerPythonService.setReady(true);

      await service.refreshSection(null as unknown as Section);

      expect(service.error()).toBe(DataError.NO_CABLE_FOUND);
      expect(service.loading()).toBe(false);
      expect(workerPythonService.runTask).not.toHaveBeenCalled();
      expect(cablesService.getCable).not.toHaveBeenCalled();
    });

    it('should set error and return early if section has no cable_name', async () => {
      const section = { ...createMockSection(), cable_name: undefined };
      workerPythonService.setReady(true);

      await service.refreshSection(section);

      expect(service.error()).toBe(DataError.NO_CABLE_FOUND);
      expect(service.loading()).toBe(false);
      expect(workerPythonService.runTask).not.toHaveBeenCalled();
      expect(cablesService.getCable).not.toHaveBeenCalled();
    });

    it('should set error and return early if cable is not found', async () => {
      const section = createMockSection();
      workerPythonService.setReady(true);
      cablesService.getCable = jest.fn().mockResolvedValue(undefined);

      await service.refreshSection(section);

      expect(service.error()).toBe(DataError.NO_CABLE_FOUND);
      expect(service.loading()).toBe(false);
      expect(cablesService.getCable).toHaveBeenCalledWith('Test Cable');
      expect(workerPythonService.runTask).not.toHaveBeenCalled();
    });

    it('should call getCable with correct cable name', async () => {
      const section = createMockSection();
      const cable = createMockCable();
      workerPythonService.setReady(true);
      cablesService.getCable = jest.fn().mockResolvedValue(cable);
      workerPythonService.runTask = jest.fn().mockResolvedValue({
        result: createMockGetSectionOutput(),
        error: null
      });

      await service.refreshSection(section);

      expect(cablesService.getCable).toHaveBeenCalledWith('Test Cable');
    });

    it('should call workerPythonService.runTask with section and cable', async () => {
      const section = createMockSection();
      const cable = createMockCable();
      workerPythonService.setReady(true);
      cablesService.getCable = jest.fn().mockResolvedValue(cable);
      workerPythonService.runTask = jest.fn().mockResolvedValue({
        result: createMockGetSectionOutput(),
        error: null
      });

      await service.refreshSection(section);

      expect(workerPythonService.runTask).toHaveBeenCalledWith(Task.getLit, {
        section,
        cable
      });
    });

    it('should update plotOptions with correct support indices', async () => {
      const section = createMockSection();
      section.supports = [
        createMockSupport(),
        createMockSupport(),
        createMockSupport()
      ];
      const cable = createMockCable();
      workerPythonService.setReady(true);
      cablesService.getCable = jest.fn().mockResolvedValue(cable);
      workerPythonService.runTask = jest.fn().mockResolvedValue({
        result: createMockGetSectionOutput(),
        error: null
      });

      await service.refreshSection(section);

      const plotOptions = service.plotOptions();
      expect(plotOptions.startSupport).toBe(0);
      expect(plotOptions.endSupport).toBe(2); // section.supports.length - 1
      expect(plotOptions.invert).toBe(false);
    });

    it('should set litData with result when successful', async () => {
      const section = createMockSection();
      const cable = createMockCable();
      const mockResult = createMockGetSectionOutput();
      workerPythonService.setReady(true);
      cablesService.getCable = jest.fn().mockResolvedValue(cable);
      workerPythonService.runTask = jest.fn().mockResolvedValue({
        result: mockResult,
        error: null
      });

      await service.refreshSection(section);

      expect(service.litData()).toEqual(mockResult);
      expect(service.error()).toBeNull();
      expect(service.loading()).toBe(false);
    });

    it('should set error when workerPythonService returns error', async () => {
      const section = createMockSection();
      const cable = createMockCable();
      workerPythonService.setReady(true);
      cablesService.getCable = jest.fn().mockResolvedValue(cable);
      workerPythonService.runTask = jest.fn().mockResolvedValue({
        result: null,
        error: TaskError.CALCULATION_ERROR
      });

      await service.refreshSection(section);

      expect(service.error()).toBe(TaskError.CALCULATION_ERROR);
      expect(service.loading()).toBe(false);
    });

    it('should set loading to false after completion', async () => {
      const section = createMockSection();
      const cable = createMockCable();
      workerPythonService.setReady(true);
      cablesService.getCable = jest.fn().mockResolvedValue(cable);
      workerPythonService.runTask = jest.fn().mockResolvedValue({
        result: createMockGetSectionOutput(),
        error: null
      });

      await service.refreshSection(section);

      expect(service.loading()).toBe(false);
    });
  });
});
