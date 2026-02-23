import { TestBed } from '@angular/core/testing';
import { LoadFormsService } from './loadForms.service';
import { PlotService } from '@ui/pages/studio/services/plot.service';
import { ChargesService } from '@src/app/core/services/charges/charges.service';
import { WorkerPythonService } from '@src/app/core/services/worker_python/worker-python.service';
import { Task } from '@src/app/core/services/worker_python/tasks/types';
import { Section, Charge, SymmetryType } from '@core/domain';
import { ChargeData, LoadType } from '@core/domain/models/charge.model';

function createSignalMock<T>(initialValue: T) {
  let value = initialValue;
  const fn = jest.fn(() => value) as any;
  fn.set = jest.fn((v: T) => {
    value = v;
  });
  return fn;
}

describe('LoadFormsService', () => {
  let service: LoadFormsService;
  let mockPlotService: jest.Mocked<PlotService>;
  let mockChargesService: jest.Mocked<ChargesService>;
  let mockWorkerPythonService: jest.Mocked<WorkerPythonService>;

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
      }
    ],
    obstacles: [],
    initial_conditions: [],
    selected_initial_condition_uuid: undefined,
    charges: [],
    selected_charge_uuid: null,
    field_measures: [],
    selected_field_measure_uuid: undefined,
    vtl_and_guying: undefined
  };

  const mockChargeData: ChargeData = {
    climate: {
      windPressure: 100,
      cableTemperature: 20,
      symmetryType: SymmetryType.SYMMETRIC,
      iceThickness: null,
      frontierSupportNumber: null,
      iceThicknessBefore: null,
      iceThicknessAfter: null
    },
    spanLoads: [
      {
        supportUuid: 'support-uuid-1',
        loadPosition: 0.5,
        loadWeight: 100,
        type: LoadType.PUNCTUAL,
        referenceSupport: 'LEFT'
      }
    ]
  };

  const mockCharge: Charge = {
    uuid: 'charge-uuid-1',
    name: 'Test Charge',
    personnelPresence: false,
    description: 'Test Description',
    data: mockChargeData
  };

  beforeEach(() => {
    mockPlotService = {
      section: createSignalMock<Section | null>(null),
      study: createSignalMock(null),
      temporaryLoadData: null,
      loading: createSignalMock(false),
      litData: createSignalMock(null),
      baseLitData: createSignalMock(null),
      error: createSignalMock(null),
      refreshCamera: jest.fn()
    } as unknown as jest.Mocked<PlotService>;

    mockChargesService = {
      getSelectedChargeCase: jest.fn(),
      createOrUpdateCharge: jest.fn(),
      deleteCharge: jest.fn()
    } as unknown as jest.Mocked<ChargesService>;

    mockWorkerPythonService = {
      runTask: jest.fn()
    } as unknown as jest.Mocked<WorkerPythonService>;

    TestBed.configureTestingModule({
      providers: [
        LoadFormsService,
        { provide: PlotService, useValue: mockPlotService },
        { provide: ChargesService, useValue: mockChargesService },
        { provide: WorkerPythonService, useValue: mockWorkerPythonService }
      ]
    });

    service = TestBed.inject(LoadFormsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('initTemporaryLoadData', () => {
    it('should set temporaryLoadData to null when no currentChargeUuid', () => {
      mockPlotService.section.mockReturnValue({
        ...mockSection,
        selected_charge_uuid: null
      } as Section);

      service.initTemporaryLoadData();

      expect(mockPlotService.temporaryLoadData).toBeNull();
    });

    it('should set temporaryLoadData to null when section is null', () => {
      mockPlotService.section.mockReturnValue(null);

      service.initTemporaryLoadData();

      expect(mockPlotService.temporaryLoadData).toBeNull();
    });

    it('should set temporaryLoadData to null when charge not found', () => {
      mockPlotService.section.mockReturnValue({
        ...mockSection,
        selected_charge_uuid: 'non-existent-uuid',
        charges: []
      } as Section);

      service.initTemporaryLoadData();

      expect(mockPlotService.temporaryLoadData).toBeNull();
    });

    it('should initialize temporaryLoadData with charge data', () => {
      const sectionWithCharge = {
        ...mockSection,
        selected_charge_uuid: 'charge-uuid-1',
        charges: [mockCharge]
      } as Section;

      mockPlotService.section.mockReturnValue(sectionWithCharge);

      service.initTemporaryLoadData();

      expect(mockPlotService.temporaryLoadData).toBeDefined();
      expect(mockPlotService.temporaryLoadData?.climate).toEqual(mockChargeData.climate);
    });
  });

  describe('saveTemporaryLoadDataInSection', () => {
    it('should return early when temporaryLoadData is null', async () => {
      mockPlotService.temporaryLoadData = null;

      await service.saveTemporaryLoadDataInSection();

      expect(mockChargesService.getSelectedChargeCase).not.toHaveBeenCalled();
    });

    it('should return early when studyUuid is missing', async () => {
      mockPlotService.temporaryLoadData = mockChargeData;
      mockPlotService.study.mockReturnValue(null);
      mockPlotService.section.mockReturnValue(mockSection);

      await service.saveTemporaryLoadDataInSection();

      expect(mockChargesService.getSelectedChargeCase).not.toHaveBeenCalled();
    });

    it('should return early when sectionUuid is missing', async () => {
      mockPlotService.temporaryLoadData = mockChargeData;
      mockPlotService.study.mockReturnValue({ uuid: 'study-uuid' } as any);
      mockPlotService.section.mockReturnValue(null);

      await service.saveTemporaryLoadDataInSection();

      expect(mockChargesService.getSelectedChargeCase).not.toHaveBeenCalled();
    });

    it('should return early when currentCharge is null', async () => {
      mockPlotService.temporaryLoadData = mockChargeData;
      mockPlotService.study.mockReturnValue({ uuid: 'study-uuid' } as any);
      mockPlotService.section.mockReturnValue(mockSection);
      mockChargesService.getSelectedChargeCase.mockResolvedValue(null);

      await service.saveTemporaryLoadDataInSection();

      expect(mockChargesService.createOrUpdateCharge).not.toHaveBeenCalled();
    });

    it('should save temporaryLoadData to charge', async () => {
      mockPlotService.temporaryLoadData = mockChargeData;
      mockPlotService.study.mockReturnValue({ uuid: 'study-uuid' } as any);
      mockPlotService.section.mockReturnValue(mockSection);
      mockChargesService.getSelectedChargeCase.mockResolvedValue(mockCharge);
      mockChargesService.createOrUpdateCharge.mockResolvedValue(undefined);

      await service.saveTemporaryLoadDataInSection();

      expect(mockChargesService.getSelectedChargeCase).toHaveBeenCalled();
      expect(mockChargesService.createOrUpdateCharge).toHaveBeenCalled();
    });
  });

  describe('calculateLoad', () => {
    it('should return early when temporaryLoadData is null', async () => {
      mockPlotService.temporaryLoadData = null;

      await service.calculateLoad();

      expect(mockWorkerPythonService.runTask).not.toHaveBeenCalled();
    });

    it('should call runTask with changeState task', async () => {
      mockPlotService.temporaryLoadData = mockChargeData;
      mockPlotService.section.mockReturnValue(mockSection);
      mockWorkerPythonService.runTask.mockResolvedValue({
        result: {} as any,
        error: null
      });

      await service.calculateLoad();

      expect(mockPlotService.refreshCamera).toHaveBeenCalled();
      expect(mockWorkerPythonService.runTask).toHaveBeenCalledWith(
        Task.changeState,
        expect.objectContaining({
          climate: mockChargeData.climate,
          spanLoads: expect.any(Array)
        })
      );
    });

    it('should set loading to true then false', async () => {
      mockPlotService.temporaryLoadData = mockChargeData;
      mockPlotService.section.mockReturnValue(mockSection);
      mockWorkerPythonService.runTask.mockResolvedValue({
        result: {} as any,
        error: null
      });

      await service.calculateLoad();

      expect(mockPlotService.loading.set).toHaveBeenCalledWith(true);
      expect(mockPlotService.loading.set).toHaveBeenCalledWith(false);
    });

    it('should set litData and baseLitData from task result', async () => {
      const mockCurrentData = { spans: [[]] } as any;
      const mockBaseData = { spans: [[]] } as any;
      const mockError = 'test-error' as any;
      mockPlotService.temporaryLoadData = mockChargeData;
      mockPlotService.section.mockReturnValue(mockSection);
      mockWorkerPythonService.runTask.mockResolvedValue({
        result: { current: mockCurrentData, base: mockBaseData },
        error: mockError
      });

      await service.calculateLoad();

      expect(mockPlotService.litData.set).toHaveBeenCalledWith(mockCurrentData);
      expect(mockPlotService.baseLitData.set).toHaveBeenCalledWith(mockBaseData);
      expect(mockPlotService.error.set).toHaveBeenCalledWith(mockError);
    });

    it('should set litData to null when result is null', async () => {
      mockPlotService.temporaryLoadData = mockChargeData;
      mockPlotService.section.mockReturnValue(mockSection);
      mockWorkerPythonService.runTask.mockResolvedValue({
        result: null as any,
        error: null
      });

      await service.calculateLoad();

      expect(mockPlotService.litData.set).toHaveBeenCalledWith(null);
      expect(mockPlotService.baseLitData.set).toHaveBeenCalledWith(null);
    });
  });

  describe('deleteLoad', () => {
    it('should return early when studyUuid is missing', () => {
      mockPlotService.study.mockReturnValue(null);
      mockPlotService.section.mockReturnValue(mockSection);

      service.deleteLoad();

      expect(mockChargesService.deleteCharge).not.toHaveBeenCalled();
    });

    it('should return early when sectionUuid is missing', () => {
      mockPlotService.study.mockReturnValue({ uuid: 'study-uuid' } as any);
      mockPlotService.section.mockReturnValue(null);

      service.deleteLoad();

      expect(mockChargesService.deleteCharge).not.toHaveBeenCalled();
    });

    it('should return early when chargeUuid is missing', () => {
      mockPlotService.study.mockReturnValue({ uuid: 'study-uuid' } as any);
      mockPlotService.section.mockReturnValue({
        ...mockSection,
        selected_charge_uuid: null
      } as Section);

      service.deleteLoad();

      expect(mockChargesService.deleteCharge).not.toHaveBeenCalled();
    });

    it('should call deleteCharge with correct parameters', () => {
      mockPlotService.study.mockReturnValue({ uuid: 'study-uuid' } as any);
      mockPlotService.section.mockReturnValue({
        ...mockSection,
        selected_charge_uuid: 'charge-uuid-1'
      } as Section);

      service.deleteLoad();

      expect(mockChargesService.deleteCharge).toHaveBeenCalledWith('study-uuid', 'section-uuid-1', 'charge-uuid-1');
    });
  });
});
