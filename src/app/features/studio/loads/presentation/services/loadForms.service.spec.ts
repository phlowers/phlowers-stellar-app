import { TestBed } from '@angular/core/testing';
import { LoadFormsService } from './loadForms.service';
import { PlotService } from '@services/plot/plot.service';
import { ChargesService } from '@services/charges/charges.service';
import { Section, Charge, SymmetryType } from '@shared/domain';
import { Study } from '@shared/domain/models/study.model';
import { ChargeData, LoadType } from '@shared/domain/models/charge.model';

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
  let mockChargesService: vi.Mocked<ChargesService>;

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
      refreshCamera: vi.fn(),
      reapplyObstacles: vi.fn().mockResolvedValue(undefined)
    } as unknown as vi.Mocked<PlotService>;

    mockChargesService = {
      getSelectedChargeCase: vi.fn(),
      createOrUpdateCharge: vi.fn(),
      deleteCharge: vi.fn()
    } as unknown as vi.Mocked<ChargesService>;

    TestBed.configureTestingModule({
      providers: [
        LoadFormsService,
        { provide: PlotService, useValue: mockPlotService },
        { provide: ChargesService, useValue: mockChargesService }
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
      mockPlotService.study.mockReturnValue({ uuid: 'study-uuid' } as Partial<Study> as Study);
      mockPlotService.section.mockReturnValue(null);

      await service.saveTemporaryLoadDataInSection();

      expect(mockChargesService.getSelectedChargeCase).not.toHaveBeenCalled();
    });

    it('should return early when currentCharge is null', async () => {
      mockPlotService.temporaryLoadData = mockChargeData;
      mockPlotService.study.mockReturnValue({ uuid: 'study-uuid' } as Partial<Study> as Study);
      mockPlotService.section.mockReturnValue(mockSection);
      mockChargesService.getSelectedChargeCase.mockResolvedValue(null);

      await service.saveTemporaryLoadDataInSection();

      expect(mockChargesService.createOrUpdateCharge).not.toHaveBeenCalled();
    });

    it('should save temporaryLoadData to charge', async () => {
      mockPlotService.temporaryLoadData = mockChargeData;
      mockPlotService.study.mockReturnValue({ uuid: 'study-uuid' } as Partial<Study> as Study);
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

      expect(mockPlotService.reapplyObstacles).not.toHaveBeenCalled();
      expect(mockPlotService.refreshCamera).not.toHaveBeenCalled();
    });

    it('should call refreshCamera and reapplyObstacles when temporaryLoadData is set', async () => {
      mockPlotService.temporaryLoadData = mockChargeData;
      mockPlotService.section.mockReturnValue(mockSection);

      await service.calculateLoad();

      expect(mockPlotService.refreshCamera).toHaveBeenCalled();
      expect(mockPlotService.reapplyObstacles).toHaveBeenCalled();
    });

    it('should update temporaryLoadData spanLoads with rechecked values before delegating', async () => {
      mockPlotService.temporaryLoadData = mockChargeData;
      mockPlotService.section.mockReturnValue(mockSection);

      await service.calculateLoad();

      // After recheckSpanLoads, the spanLoads should include an entry for each support
      expect(mockPlotService.temporaryLoadData?.spanLoads).toBeDefined();
      expect(mockPlotService.temporaryLoadData?.spanLoads.some((l) => l.supportUuid === 'support-uuid-1')).toBe(true);
    });

    it('should set loading to true then false', async () => {
      mockPlotService.temporaryLoadData = mockChargeData;
      mockPlotService.section.mockReturnValue(mockSection);

      await service.calculateLoad();

      expect(mockPlotService.loading.set).toHaveBeenCalledWith(true);
      expect(mockPlotService.loading.set).toHaveBeenCalledWith(false);
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
      mockPlotService.study.mockReturnValue({ uuid: 'study-uuid' } as Partial<Study> as Study);
      mockPlotService.section.mockReturnValue(null);

      service.deleteLoad();

      expect(mockChargesService.deleteCharge).not.toHaveBeenCalled();
    });

    it('should return early when chargeUuid is missing', () => {
      mockPlotService.study.mockReturnValue({ uuid: 'study-uuid' } as Partial<Study> as Study);
      mockPlotService.section.mockReturnValue({
        ...mockSection,
        selected_charge_uuid: null
      } as Section);

      service.deleteLoad();

      expect(mockChargesService.deleteCharge).not.toHaveBeenCalled();
    });

    it('should call deleteCharge with correct parameters', () => {
      mockPlotService.study.mockReturnValue({ uuid: 'study-uuid' } as Partial<Study> as Study);
      mockPlotService.section.mockReturnValue({
        ...mockSection,
        selected_charge_uuid: 'charge-uuid-1'
      } as Section);

      service.deleteLoad();

      expect(mockChargesService.deleteCharge).toHaveBeenCalledWith('study-uuid', 'section-uuid-1', 'charge-uuid-1');
    });
  });
});
