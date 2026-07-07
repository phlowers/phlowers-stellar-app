import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { LoadFormsService } from './loadForms.service';
import { PlotService } from '@services/plot/plot.service';
import { PlotSpanService } from '@services/plot/plot-span.service';
import { PlotOptionsService } from '@services/plot/plot-options.service';
import { ChargesService } from '@services/charges/charges.service';
import { Section, Charge, SymmetryType } from '@shared/domain';
import { Study } from '@shared/domain/models/study.model';
import { ChargeData, LoadType } from '@shared/domain/models/charge.model';
import { WorkerPythonService } from '@services/worker_python/worker-python.service';
import { GetSectionOutput, Task } from '@services/worker_python/tasks/types';
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
    mean_gps_diff_meters: null
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
      litDataCache: new Map(),
      error: createSignalMock(null),
      pythonErrorCode: createSignalMock(null),
      refreshProjection: vi.fn().mockResolvedValue(undefined)
    } as unknown as vi.Mocked<PlotService>;
    mockSpanService = {
      section: createSignalMock<Section | null>(null)
    } as unknown as vi.Mocked<PlotSpanService>;
    plotOptionsServiceMock = {
      refreshCamera: vi.fn(),
      getCamera: vi.fn().mockReturnValue(null),
      plotOptions: createSignalMock({ startSupport: 0, endSupport: 1, view: '3d' }),
      camera: createSignalMock(null)
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

    it('should call refreshCamera and runTask(changeState) with climate AND spanLoads', async () => {
      mockPlotService.temporaryLoadData = mockChargeData;
      mockSpanService.section.mockReturnValue(mockSection);
      mockWorkerPythonService.runTask.mockResolvedValue({ result: { success: true }, error: null });

      await service.calculateLoad();

      expect(plotOptionsServiceMock.refreshCamera).toHaveBeenCalled();
      expect(mockWorkerPythonService.runTask).toHaveBeenCalledWith(Task.changeState, {
        climate: expect.any(Object),
        spanLoads: expect.any(Array)
      });
    });

    it('should pass empty spanLoads array to clear previous loads', async () => {
      mockPlotService.temporaryLoadData = {
        climate: mockChargeData.climate,
        spanLoads: []
      };
      mockSpanService.section.mockReturnValue(mockSection);
      mockWorkerPythonService.runTask.mockResolvedValue({ result: { success: true }, error: null });

      await service.calculateLoad();

      // recheckSpanLoads creates placeholder entries for each support with loadWeight=0
      // This is the expected behavior - the Python engine will zero them out
      expect(mockWorkerPythonService.runTask).toHaveBeenCalledWith(Task.changeState, {
        climate: expect.any(Object),
        spanLoads: expect.arrayContaining([
          expect.objectContaining({
            supportUuid: 'support-uuid-1',
            loadWeight: 0,
            loadPosition: 0
          })
        ])
      });
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

    it('should re-apply saved cable modifications after changeState so lengthening/shortening is not lost', async () => {
      mockPlotService.temporaryLoadData = mockChargeData;
      mockSpanService.section.mockReturnValue({
        ...mockSection,
        cable_modifications: [
          {
            uuid: 'mod-1',
            spanUuid: 'support-uuid-1',
            supportRef: 'LEFT',
            widthCable: 'lengthening',
            sizeCable: 0.5,
            distanceSupportRef: 100
          }
        ]
      } as Section);
      mockWorkerPythonService.runTask
        .mockResolvedValueOnce({ result: { success: true }, error: null }) // changeState
        .mockResolvedValueOnce({ result: { current: { id: 'after-cable-mod' }, base: null }, error: null }); // cableModification

      await service.calculateLoad();

      expect(mockWorkerPythonService.runTask).toHaveBeenCalledWith(Task.changeState, expect.any(Object));
      expect(mockWorkerPythonService.runTask).toHaveBeenCalledWith(
        Task.cableModification,
        expect.objectContaining({
          spanIndex: 0,
          widthCable: 'lengthening',
          sizeCable: 0.5,
          distanceSupportRef: 100,
          supportRef: 'LEFT'
        })
      );
      // Final litData reflects the cable modification, not the bare change-state.
      expect(mockPlotService.litData.set).toHaveBeenLastCalledWith({ id: 'after-cable-mod' });
    });

    it('should set plotService.error when runTask returns an error', async () => {
      mockPlotService.temporaryLoadData = mockChargeData;
      mockSpanService.section.mockReturnValue(mockSection);
      mockWorkerPythonService.runTask.mockResolvedValue({
        result: null,
        error: 'CALCULATION_FAILED',
        diagnostics: []
      });

      await service.calculateLoad();

      expect(mockPlotService.error.set).toHaveBeenCalledWith('CALCULATION_FAILED');
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

      expect(mockWorkerPythonService.runTask).not.toHaveBeenCalledWith(Task.cableModification, expect.any(Object));
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
            widthCable: 'lengthening',
            sizeCable: 0.5,
            distanceSupportRef: 100
          }
        ]
      } as Section);

      await service.calculateLoad();

      expect(mockWorkerPythonService.runTask).not.toHaveBeenCalledWith(Task.cableModification, expect.any(Object));
    });

    it('should store final litData in litDataCache after successful calculation', async () => {
      const finalLitData = { litCode: 'final' } as unknown as GetSectionOutput;
      mockPlotService.temporaryLoadData = mockChargeData;
      mockSpanService.section.mockReturnValue({
        ...mockSection,
        selected_charge_uuid: 'charge-uuid-1'
      } as Section);
      mockWorkerPythonService.runTask.mockResolvedValue({ result: { success: true }, error: null });
      mockPlotService.litData.mockReturnValue(finalLitData);

      await service.calculateLoad();

      expect(mockPlotService.litDataCache.get('charge-uuid-1')).toBe(finalLitData);
    });

    it('should NOT update litDataCache when runTask returns an error', async () => {
      mockPlotService.temporaryLoadData = mockChargeData;
      mockSpanService.section.mockReturnValue({
        ...mockSection,
        selected_charge_uuid: 'charge-uuid-1'
      } as Section);
      mockWorkerPythonService.runTask.mockResolvedValue({
        result: null,
        error: 'CALCULATION_FAILED',
        diagnostics: []
      });

      await service.calculateLoad();

      expect(mockPlotService.litDataCache.has('charge-uuid-1')).toBe(false);
    });
  });

  describe('deleteLoad', () => {
    it('should return early when studyUuid is missing', () => {
      mockPlotService.study.mockReturnValue(null);
      mockSpanService.section.mockReturnValue(mockSection);

      service.deleteLoad();

      expect(mockChargesService.deleteCharge).not.toHaveBeenCalled();
    });

    it('should return early when sectionUuid is missing', () => {
      mockPlotService.study.mockReturnValue({ uuid: 'study-uuid' } as Partial<Study> as Study);
      mockSpanService.section.mockReturnValue(null);

      service.deleteLoad();

      expect(mockChargesService.deleteCharge).not.toHaveBeenCalled();
    });

    it('should return early when chargeUuid is missing', () => {
      mockPlotService.study.mockReturnValue({ uuid: 'study-uuid' } as Partial<Study> as Study);
      mockSpanService.section.mockReturnValue({
        ...mockSection,
        selected_charge_uuid: null
      } as Section);

      service.deleteLoad();

      expect(mockChargesService.deleteCharge).not.toHaveBeenCalled();
    });

    it('should call deleteCharge with correct parameters', () => {
      mockPlotService.study.mockReturnValue({ uuid: 'study-uuid' } as Partial<Study> as Study);
      mockSpanService.section.mockReturnValue({
        ...mockSection,
        selected_charge_uuid: 'charge-uuid-1'
      } as Section);

      service.deleteLoad();

      expect(mockChargesService.deleteCharge).toHaveBeenCalledWith('study-uuid', 'section-uuid-1', 'charge-uuid-1');
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

  describe('litData cache on charge change', () => {
    it('should NOT call litData.set when baseLitData is null and no cache entry', () => {
      // On service creation: section() = null → chargeUuid = null ≠ undefined → effect fires
      // no cache entry, baseLitData() = null → guard prevents litData.set
      expect(mockPlotService.litData.set).not.toHaveBeenCalled();
    });

    it('should NOT set litData to baseLitData on cache miss when a charge is selected', () => {
      const mockBaseData = { litCode: 'base' } as unknown as GetSectionOutput;
      const freshPlotService = {
        ...mockPlotService,
        baseLitData: vi.fn().mockReturnValue(mockBaseData),
        litData: { set: vi.fn() },
        litDataCache: new Map()
      };
      const freshSpanService = {
        section: vi.fn().mockReturnValue({
          ...mockSection,
          selected_charge_uuid: 'charge-uuid-1'
        } as Section)
      };

      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          LoadFormsService,
          { provide: PlotService, useValue: freshPlotService },
          { provide: PlotSpanService, useValue: freshSpanService },
          { provide: PlotOptionsService, useValue: plotOptionsServiceMock },
          { provide: ChargesService, useValue: mockChargesService },
          { provide: WorkerPythonService, useValue: mockWorkerPythonService },
          { provide: ObstacleStateService, useValue: mockObstacleStateService }
        ]
      });

      const freshService = TestBed.inject(LoadFormsService);
      TestBed.flushEffects();
      expect(freshService).toBeTruthy();
      // Switching to a charge case: keep current litData visible, do NOT flash the base state
      expect(freshPlotService.litData.set).not.toHaveBeenCalledWith(mockBaseData);
    });

    it('should set litData to baseLitData when charge is deselected (chargeUuid becomes null)', () => {
      const mockBaseData = { litCode: 'base' } as unknown as GetSectionOutput;
      const freshPlotService = {
        ...mockPlotService,
        baseLitData: vi.fn().mockReturnValue(mockBaseData),
        litData: { set: vi.fn() },
        litDataCache: new Map()
      };
      // Section has no selected charge (deselected)
      const freshSpanService = {
        section: vi.fn().mockReturnValue({
          ...mockSection,
          selected_charge_uuid: null
        } as Section)
      };

      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          LoadFormsService,
          { provide: PlotService, useValue: freshPlotService },
          { provide: PlotSpanService, useValue: freshSpanService },
          { provide: PlotOptionsService, useValue: plotOptionsServiceMock },
          { provide: ChargesService, useValue: mockChargesService },
          { provide: WorkerPythonService, useValue: mockWorkerPythonService },
          { provide: ObstacleStateService, useValue: mockObstacleStateService }
        ]
      });

      const freshService = TestBed.inject(LoadFormsService);
      TestBed.flushEffects();
      expect(freshService).toBeTruthy();
      // Deselecting a charge → revert to base state immediately
      expect(freshPlotService.litData.set).toHaveBeenCalledWith(mockBaseData);
    });

    it('should restore litData from cache on cache hit', () => {
      const cachedData = { litCode: 'cached' } as unknown as GetSectionOutput;
      const cache = new Map([['charge-uuid-1', cachedData]]);
      const freshPlotService = {
        ...mockPlotService,
        baseLitData: vi.fn().mockReturnValue({ litCode: 'base' }),
        litData: { set: vi.fn() },
        litDataCache: cache
      };
      const freshSpanService = {
        section: vi.fn().mockReturnValue({
          ...mockSection,
          selected_charge_uuid: 'charge-uuid-1'
        } as Section)
      };

      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          LoadFormsService,
          { provide: PlotService, useValue: freshPlotService },
          { provide: PlotSpanService, useValue: freshSpanService },
          { provide: PlotOptionsService, useValue: plotOptionsServiceMock },
          { provide: ChargesService, useValue: mockChargesService },
          { provide: WorkerPythonService, useValue: mockWorkerPythonService },
          { provide: ObstacleStateService, useValue: mockObstacleStateService }
        ]
      });

      const freshService = TestBed.inject(LoadFormsService);
      TestBed.flushEffects();
      expect(freshService).toBeTruthy();
      // cache hit → restored, NOT the base
      expect(freshPlotService.litData.set).toHaveBeenCalledWith(cachedData);
      expect(freshPlotService.litData.set).not.toHaveBeenCalledWith({ litCode: 'base' });
    });
  });

  describe('Deferred calculation during loading', () => {
    it('should calculate immediately when loading is false', () => {
      const mockBaseData = { litCode: 'base' } as unknown as GetSectionOutput;
      const loadingSignal = signal(false);
      const sectionSignal = signal<Section | null>({
        ...mockSection,
        selected_charge_uuid: null,
        charges: [mockCharge]
      } as Section);
      const freshPlotService = {
        ...mockPlotService,
        baseLitData: signal(mockBaseData),
        litData: signal<GetSectionOutput | null>(null),
        litDataCache: new Map(),
        loading: loadingSignal
      };
      const freshSpanService = {
        section: sectionSignal
      };
      const spyCalculateLoad = vi.fn();

      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          LoadFormsService,
          { provide: PlotService, useValue: freshPlotService },
          { provide: PlotSpanService, useValue: freshSpanService },
          { provide: PlotOptionsService, useValue: plotOptionsServiceMock },
          { provide: ChargesService, useValue: mockChargesService },
          { provide: WorkerPythonService, useValue: mockWorkerPythonService },
          { provide: ObstacleStateService, useValue: mockObstacleStateService }
        ]
      });

      const freshService = TestBed.inject(LoadFormsService);
      freshService.calculateLoad = spyCalculateLoad;
      TestBed.flushEffects();

      // Now change to a charge (simulating user selecting a charge)
      sectionSignal.set({
        ...mockSection,
        selected_charge_uuid: 'charge-uuid-1',
        charges: [mockCharge]
      } as Section);
      TestBed.flushEffects();

      // Verify calculateLoad was called immediately
      expect(spyCalculateLoad).toHaveBeenCalled();
    });

    it('should defer calculation when loading is true', () => {
      const mockBaseData = { litCode: 'base' } as unknown as GetSectionOutput;
      const loadingSignal = signal(true);
      const sectionSignal = signal<Section | null>({
        ...mockSection,
        selected_charge_uuid: null,
        charges: [mockCharge]
      } as Section);
      const freshPlotService = {
        ...mockPlotService,
        baseLitData: signal(mockBaseData),
        litData: signal<GetSectionOutput | null>(null),
        litDataCache: new Map(),
        loading: loadingSignal
      };
      const freshSpanService = {
        section: sectionSignal
      };
      const spyCalculateLoad = vi.fn();

      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          LoadFormsService,
          { provide: PlotService, useValue: freshPlotService },
          { provide: PlotSpanService, useValue: freshSpanService },
          { provide: PlotOptionsService, useValue: plotOptionsServiceMock },
          { provide: ChargesService, useValue: mockChargesService },
          { provide: WorkerPythonService, useValue: mockWorkerPythonService },
          { provide: ObstacleStateService, useValue: mockObstacleStateService }
        ]
      });

      const freshService = TestBed.inject(LoadFormsService);
      freshService.calculateLoad = spyCalculateLoad;
      TestBed.flushEffects();

      // Now change to a charge while loading is true
      sectionSignal.set({
        ...mockSection,
        selected_charge_uuid: 'charge-uuid-1',
        charges: [mockCharge]
      } as Section);
      TestBed.flushEffects();

      // Verify calculateLoad was NOT called because loading is true
      expect(spyCalculateLoad).not.toHaveBeenCalled();
      // Verify the pending flag is set (accessing private property via type assertion)
      const pendingUuid = (
        freshService as unknown as { _pendingChargeCalculation: () => string | null }
      )._pendingChargeCalculation();
      expect(pendingUuid).toBe('charge-uuid-1');
    });

    it('should trigger pending calculation when loading becomes false', () => {
      const mockBaseData = { litCode: 'base' } as unknown as GetSectionOutput;
      const loadingSignal = signal(true);
      const sectionSignal = signal<Section | null>({
        ...mockSection,
        selected_charge_uuid: null,
        charges: [mockCharge]
      } as Section);
      const freshPlotService = {
        ...mockPlotService,
        baseLitData: signal(mockBaseData),
        litData: signal<GetSectionOutput | null>(null),
        litDataCache: new Map(),
        loading: loadingSignal
      };
      const freshSpanService = {
        section: sectionSignal
      };
      const spyCalculateLoad = vi.fn();

      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          LoadFormsService,
          { provide: PlotService, useValue: freshPlotService },
          { provide: PlotSpanService, useValue: freshSpanService },
          { provide: PlotOptionsService, useValue: plotOptionsServiceMock },
          { provide: ChargesService, useValue: mockChargesService },
          { provide: WorkerPythonService, useValue: mockWorkerPythonService },
          { provide: ObstacleStateService, useValue: mockObstacleStateService }
        ]
      });

      const freshService = TestBed.inject(LoadFormsService);
      freshService.calculateLoad = spyCalculateLoad;
      TestBed.flushEffects();

      // Change to a charge while loading is true
      sectionSignal.set({
        ...mockSection,
        selected_charge_uuid: 'charge-uuid-1',
        charges: [mockCharge]
      } as Section);
      TestBed.flushEffects();

      // Initially loading is true, so no calculation
      expect(spyCalculateLoad).not.toHaveBeenCalled();

      // Now set loading to false
      loadingSignal.set(false);
      TestBed.flushEffects();

      // Verify calculateLoad was called after loading became false
      expect(spyCalculateLoad).toHaveBeenCalled();
      // Verify the pending flag is cleared
      const pendingUuid = (
        freshService as unknown as { _pendingChargeCalculation: () => string | null }
      )._pendingChargeCalculation();
      expect(pendingUuid).toBeNull();
    });

    it('should discard pending calculation if charge has changed again', () => {
      const mockBaseData = { litCode: 'base' } as unknown as GetSectionOutput;
      const loadingSignal = createSignalMock(true);
      const sectionSignal = createSignalMock({
        ...mockSection,
        selected_charge_uuid: 'charge-uuid-1',
        charges: [mockCharge, { ...mockCharge, uuid: 'charge-uuid-2', name: 'Charge 2' }]
      } as Section);
      const freshPlotService = {
        ...mockPlotService,
        baseLitData: vi.fn().mockReturnValue(mockBaseData),
        litData: { set: vi.fn() },
        litDataCache: new Map(),
        loading: loadingSignal
      };
      const freshSpanService = {
        section: sectionSignal
      };
      const spyCalculateLoad = vi.fn();

      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          LoadFormsService,
          { provide: PlotService, useValue: freshPlotService },
          { provide: PlotSpanService, useValue: freshSpanService },
          { provide: PlotOptionsService, useValue: plotOptionsServiceMock },
          { provide: ChargesService, useValue: mockChargesService },
          { provide: WorkerPythonService, useValue: mockWorkerPythonService },
          { provide: ObstacleStateService, useValue: mockObstacleStateService }
        ]
      });

      const freshService = TestBed.inject(LoadFormsService);
      freshService.calculateLoad = spyCalculateLoad;
      TestBed.flushEffects();

      // Initially loading is true, charge-uuid-1 is pending
      expect(spyCalculateLoad).not.toHaveBeenCalled();

      // Change to charge-uuid-2
      sectionSignal.set({
        ...mockSection,
        selected_charge_uuid: 'charge-uuid-2',
        charges: [mockCharge, { ...mockCharge, uuid: 'charge-uuid-2', name: 'Charge 2' }]
      } as Section);
      TestBed.flushEffects();

      // Now set loading to false
      loadingSignal.set(false);
      TestBed.flushEffects();

      // Verify pending calculation was discarded (UUID mismatch)
      // The pending was charge-uuid-1 but current is charge-uuid-2
      const pendingUuid = (
        freshService as unknown as { _pendingChargeCalculation: () => string | null }
      )._pendingChargeCalculation();
      expect(pendingUuid).toBeNull();
    });

    it('should handle multiple rapid charge changes during loading', () => {
      const mockBaseData = { litCode: 'base' } as unknown as GetSectionOutput;
      const loadingSignal = signal(true);
      const sectionSignal = signal<Section | null>({
        ...mockSection,
        selected_charge_uuid: null,
        charges: [
          mockCharge,
          { ...mockCharge, uuid: 'charge-uuid-2', name: 'Charge 2' },
          { ...mockCharge, uuid: 'charge-uuid-3', name: 'Charge 3' }
        ]
      } as Section);
      const freshPlotService = {
        ...mockPlotService,
        baseLitData: signal(mockBaseData),
        litData: signal<GetSectionOutput | null>(null),
        litDataCache: new Map(),
        loading: loadingSignal
      };
      const freshSpanService = {
        section: sectionSignal
      };
      const spyCalculateLoad = vi.fn();

      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          LoadFormsService,
          { provide: PlotService, useValue: freshPlotService },
          { provide: PlotSpanService, useValue: freshSpanService },
          { provide: PlotOptionsService, useValue: plotOptionsServiceMock },
          { provide: ChargesService, useValue: mockChargesService },
          { provide: WorkerPythonService, useValue: mockWorkerPythonService },
          { provide: ObstacleStateService, useValue: mockObstacleStateService }
        ]
      });

      const freshService = TestBed.inject(LoadFormsService);
      freshService.calculateLoad = spyCalculateLoad;
      TestBed.flushEffects();

      // Change to charge-uuid-1
      sectionSignal.set({
        ...mockSection,
        selected_charge_uuid: 'charge-uuid-1',
        charges: [
          mockCharge,
          { ...mockCharge, uuid: 'charge-uuid-2', name: 'Charge 2' },
          { ...mockCharge, uuid: 'charge-uuid-3', name: 'Charge 3' }
        ]
      } as Section);
      TestBed.flushEffects();

      // Change to charge-uuid-2
      sectionSignal.set({
        ...mockSection,
        selected_charge_uuid: 'charge-uuid-2',
        charges: [
          mockCharge,
          { ...mockCharge, uuid: 'charge-uuid-2', name: 'Charge 2' },
          { ...mockCharge, uuid: 'charge-uuid-3', name: 'Charge 3' }
        ]
      } as Section);
      TestBed.flushEffects();

      // Change to charge-uuid-3
      sectionSignal.set({
        ...mockSection,
        selected_charge_uuid: 'charge-uuid-3',
        charges: [
          mockCharge,
          { ...mockCharge, uuid: 'charge-uuid-2', name: 'Charge 2' },
          { ...mockCharge, uuid: 'charge-uuid-3', name: 'Charge 3' }
        ]
      } as Section);
      TestBed.flushEffects();

      // Now set loading to false
      loadingSignal.set(false);
      TestBed.flushEffects();

      // Verify calculateLoad was called only once for the last charge (charge-uuid-3)
      expect(spyCalculateLoad).toHaveBeenCalledTimes(1);
    });

    it('should use cache immediately even when loading is true', () => {
      const cachedData = { litCode: 'cached' } as unknown as GetSectionOutput;
      const cache = new Map([['charge-uuid-1', cachedData]]);
      const loadingSignal = createSignalMock(true);
      const freshPlotService = {
        ...mockPlotService,
        baseLitData: vi.fn().mockReturnValue({ litCode: 'base' }),
        litData: { set: vi.fn() },
        litDataCache: cache,
        loading: loadingSignal
      };
      const freshSpanService = {
        section: vi.fn().mockReturnValue({
          ...mockSection,
          selected_charge_uuid: 'charge-uuid-1',
          charges: [mockCharge]
        } as Section)
      };
      const spyCalculateLoad = vi.fn();

      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          LoadFormsService,
          { provide: PlotService, useValue: freshPlotService },
          { provide: PlotSpanService, useValue: freshSpanService },
          { provide: PlotOptionsService, useValue: plotOptionsServiceMock },
          { provide: ChargesService, useValue: mockChargesService },
          { provide: WorkerPythonService, useValue: mockWorkerPythonService },
          { provide: ObstacleStateService, useValue: mockObstacleStateService }
        ]
      });

      const freshService = TestBed.inject(LoadFormsService);
      freshService.calculateLoad = spyCalculateLoad;
      TestBed.flushEffects();

      // Verify cache was used immediately
      expect(freshPlotService.litData.set).toHaveBeenCalledWith(cachedData);
      // Verify calculateLoad was NOT called (cache hit)
      expect(spyCalculateLoad).not.toHaveBeenCalled();
      // Verify no pending calculation
      const pendingUuid = (
        freshService as unknown as { _pendingChargeCalculation: () => string | null }
      )._pendingChargeCalculation();
      expect(pendingUuid).toBeNull();
    });
  });
});
