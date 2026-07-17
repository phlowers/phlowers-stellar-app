import { TestBed } from '@angular/core/testing';
import { LoadFormsService } from './loadForms.service';
import { PlotService } from '@services/plot/plot.service';
import { PlotSpanService } from '@services/plot/plot-span.service';
import { PlotOptionsService } from '@services/plot/plot-options.service';
import { ChargesService } from '@services/charges/charges.service';
import { Section, Charge, SymmetryType } from '@shared/domain';
import { Study } from '@shared/domain/models/study.model';
import { ChargeData, LoadType } from '@shared/domain/models/charge.model';
import { WorkerPythonService } from '@services/worker_python/worker-python.service';
import { Task, PythonErrorCode } from '@services/worker_python/tasks/types';
import { ObstacleStateService } from '@services/obstacle-state/obstacle-state.service';

function createSignalMock<T>(initialValue: T) {
  let value = initialValue;
  const fn = vi.fn(() => value) as vi.Mock & { set: vi.Mock };
  fn.set = vi.fn((v: T) => {
    value = v;
  });
  return fn;
}

describe('LoadFormsService', () => {
  let service: LoadFormsService;
  let mockPlotService: vi.Mocked<PlotService>;
  let mockSpanService: vi.Mocked<PlotSpanService>;
  let plotOptionsServiceMock: vi.Mocked<PlotOptionsService>;
  let mockChargesService: vi.Mocked<ChargesService>;
  let mockWorkerPythonService: { runTask: ReturnType<typeof vi.fn> };
  let mockObstacleStateService: { syncObstacles: ReturnType<typeof vi.fn> };

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
        towerModel: 'Tower Model',
        spanAzimut: null,
        footLongitude: null,
        footLatitude: null
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
    selected_cable_modification_uuid: null,
    cable_span_manipulations: [],
    selected_cable_span_manipulation_uuid: null,
    start_latitude: null,
    start_longitude: null,
    start_azimuth: null,
    mean_reprojection_diff_meters: null
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
      study: createSignalMock(null),
      temporaryLoadData: null,
      loading: createSignalMock(false),
      litData: createSignalMock(null),
      baseLitData: createSignalMock(null),
      error: createSignalMock(null),
      diagnostics: createSignalMock([]),
      pythonErrorCode: createSignalMock(null),
      workerReady: createSignalMock(false),
      refreshProjection: vi.fn().mockResolvedValue(undefined)
    } as unknown as vi.Mocked<PlotService>;
    mockSpanService = {
      section: createSignalMock<Section | null>(null)
    } as unknown as vi.Mocked<PlotSpanService>;
    plotOptionsServiceMock = {
      refreshCamera: vi.fn(),
      plotOptions: createSignalMock({ startSupport: 0, endSupport: 1, view: '3d' })
    } as unknown as vi.Mocked<PlotOptionsService>;

    mockChargesService = {
      getSelectedChargeCase: vi.fn(),
      createOrUpdateCharge: vi.fn(),
      deleteCharge: vi.fn()
    } as unknown as vi.Mocked<ChargesService>;

    mockWorkerPythonService = {
      runTask: vi.fn().mockResolvedValue({ result: null, error: null })
    };

    mockObstacleStateService = {
      syncObstacles: vi.fn().mockResolvedValue(null)
    };

    TestBed.configureTestingModule({
      providers: [
        LoadFormsService,
        { provide: PlotService, useValue: mockPlotService },
        { provide: PlotSpanService, useValue: mockSpanService },
        { provide: PlotOptionsService, useValue: plotOptionsServiceMock },
        { provide: ChargesService, useValue: mockChargesService },
        { provide: WorkerPythonService, useValue: mockWorkerPythonService },
        { provide: ObstacleStateService, useValue: mockObstacleStateService }
      ]
    });

    service = TestBed.inject(LoadFormsService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('constructor effect gating', () => {
    it('should not call setLoads when worker is not ready even if a charge is selected', () => {
      mockPlotService.workerReady.mockReturnValue(false);
      mockPlotService.litData.mockReturnValue(null);
      mockSpanService.section.mockReturnValue({
        ...mockSection,
        selected_charge_uuid: 'charge-uuid-1',
        charges: [mockCharge]
      } as Section);

      TestBed.flushEffects();

      expect(mockWorkerPythonService.runTask).not.toHaveBeenCalled();
    });

    it('should not call setLoads when worker is ready but section studio has not finished initializing (litData null)', () => {
      mockPlotService.workerReady.mockReturnValue(true);
      mockPlotService.litData.mockReturnValue(null);
      mockSpanService.section.mockReturnValue({
        ...mockSection,
        selected_charge_uuid: 'charge-uuid-1',
        charges: [mockCharge]
      } as Section);

      TestBed.flushEffects();

      expect(mockWorkerPythonService.runTask).not.toHaveBeenCalled();
    });

    it('should call setLoads once worker is ready and litData is set (section studio initialized)', () => {
      mockPlotService.workerReady.mockReturnValue(true);
      mockPlotService.litData.mockReturnValue({} as ReturnType<typeof mockPlotService.litData>);
      mockSpanService.section.mockReturnValue({
        ...mockSection,
        selected_charge_uuid: 'charge-uuid-1',
        charges: [mockCharge]
      } as Section);

      TestBed.flushEffects();

      expect(mockWorkerPythonService.runTask).toHaveBeenCalledWith(
        Task.setLoads,
        expect.objectContaining({ spanLoads: expect.any(Array) })
      );
    });
  });

  describe('initTemporaryLoadData', () => {
    it('should set temporaryLoadData to null when no currentChargeUuid', () => {
      mockSpanService.section.mockReturnValue({
        ...mockSection,
        selected_charge_uuid: null
      } as Section);

      service.initTemporaryLoadData();

      expect(mockPlotService.temporaryLoadData).toBeNull();
    });

    it('should set temporaryLoadData to null when section is null', () => {
      mockSpanService.section.mockReturnValue(null);

      service.initTemporaryLoadData();

      expect(mockPlotService.temporaryLoadData).toBeNull();
    });

    it('should set temporaryLoadData to null when charge not found', () => {
      mockSpanService.section.mockReturnValue({
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

      mockSpanService.section.mockReturnValue(sectionWithCharge);

      service.initTemporaryLoadData();

      expect(mockPlotService.temporaryLoadData).toBeDefined();
      expect(mockPlotService.temporaryLoadData?.climate).toEqual(mockChargeData.climate);
    });

    it('should use empty array as fallback when charge spanLoads is null', () => {
      const chargeWithNullSpanLoads = {
        ...mockCharge,
        data: { ...mockChargeData, spanLoads: null as unknown as typeof mockChargeData.spanLoads }
      };
      mockSpanService.section.mockReturnValue({
        ...mockSection,
        selected_charge_uuid: 'charge-uuid-1',
        charges: [chargeWithNullSpanLoads]
      } as Section);

      service.initTemporaryLoadData();

      expect(mockPlotService.temporaryLoadData?.spanLoads).toBeDefined();
      expect(Array.isArray(mockPlotService.temporaryLoadData?.spanLoads)).toBe(true);
    });

    it('should use empty supports array when section has no supports', () => {
      mockSpanService.section.mockReturnValue({
        ...mockSection,
        selected_charge_uuid: 'charge-uuid-1',
        charges: [mockCharge],
        supports: undefined as unknown as typeof mockSection.supports
      } as Section);

      service.initTemporaryLoadData();

      expect(mockPlotService.temporaryLoadData?.spanLoads).toBeDefined();
    });

    it('should call setLoads with empty array when charge has no span loads', async () => {
      const chargeWithNoLoads = {
        ...mockCharge,
        data: { ...mockChargeData, spanLoads: [] }
      };
      mockSpanService.section.mockReturnValue({
        ...mockSection,
        selected_charge_uuid: 'charge-uuid-1',
        charges: [chargeWithNoLoads]
      } as Section);

      await service.initTemporaryLoadData();

      expect(mockWorkerPythonService.runTask).toHaveBeenCalledWith(Task.setLoads, { spanLoads: [] });
    });

    it('should call setLoads with recheckSpanLoads result when charge has span loads', async () => {
      mockSpanService.section.mockReturnValue({
        ...mockSection,
        selected_charge_uuid: 'charge-uuid-1',
        charges: [mockCharge]
      } as Section);

      await service.initTemporaryLoadData();

      const setLoadsCall = (mockWorkerPythonService.runTask as ReturnType<typeof vi.fn>).mock.calls.find(
        ([task]) => task === Task.setLoads
      );
      expect(setLoadsCall).toBeDefined();
      expect((setLoadsCall![1] as { spanLoads: unknown[] }).spanLoads.length).toBeGreaterThan(0);
    });
  });

  describe('saveTemporaryLoadDataInSection', () => {
    it('should return early when temporaryLoadData is null', async () => {
      mockPlotService.temporaryLoadData = null;

      await service.saveTemporaryLoadDataInSection();

      expect(mockChargesService.createOrUpdateCharge).not.toHaveBeenCalled();
    });

    it('should return early when studyUuid is missing', async () => {
      mockPlotService.temporaryLoadData = mockChargeData;
      mockPlotService.study.mockReturnValue(null);
      mockSpanService.section.mockReturnValue(mockSection);

      await service.saveTemporaryLoadDataInSection();

      expect(mockChargesService.createOrUpdateCharge).not.toHaveBeenCalled();
    });

    it('should return early when sectionUuid is missing', async () => {
      mockPlotService.temporaryLoadData = mockChargeData;
      mockPlotService.study.mockReturnValue({ uuid: 'study-uuid' } as Partial<Study> as Study);
      mockSpanService.section.mockReturnValue(null);

      await service.saveTemporaryLoadDataInSection();

      expect(mockChargesService.createOrUpdateCharge).not.toHaveBeenCalled();
    });

    it('should return early when selected_charge_uuid is null', async () => {
      mockPlotService.temporaryLoadData = mockChargeData;
      mockPlotService.study.mockReturnValue({ uuid: 'study-uuid' } as Partial<Study> as Study);
      mockSpanService.section.mockReturnValue(mockSection);
      mockChargesService.getSelectedChargeCase.mockResolvedValue(null);

      await service.saveTemporaryLoadDataInSection();

      expect(mockChargesService.createOrUpdateCharge).not.toHaveBeenCalled();
    });

    it('should save temporaryLoadData to charge', async () => {
      mockPlotService.temporaryLoadData = mockChargeData;
      mockPlotService.study.mockReturnValue({ uuid: 'study-uuid' } as Partial<Study> as Study);
      mockSpanService.section.mockReturnValue(mockSection);
      mockChargesService.getSelectedChargeCase.mockResolvedValue(mockCharge);
      mockChargesService.createOrUpdateCharge.mockResolvedValue(undefined);

      await service.saveTemporaryLoadDataInSection();

      expect(mockChargesService.createOrUpdateCharge).toHaveBeenCalledWith(
        'study-uuid',
        mockSection.uuid,
        expect.objectContaining({ uuid: mockCharge.uuid, data: mockChargeData })
      );
    });
  });

  describe('calculateLoad', () => {
    it('should return early when temporaryLoadData is null', async () => {
      mockPlotService.temporaryLoadData = null;

      await service.calculateLoad();

      expect(mockWorkerPythonService.runTask).not.toHaveBeenCalled();
      expect(plotOptionsServiceMock.refreshCamera).not.toHaveBeenCalled();
    });

    it('should call refreshCamera and runTask(changeState) when temporaryLoadData is set', async () => {
      mockPlotService.temporaryLoadData = mockChargeData;
      mockSpanService.section.mockReturnValue(mockSection);

      await service.calculateLoad();

      expect(plotOptionsServiceMock.refreshCamera).toHaveBeenCalled();
      expect(mockWorkerPythonService.runTask).toHaveBeenCalledWith(Task.changeState, expect.any(Object));
    });

    it('should update temporaryLoadData spanLoads with rechecked values before delegating', async () => {
      mockPlotService.temporaryLoadData = mockChargeData;
      mockSpanService.section.mockReturnValue(mockSection);

      await service.calculateLoad();

      // After recheckSpanLoads, the spanLoads should include an entry for each support
      expect(mockPlotService.temporaryLoadData?.spanLoads).toBeDefined();
      expect(mockPlotService.temporaryLoadData?.spanLoads.some((l) => l.supportUuid === 'support-uuid-1')).toBe(true);
    });

    it('should set loading to true then false', async () => {
      mockPlotService.temporaryLoadData = mockChargeData;
      mockSpanService.section.mockReturnValue(mockSection);

      await service.calculateLoad();

      expect(mockPlotService.loading.set).toHaveBeenCalledWith(true);
      expect(mockPlotService.loading.set).toHaveBeenCalledWith(false);
    });

    it('should use empty array for supports when section has no supports', async () => {
      mockPlotService.temporaryLoadData = mockChargeData;
      mockSpanService.section.mockReturnValue({
        ...mockSection,
        supports: undefined as unknown as typeof mockSection.supports
      });

      await service.calculateLoad();

      expect(mockObstacleStateService.syncObstacles).not.toHaveBeenCalled();
      expect(Array.isArray(mockPlotService.temporaryLoadData?.spanLoads)).toBe(true);
    });

    it('should use empty array for supports when section is null', async () => {
      mockPlotService.temporaryLoadData = mockChargeData;
      mockSpanService.section.mockReturnValue(null);

      await service.calculateLoad();

      expect(mockObstacleStateService.syncObstacles).not.toHaveBeenCalled();
    });

    it('should not call shortenLengthenCable when reapplyCableModifications is deactivated', async () => {
      mockPlotService.temporaryLoadData = mockChargeData;
      mockSpanService.section.mockReturnValue({
        ...mockSection,
        cable_modifications: [
          {
            uuid: 'mod-1',
            spanUuid: 'support-uuid-1',
            supportRef: 'LEFT',
            modificationType: 'lengthening',
            modifiedLengthCable: 0.5,
            distanceSupportRef: 100
          }
        ]
      } as Section);
      mockWorkerPythonService.runTask.mockResolvedValueOnce({ result: { success: true }, error: null });

      await service.calculateLoad();

      expect(mockWorkerPythonService.runTask).toHaveBeenCalledWith(Task.changeState, expect.any(Object));
      expect(mockWorkerPythonService.runTask).not.toHaveBeenCalledWith(Task.shortenLengthenCable, expect.any(Object));
    });

    it('should set plotService.error and diagnostics when runTask returns an error', async () => {
      mockPlotService.temporaryLoadData = mockChargeData;
      mockSpanService.section.mockReturnValue(mockSection);
      const diagnostics = [
        { code: PythonErrorCode.SolverError, severity: 'error' as const, origin: 'exception' as const, rawText: 'mock' }
      ];
      mockWorkerPythonService.runTask.mockResolvedValue({
        result: null,
        error: 'CALCULATION_FAILED',
        diagnostics
      });

      await service.calculateLoad();

      expect(mockPlotService.error.set).toHaveBeenCalledWith('CALCULATION_FAILED');
      expect(mockPlotService.diagnostics.set).toHaveBeenCalledWith(diagnostics);
    });

    it('should not call refreshProjection when runTask returns an error', async () => {
      mockPlotService.temporaryLoadData = mockChargeData;
      mockSpanService.section.mockReturnValue(mockSection);
      mockWorkerPythonService.runTask.mockResolvedValue({
        result: null,
        error: 'CALCULATION_FAILED',
        diagnostics: []
      });

      await service.calculateLoad();

      expect(mockPlotService.refreshProjection).not.toHaveBeenCalled();
    });

    it('should still set loading to false when runTask returns an error', async () => {
      mockPlotService.temporaryLoadData = mockChargeData;
      mockSpanService.section.mockReturnValue(mockSection);
      mockWorkerPythonService.runTask.mockResolvedValue({
        result: null,
        error: 'CALCULATION_FAILED',
        diagnostics: []
      });

      await service.calculateLoad();

      expect(mockPlotService.loading.set).toHaveBeenCalledWith(true);
      expect(mockPlotService.loading.set).toHaveBeenCalledWith(false);
    });

    it('should not run any cable modification task when the section has none', async () => {
      mockPlotService.temporaryLoadData = mockChargeData;
      mockSpanService.section.mockReturnValue(mockSection);

      await service.calculateLoad();

      expect(mockWorkerPythonService.runTask).not.toHaveBeenCalledWith(Task.shortenLengthenCable, expect.any(Object));
    });

    it('should skip cable modifications whose span uuid is not in the support list', async () => {
      mockPlotService.temporaryLoadData = mockChargeData;
      mockSpanService.section.mockReturnValue({
        ...mockSection,
        cable_modifications: [
          {
            uuid: 'mod-orphan',
            spanUuid: 'unknown-support',
            supportRef: 'LEFT',
            modificationType: 'lengthening',
            modifiedLengthCable: 0.5,
            distanceSupportRef: 100
          }
        ]
      } as Section);

      await service.calculateLoad();

      expect(mockWorkerPythonService.runTask).not.toHaveBeenCalledWith(Task.shortenLengthenCable, expect.any(Object));
    });
  });

  describe('deleteLoad', () => {
    it('should call deleteAllLoads and changeState with base climate', async () => {
      mockSpanService.section.mockReturnValue({
        ...mockSection,
        initial_conditions: [{ uuid: 'ic-1', base_temperature: 20 }],
        selected_initial_condition_uuid: 'ic-1'
      });
      mockPlotService.temporaryLoadData = mockChargeData;

      await service.deleteLoad();

      expect(mockWorkerPythonService.runTask).toHaveBeenCalledWith(Task.deleteAllLoads, undefined);
      expect(mockWorkerPythonService.runTask).toHaveBeenCalledWith(Task.changeState, {
        climate: expect.objectContaining({ windPressure: 0, iceThickness: 0, cableTemperature: 20 })
      });
    });

    it('should clear temporaryLoadData and call refreshProjection', async () => {
      mockSpanService.section.mockReturnValue(mockSection);
      mockPlotService.temporaryLoadData = mockChargeData;

      await service.deleteLoad();

      expect(mockPlotService.temporaryLoadData).toBeNull();
      expect(mockPlotService.refreshProjection).toHaveBeenCalled();
    });

    it('should not call chargesService.deleteCharge', async () => {
      mockSpanService.section.mockReturnValue(mockSection);

      await service.deleteLoad();

      expect(mockChargesService.deleteCharge).not.toHaveBeenCalled();
    });
  });

  describe('deleteSpanLoad', () => {
    it('should return early when temporaryLoadData is null', () => {
      mockPlotService.temporaryLoadData = null;

      service.deleteSpanLoad('support-uuid-1');

      expect(mockPlotService.temporaryLoadData).toBeNull();
    });

    it('should return early when supportUuid is not found in spanLoads', () => {
      mockPlotService.temporaryLoadData = mockChargeData;

      service.deleteSpanLoad('non-existent-uuid');

      expect(mockPlotService.temporaryLoadData?.spanLoads[0].supportUuid).toBe('support-uuid-1');
    });

    it('should reset the SpanLoad to emptySpanLoad values while preserving supportUuid', () => {
      mockPlotService.temporaryLoadData = {
        ...mockChargeData,
        spanLoads: [
          {
            supportUuid: 'support-uuid-1',
            loadPosition: 5,
            loadWeight: 100,
            type: LoadType.MARKING,
            referenceSupport: 'RIGHT'
          }
        ]
      };

      service.deleteSpanLoad('support-uuid-1');

      const spanLoad = mockPlotService.temporaryLoadData?.spanLoads[0];
      expect(spanLoad?.supportUuid).toBe('support-uuid-1');
      expect(spanLoad?.loadPosition).toBe(0);
      expect(spanLoad?.loadWeight).toBe(0);
      expect(spanLoad?.type).toBe(LoadType.PUNCTUAL);
      expect(spanLoad?.referenceSupport).toBe('LEFT');
    });
  });
});
