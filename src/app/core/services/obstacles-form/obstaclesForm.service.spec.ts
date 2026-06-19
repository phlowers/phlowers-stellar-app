import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { PlotService } from '@services/plot/plot.service';
import { PlotSpanService } from '@services/plot/plot-span.service';
import { PlotOptionsService } from '@services/plot/plot-options.service';
import { ObstaclesService } from '@services/obstacles/obstacles.service';
import { SectionService } from '@services/section/section.service';
import { MessageService } from 'primeng/api';
import { signal } from '@angular/core';
import { LateralDistanceType, Obstacle, Position3D, ReferenceSupport } from '@shared/domain/models/obstacle.model';
import { Section, Study, Support } from '@shared/domain';
import { ObstacleFormService } from './obstaclesForm.service';
import { DEBOUNCED_UPDATE_POINT_DELAY } from '@shared/domain/obstacles/obstacle-form.constants';
import { Distance } from '@services/worker_python/tasks/types';
import { ChargeData } from '@shared/domain/models/charge.model';
import { ObstacleStateService } from '@services/obstacle-state/obstacle-state.service';

const mockSupports: Support[] = [
  {
    uuid: 'sup-1',
    number: '10',
    name: 'Support 10',
    spanLength: 0,
    spanAngle: 0,
    attachmentSet: 0,
    attachmentHeight: 0,
    heightBelowConsole: 0,
    towerModel: null,
    cableType: null,
    armLength: null,
    chainName: null,
    chainLength: null,
    chainWeight: null,
    chainV: null,
    counterWeight: null,
    supportFootAltitude: null,
    attachmentPosition: null,
    chainSurface: null,
    spanAzimut: null,
    xFootLambert93: null,
    yFootLambert93: null
  },
  {
    uuid: 'sup-2',
    number: '20',
    name: 'Support 20',
    spanLength: 0,
    spanAngle: 0,
    attachmentSet: 0,
    attachmentHeight: 0,
    heightBelowConsole: 0,
    towerModel: null,
    cableType: null,
    armLength: null,
    chainName: null,
    chainLength: null,
    chainWeight: null,
    chainV: null,
    counterWeight: null,
    supportFootAltitude: null,
    attachmentPosition: null,
    chainSurface: null,
    spanAzimut: null,
    xFootLambert93: null,
    yFootLambert93: null
  }
];

const mockSection: Section = {
  uuid: 'sec-1',
  internal_id: '1',
  name: 'Section',
  short_name: 'S1',
  created_at: '',
  updated_at: '',
  internal_catalog_id: '',
  type: '',
  electric_phase_number: 1,
  cable_name: '',
  cable_short_name: '',
  cables_amount: 1,
  optical_fibers_amount: 1,
  spans_amount: 1,
  begin_span_name: '',
  last_span_name: '',
  first_support_number: 1,
  last_support_number: 2,
  first_attachment_set: '',
  last_attachment_set: '',
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
  supports: mockSupports,
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
  start_azimuth: null
};

const mockStudy: Study = {
  uuid: 'study-1',
  title: 'Study',
  description: '',
  author_email: '',
  shareable: false,
  saved: true,
  created_at_offline: '',
  updated_at_offline: '',
  sections: []
};

const baseObstacle: Obstacle = {
  uuid: 'obs-1',
  supportUuid: 'sup-1',
  supportIndex: 0,
  name: 'Obstacle 1',
  type: 'House',
  altitudeType: 'absolute',
  lateralDistanceType: LateralDistanceType.SPAN_AXIS,
  referenceSupport: ReferenceSupport.LEFT,
  positions: []
};

describe('ObstacleFormService', () => {
  let service: ObstacleFormService;
  let mockObstacleStateService: {
    distances: ReturnType<typeof signal<Distance[]>>;
    distanceType: ReturnType<typeof signal<'oblique' | 'vertical' | 'horizontal' | null>>;
    addObstacle: ReturnType<typeof vi.fn>;
    deleteObstacle: ReturnType<typeof vi.fn>;
    clearAllObstacles: ReturnType<typeof vi.fn>;
    calculateDistances: ReturnType<typeof vi.fn>;
    syncObstacles: ReturnType<typeof vi.fn>;
    reset: ReturnType<typeof vi.fn>;
  };
  let mockPlotService: {
    plotOptionsChange: vi.Mock;
    temporaryLoadData: ChargeData | null;
    study: ReturnType<typeof signal<Study | null>>;
    litData: ReturnType<typeof signal<unknown>>;
    loading: ReturnType<typeof signal<boolean>>;
    error: ReturnType<typeof signal<unknown>>;
  };
  let mockSpanService: {
    getSupportIndex: vi.Mock;
    getSupportOptions: vi.Mock;
    getSpanOptions: vi.Mock;
    spanAmountChoice: ReturnType<typeof signal<'single' | 'double' | 'all'>>;
    section: ReturnType<typeof signal<Section | null>>;
  };
  let plotOptionsServiceMock: {
    plotOptions: ReturnType<typeof signal<{ startSupport: number; endSupport: number; view: string }>>;
    camera: ReturnType<typeof signal<unknown | null>>;
  };
  let mockObstaclesService: {
    activePointIndex: ReturnType<typeof signal<number | null>>;
    setCurrentPointIndex: vi.Mock;
    selectedObstacleUuid: ReturnType<typeof signal<string | null>>;
    setSelectedObstacle: vi.Mock;
  };
  let mockSectionService: { createOrUpdateSection: vi.Mock };
  let mockMessageService: { add: vi.Mock };

  beforeEach(() => {
    const sectionSignal = signal<Section | null>({ ...mockSection });
    const spanAmountChoiceSignal = signal<'single' | 'double' | 'all'>('all');
    mockObstacleStateService = {
      distances: signal<Distance[]>([]),
      distanceType: signal<'oblique' | 'vertical' | 'horizontal' | null>(null),
      addObstacle: vi.fn().mockResolvedValue(null),
      deleteObstacle: vi.fn().mockResolvedValue(null),
      clearAllObstacles: vi.fn().mockResolvedValue(null),
      calculateDistances: vi.fn().mockResolvedValue(undefined),
      syncObstacles: vi.fn().mockResolvedValue(null),
      reset: vi.fn()
    };
    mockPlotService = {
      plotOptionsChange: vi.fn(),
      temporaryLoadData: null,
      study: signal<Study | null>(mockStudy),
      litData: signal(null),
      loading: signal(false),
      error: signal(null)
    };
    mockSpanService = {
      getSupportIndex: vi.fn().mockReturnValue(0),
      getSupportOptions: vi.fn().mockReturnValue([
        { label: '10', value: 'LEFT' },
        { label: '20', value: 'RIGHT' }
      ]),
      getSpanOptions: vi.fn().mockReturnValue([{ label: '10 - 20', value: 'sup-1' }]),
      spanAmountChoice: spanAmountChoiceSignal,
      section: sectionSignal
    };
    plotOptionsServiceMock = {
      plotOptions: signal({ startSupport: 0, endSupport: 1, view: '3d' }),
      camera: signal(null)
    };
    mockObstaclesService = {
      activePointIndex: signal<number | null>(null),
      setCurrentPointIndex: vi.fn(),
      selectedObstacleUuid: signal<string | null>(null),
      setSelectedObstacle: vi.fn().mockImplementation((uuid: string | null, pointIndex: number | null) => {
        mockObstaclesService.selectedObstacleUuid.set(uuid);
        mockObstaclesService.activePointIndex.set(pointIndex);
      })
    };
    mockSectionService = {
      createOrUpdateSection: vi.fn().mockResolvedValue(undefined)
    };
    mockMessageService = {
      add: vi.fn()
    };

    TestBed.configureTestingModule({
      imports: [ReactiveFormsModule],
      providers: [
        ObstacleFormService,
        { provide: PlotService, useValue: mockPlotService },
        { provide: PlotSpanService, useValue: mockSpanService },
        { provide: PlotOptionsService, useValue: plotOptionsServiceMock },
        { provide: ObstaclesService, useValue: mockObstaclesService },
        { provide: ObstacleStateService, useValue: mockObstacleStateService },
        { provide: SectionService, useValue: mockSectionService },
        { provide: MessageService, useValue: mockMessageService }
      ]
    });
    service = TestBed.inject(ObstacleFormService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('form and positions', () => {
    it('should expose positions as FormArray', () => {
      expect(service.positions).toBe(service.form.get('positions'));
      expect(service.positions.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('createPositionGroup', () => {
    it('should create a position group with default nulls', () => {
      const group = service.createPositionGroup();
      expect(group.get('x')?.value).toBeNull();
      expect(group.get('y')?.value).toBeNull();
      expect(group.get('z')?.value).toBeNull();
    });
    it('should create a position group with given values', () => {
      const pos: Position3D = { x: 1, y: 2, z: 3 };
      const group = service.createPositionGroup(pos);
      expect(group.get('x')?.value).toBe(1);
      expect(group.get('y')?.value).toBe(2);
      expect(group.get('z')?.value).toBe(3);
    });
  });

  describe('buildPositionControls', () => {
    it('should build controls from positions list', () => {
      const controls = (
        service as unknown as {
          buildPositionControls: (positions: Position3D[]) => FormGroup[];
        }
      ).buildPositionControls([{ x: 1, y: 2, z: 3 }]);
      expect(controls).toHaveLength(1);
      expect(controls[0].get('x')?.value).toBe(1);
    });
  });

  describe('addPosition / removePosition / clearPositions / setPositions', () => {
    it('should add a position', () => {
      const len = service.positions.length;
      service.addPosition();
      expect(service.positions.length).toBe(len + 1);
      service.addPosition({ x: 10, y: 20, z: 30 });
      expect(service.positions.length).toBe(len + 2);
      expect(service.positions.at(len + 1).get('x')?.value).toBe(10);
    });
    it('should remove position at index', () => {
      service.addPosition();
      service.addPosition();
      service.removePosition(0);
      expect(service.positions.length).toBe(1);
    });
    it('should clear all positions', () => {
      service.addPosition();
      service.addPosition();
      service.clearPositions();
      expect(service.positions.length).toBe(0);
    });
    it('should set positions from array', () => {
      service.addPosition();
      service.setPositions([
        { x: 1, y: 2, z: 3 },
        { x: 4, y: 5, z: 6 }
      ]);
      expect(service.positions.length).toBe(2);
      expect(service.positions.at(0).get('x')?.value).toBe(1);
      expect(service.positions.at(1).get('x')?.value).toBe(4);
    });
  });

  describe('setExistingObstacle', () => {
    it('should patch form and set positions', () => {
      const obstacle: Obstacle = { ...baseObstacle, positions: [{ x: 1, y: 2, z: 3 }] };
      service.setExistingObstacle(obstacle, 0);
      expect(service.form.get('uuid')?.value).toBe('obs-1');
      expect(service.form.get('name')?.value).toBe('Obstacle 1');
      expect(service.supportsOptions()).toEqual([
        { label: '10', value: 'LEFT' },
        { label: '20', value: 'RIGHT' }
      ]);
      expect(service.positions.length).toBe(1);
      expect(service.positions.at(0).get('x')?.value).toBe(1);
      expect(mockObstaclesService.setCurrentPointIndex).toHaveBeenCalledWith(0);
    });
  });

  describe('resetFormForNewObstacle', () => {
    it('should reset form when supportUuid is null', fakeAsync(() => {
      const result = service.resetFormForNewObstacle(null);
      tick(DEBOUNCED_UPDATE_POINT_DELAY);
      expect(service.form.get('uuid')?.value).toBeTruthy();
      expect(service.form.get('supportUuid')?.value).toBeNull();
      expect(service.positions.length).toBe(0);
      expect(service.results()).toEqual({
        oblique: null,
        vertical: null,
        horizontal: null
      });
      expect(result).toBeDefined();
    }));
    it('should update supportsOptions when supportUuid is valid', () => {
      service.resetFormForNewObstacle('sup-1');
      expect(mockPlotService.plotOptionsChange).not.toHaveBeenCalled();
      expect(service.supportsOptions()).toEqual([
        { label: '10', value: 'LEFT' },
        { label: '20', value: 'RIGHT' }
      ]);
    });
    it('should clear supportsOptions when supportUuid is null', () => {
      // Pre-populate so we can verify the clear
      service.supportsOptions.set([
        { label: '10', value: 'LEFT' },
        { label: '20', value: 'RIGHT' }
      ]);
      service.resetFormForNewObstacle(null);
      expect(mockSpanService.getSupportOptions).not.toHaveBeenCalled();
      expect(service.supportsOptions()).toEqual([]);
    });

    it('should immediately set supportUuid to null when called with null, allowing re-selection of the same span to repopulate supportsOptions', fakeAsync(() => {
      // Step 1: select span 'sup-1' and populate supportsOptions
      service.form.get('supportUuid')?.setValue('sup-1');
      service.resetFormForNewObstacle('sup-1');
      expect(service.supportsOptions()).toEqual([
        { label: '10', value: 'LEFT' },
        { label: '20', value: 'RIGHT' }
      ]);

      // Step 2: click "create new obstacle" — clears options and must immediately null supportUuid
      service.resetFormForNewObstacle(null);
      expect(service.supportsOptions()).toEqual([]);
      // supportUuid must be null synchronously so the component's distinctUntilChanged()
      // can detect a subsequent re-selection of the same span as a genuine change
      expect(service.form.get('supportUuid')?.value).toBeNull();

      // Step 3: re-select the same span 'sup-1' — simulates what the component effect does
      // after detecting the null → 'sup-1' transition
      service.resetFormForNewObstacle('sup-1');
      expect(service.supportsOptions()).toEqual([
        { label: '10', value: 'LEFT' },
        { label: '20', value: 'RIGHT' }
      ]);

      tick(DEBOUNCED_UPDATE_POINT_DELAY);
    }));
  });

  describe('loadObstacle', () => {
    it('should do nothing when obstacle not found', () => {
      mockSpanService.section.set({ ...mockSection, obstacles: [] });
      service.loadObstacle('nonexistent');
      expect(service.form.get('name')?.value).toBeFalsy();
    });
    it('should do nothing when support is not found', () => {
      const obstacles: Obstacle[] = [{ ...baseObstacle, supportUuid: 'missing-support' }];
      mockSpanService.section.set({ ...mockSection, supports: [], obstacles });
      service.loadObstacle('obs-1');
      expect(service.form.get('supportUuid')?.value).toBeNull();
    });
    it('should do nothing when obstacle is not in span options', () => {
      const obstacles: Obstacle[] = [{ ...baseObstacle }];
      mockSpanService.section.set({ ...mockSection, obstacles });
      mockSpanService.getSpanOptions.mockReturnValue([{ label: '2 - 3', value: 'sup-2' }]);
      service.loadObstacle('obs-1');
      expect(service.form.get('supportUuid')?.value).toBeNull();
    });
    it('should patch form when obstacle and support found', () => {
      const obstacles: Obstacle[] = [{ ...baseObstacle }];
      mockSpanService.section.set({ ...mockSection, obstacles });
      mockSpanService.getSpanOptions.mockReturnValue([{ label: '1 - 2', value: 'sup-1' }]);
      service.loadObstacle('obs-1');
      expect(service.form.get('supportUuid')?.value).toBe('sup-1');
      expect(service.form.get('name')?.value).toContain('Obstacle');
    });
    it('should set referenceSupport to RIGHT when support differs', () => {
      const obstacles: Obstacle[] = [
        {
          uuid: 'obs-1',
          supportUuid: 'sup-1',
          supportIndex: 0,
          name: 'Obstacle 1',
          type: 'House',
          altitudeType: 'absolute',
          lateralDistanceType: LateralDistanceType.SPAN_AXIS,
          referenceSupport: ReferenceSupport.LEFT,
          positions: []
        }
      ];
      mockSpanService.section.set({ ...mockSection, obstacles });
      mockSpanService.getSpanOptions.mockReturnValue([{ label: '1 - 2', value: 'sup-1' }]);
      vi.spyOn(
        service as unknown as { findSupportForObstacle: () => Support | undefined },
        'findSupportForObstacle'
      ).mockReturnValue({ uuid: 'sup-2', number: 2 } as unknown as Support);

      service.loadObstacle('obs-1');

      expect(service.form.get('referenceSupport')?.value).toBe(ReferenceSupport.RIGHT);
    });
  });

  describe('deletePoint', () => {
    it('should remove position and update current point index', () => {
      service.addPosition();
      service.addPosition();
      service.deletePoint(0);
      expect(service.positions.length).toBe(1);
      expect(mockObstaclesService.setCurrentPointIndex).toHaveBeenCalled();
    });
    it('should use activePointIndex when index not provided', () => {
      mockObstaclesService.activePointIndex.set(0);
      service.addPosition();
      service.deletePoint();
      expect(mockObstaclesService.setCurrentPointIndex).toHaveBeenCalled();
    });
    it('should remove point from litData.obstacles for the matching obstacle', () => {
      const obstacleUuid = 'obs-lit-1';
      service.form.patchValue({ uuid: obstacleUuid });
      service.addPosition({ x: 1, y: 2, z: 3 });
      service.addPosition({ x: 4, y: 5, z: 6 });

      const litData = {
        obstacles: [
          {
            uuid: obstacleUuid,
            points: [[10, 20, 30] as [number, number, number], [40, 50, 60] as [number, number, number]]
          },
          { uuid: 'other-obs', points: [[70, 80, 90] as [number, number, number]] }
        ]
      };
      mockPlotService.litData.set(litData);

      service.deletePoint(0);

      const updatedLitData = mockPlotService.litData() as { obstacles: { points: [number, number, number][] }[] };
      expect(updatedLitData.obstacles[0].points).toEqual([[40, 50, 60]]);
      expect(updatedLitData.obstacles[1].points).toEqual([[70, 80, 90]]);
    });
    it('should not update litData when litData is null', () => {
      service.form.patchValue({ uuid: 'obs-1' });
      service.addPosition({ x: 1, y: 2, z: 3 });
      mockPlotService.litData.set(null);

      service.deletePoint(0);

      expect(mockPlotService.litData()).toBeNull();
    });
    it('should not update litData when obstacle uuid is empty', () => {
      service.form.patchValue({ uuid: null });
      service.addPosition({ x: 1, y: 2, z: 3 });
      const litData = { obstacles: [{ uuid: 'obs-1', points: [[1, 2, 3] as [number, number, number]] }] };
      mockPlotService.litData.set(litData);

      service.deletePoint(0);

      expect(mockPlotService.litData()).toEqual(litData);
    });
  });

  describe('deleteObstacle', () => {
    it('should return early when no obstacle uuid', async () => {
      service.form.patchValue({ uuid: null });
      await service.deleteObstacle();
      expect(mockSectionService.createOrUpdateSection).not.toHaveBeenCalled();
    });
    it('should return early when no study or section', async () => {
      service.form.patchValue({ uuid: 'obs-1' });
      mockPlotService.study.set(null);
      await service.deleteObstacle();
      mockPlotService.study.set(mockStudy);
      expect(mockSectionService.createOrUpdateSection).not.toHaveBeenCalled();
    });
    it('should return early when obstacle is missing in section', async () => {
      const section = { ...mockSection, obstacles: [] as Obstacle[] } as Section;
      mockSpanService.section.set(section);
      mockPlotService.study.set(mockStudy);
      service.form.patchValue({ uuid: 'missing-uuid' });
      await service.deleteObstacle();
      expect(mockSectionService.createOrUpdateSection).not.toHaveBeenCalled();
    });
    it('should handle undefined obstacles collection safely', async () => {
      const section = { ...mockSection, obstacles: undefined } as unknown as Section;
      mockSpanService.section.set(section);
      mockPlotService.study.set(mockStudy);
      service.form.patchValue({ uuid: 'missing-uuid' });
      await service.deleteObstacle();
      expect(mockSectionService.createOrUpdateSection).not.toHaveBeenCalled();
    });
    it('should remove obstacle and call sectionService when obstacle exists', async () => {
      const obstacles: Obstacle[] = [{ ...baseObstacle }];
      const section = { ...mockSection, obstacles: [...obstacles] } as Section;
      mockSpanService.section.set(section);
      mockPlotService.study.set(mockStudy);
      service.form.patchValue({ uuid: 'obs-1' });
      await service.deleteObstacle();
      const updatedSection = mockSpanService.section();
      expect(updatedSection?.obstacles.length).toBe(0);
      expect(mockSectionService.createOrUpdateSection).toHaveBeenCalledWith(
        mockStudy,
        expect.objectContaining({ obstacles: [] })
      );
      expect(mockObstacleStateService.deleteObstacle).toHaveBeenCalledWith(
        'obs-1',
        plotOptionsServiceMock.plotOptions()
      );
      expect(mockObstacleStateService.addObstacle).toHaveBeenCalledWith([], plotOptionsServiceMock.plotOptions());
      expect(mockMessageService.add).toHaveBeenCalledWith(
        expect.objectContaining({
          severity: 'success',
          summary: expect.any(String),
          detail: expect.any(String)
        })
      );
      expect(mockObstaclesService.setSelectedObstacle).toHaveBeenCalledWith(null, null);
    });

    it('should clear litData.obstacles when addObstacle returns null after deletion', async () => {
      const obstacles: Obstacle[] = [{ ...baseObstacle }];
      const section = { ...mockSection, obstacles: [...obstacles] } as Section;
      mockSpanService.section.set(section);
      mockPlotService.study.set(mockStudy);
      mockPlotService.litData.set({
        obstacles: [{ uuid: 'obs-1', points: [[1, 2, 3] as [number, number, number]] }]
      });
      mockObstacleStateService.addObstacle.mockResolvedValue(null);
      service.form.patchValue({ uuid: 'obs-1' });

      await service.deleteObstacle();

      expect((mockPlotService.litData() as { obstacles: unknown[] }).obstacles).toEqual([]);
    });

    it('should rollback section and avoid persistence when worker deletion fails', async () => {
      const obstacles: Obstacle[] = [
        {
          uuid: 'obs-1',
          supportUuid: 'sup-1',
          supportIndex: 0,
          name: 'Obstacle 1',
          type: 'House',
          altitudeType: 'absolute',
          lateralDistanceType: LateralDistanceType.SPAN_AXIS,
          referenceSupport: ReferenceSupport.LEFT,
          positions: []
        }
      ];
      const section = { ...mockSection, obstacles: [...obstacles] } as Section;
      mockSpanService.section.set(section);
      mockPlotService.study.set(mockStudy);
      service.form.patchValue({ uuid: 'obs-1' });
      mockObstacleStateService.deleteObstacle.mockRejectedValue(new Error('worker failure'));

      await service.deleteObstacle();

      expect(mockSectionService.createOrUpdateSection).not.toHaveBeenCalled();
      expect(mockSpanService.section()?.obstacles).toEqual(obstacles);
      expect(mockObstacleStateService.clearAllObstacles).toHaveBeenCalledTimes(1);
      expect(mockObstacleStateService.syncObstacles).toHaveBeenCalledWith(
        obstacles,
        plotOptionsServiceMock.plotOptions()
      );
      expect(mockObstaclesService.setSelectedObstacle).not.toHaveBeenCalledWith(null, null);
      expect(mockMessageService.add).toHaveBeenCalledWith(
        expect.objectContaining({
          severity: 'error',
          summary: expect.any(String),
          detail: expect.any(String)
        })
      );
    });

    it('should rollback section and litData when re-registering remaining obstacles fails', async () => {
      const obstacles: Obstacle[] = [
        {
          uuid: 'obs-1',
          supportUuid: 'sup-1',
          supportIndex: 0,
          name: 'Obstacle 1',
          type: 'House',
          altitudeType: 'absolute',
          lateralDistanceType: LateralDistanceType.SPAN_AXIS,
          referenceSupport: ReferenceSupport.LEFT,
          positions: []
        }
      ];
      const section = { ...mockSection, obstacles: [...obstacles] } as Section;
      const initialLitData = {
        obstacles: [{ uuid: 'obs-1', points: [[1, 2, 3] as [number, number, number]] }]
      };
      mockSpanService.section.set(section);
      mockPlotService.study.set(mockStudy);
      mockPlotService.litData.set(initialLitData);
      service.form.patchValue({ uuid: 'obs-1' });
      mockObstacleStateService.addObstacle.mockRejectedValue(new Error('re-registration failure'));

      await service.deleteObstacle();

      expect(mockSectionService.createOrUpdateSection).not.toHaveBeenCalled();
      expect(mockSpanService.section()?.obstacles).toEqual(obstacles);
      expect(mockPlotService.litData()).toEqual(initialLitData);
      expect(mockObstacleStateService.clearAllObstacles).toHaveBeenCalledTimes(1);
      expect(mockObstacleStateService.syncObstacles).toHaveBeenCalledWith(
        obstacles,
        plotOptionsServiceMock.plotOptions()
      );
      expect(mockMessageService.add).toHaveBeenCalledWith(
        expect.objectContaining({
          severity: 'error',
          summary: expect.any(String),
          detail: expect.any(String)
        })
      );
    });

    it('should refresh litData from worker output when rollback resynchronization succeeds', async () => {
      const obstacles: Obstacle[] = [{ ...baseObstacle }];
      const section = { ...mockSection, obstacles: [...obstacles] } as Section;
      mockSpanService.section.set(section);
      mockPlotService.study.set(mockStudy);
      mockPlotService.litData.set({
        obstacles: [{ uuid: 'obs-1', points: [[1, 2, 3] as [number, number, number]] }]
      });
      service.form.patchValue({ uuid: 'obs-1' });
      mockObstacleStateService.addObstacle.mockRejectedValue(new Error('re-registration failure'));
      mockObstacleStateService.syncObstacles.mockResolvedValue({
        obstacles: [{ uuid: 'obs-1', points: [[10, 20, 30] as [number, number, number]] }]
      });

      await service.deleteObstacle();

      expect((mockPlotService.litData() as { obstacles: [number, number, number][][] }).obstacles).toEqual([
        { uuid: 'obs-1', points: [[10, 20, 30]] }
      ]);
    });
  });

  describe('saveObstacle', () => {
    it('should return early when form invalid', async () => {
      service.form.patchValue({ name: null });
      service.form.markAllAsTouched();
      await service.saveObstacle();
      // No throw, just early return
    });
    it('should allow save when form is valid', async () => {
      service.form.patchValue({
        name: 'Obstacle',
        supportUuid: 'sup-1',
        type: 'House',
        referenceSupport: ReferenceSupport.LEFT,
        altitudeType: 'absolute',
        lateralDistanceType: LateralDistanceType.SPAN_AXIS
      });
      await service.saveObstacle();
    });
  });

  describe('calculateAndSave', () => {
    const validFormBase = {
      name: 'New Obstacle',
      type: 'House',
      supportUuid: 'sup-1',
      referenceSupport: ReferenceSupport.LEFT,
      altitudeType: 'absolute',
      lateralDistanceType: LateralDistanceType.SPAN_AXIS
    };

    it('should return early when form invalid', async () => {
      service.form.patchValue({ name: null });
      service.form.markAllAsTouched();
      await service.calculateAndSave();
      expect(mockSectionService.createOrUpdateSection).not.toHaveBeenCalled();
    });

    it('should return early when no supportUuid', async () => {
      service.form.patchValue({ ...validFormBase, supportUuid: null });
      service.form.updateValueAndValidity();
      await service.calculateAndSave();
      expect(mockSectionService.createOrUpdateSection).not.toHaveBeenCalled();
    });

    it('should skip saving when study is missing', async () => {
      service.form.patchValue({ ...validFormBase, uuid: 'new-uuid' });
      service.addPosition({ x: 1, y: 2, z: 3 });
      mockPlotService.study.set(null);

      await service.calculateAndSave();

      expect(mockSectionService.createOrUpdateSection).not.toHaveBeenCalled();
    });

    it('should create new obstacle and save when no existing obstacle for support', async () => {
      service.form.patchValue({ ...validFormBase, uuid: 'new-uuid' });
      service.addPosition({ x: 1, y: 2, z: 3 });
      const section = { ...mockSection, obstacles: [] as Obstacle[] } as Section;
      mockSpanService.section.set(section);
      mockPlotService.study.set(mockStudy);

      await service.calculateAndSave();

      const updatedSection = mockSpanService.section();
      expect(updatedSection?.obstacles.length).toBe(1);
      expect(updatedSection?.obstacles[0].uuid).toBe('new-uuid');
      expect(updatedSection?.obstacles[0].positions).toHaveLength(1);
      expect(mockSectionService.createOrUpdateSection).toHaveBeenCalledWith(
        mockStudy,
        expect.objectContaining({ obstacles: updatedSection?.obstacles })
      );
      expect(mockObstaclesService.setSelectedObstacle).toHaveBeenCalledWith('new-uuid', 0);
      expect(mockMessageService.add).toHaveBeenCalled();
    });

    it('should update existing obstacle and save when obstacle exists for support', async () => {
      const existing: Obstacle = { ...baseObstacle, name: 'Old' };
      const section = { ...mockSection, obstacles: [existing] } as Section;
      mockSpanService.section.set(section);
      mockPlotService.study.set(mockStudy);
      service.form.patchValue({
        uuid: 'obs-1',
        name: 'Updated Name',
        type: 'Tree',
        supportUuid: 'sup-1',
        referenceSupport: ReferenceSupport.LEFT,
        altitudeType: 'relative',
        lateralDistanceType: LateralDistanceType.SPAN_AXIS
      });
      service.addPosition({ x: 5, y: 5, z: 5 });

      await service.calculateAndSave();

      const updated = mockSpanService.section()?.obstacles.find((o) => o.uuid === 'obs-1');
      expect(updated).toBeDefined();
      if (!updated) {
        return;
      }
      expect(updated.name).toBe('Updated Name');
      expect(updated.type).toBe('Tree');
      expect(updated.positions.length).toBe(1);
      expect(mockSectionService.createOrUpdateSection).toHaveBeenCalledWith(
        mockStudy,
        expect.objectContaining({ obstacles: expect.any(Array) })
      );
      expect(mockObstaclesService.setSelectedObstacle).toHaveBeenCalledWith('obs-1', 0);
    });

    it('should set results from Python distance data for the last point', async () => {
      const mockDistances: Distance[] = [
        {
          obstacleUuid: 'obs-dist',
          points: [
            {
              pointIndex: 0,
              linePoint: [10, 0, 5],
              virtualPointHorizontal: [10, 5, 0],
              virtualPointVertical: [10, 0, 5],
              distanceDiagonal: 42,
              distanceHorizontal: 10,
              distanceVertical: 5
            }
          ]
        }
      ];
      // Simulate calculateDistances setting distances (its internal responsibility)
      mockObstacleStateService.calculateDistances.mockImplementation(async () => {
        mockObstacleStateService.distances.set(mockDistances);
      });

      service.form.patchValue({ ...validFormBase, uuid: 'obs-dist', name: 'New Obstacle' });
      service.addPosition({ x: 1, y: 2, z: 3 });
      const section = { ...mockSection, obstacles: [] as Obstacle[] } as Section;
      mockSpanService.section.set(section);
      mockPlotService.study.set(mockStudy);

      await service.calculateAndSave();

      expect(service.results().oblique).toBe(42);
      expect(service.results().horizontal).toBe(10);
      expect(service.results().vertical).toBe(5);
    });

    it('should set results to null when reapplyObstacles yields no matching distance', async () => {
      service.form.patchValue({ ...validFormBase, uuid: 'obs-nomatch' });
      service.addPosition({ x: 1, y: 2, z: 3 });
      const section = { ...mockSection, obstacles: [] as Obstacle[] } as Section;
      mockSpanService.section.set(section);
      mockPlotService.study.set(mockStudy);

      await service.calculateAndSave();

      expect(service.results().oblique).toBeNull();
      expect(service.results().vertical).toBeNull();
      expect(service.results().horizontal).toBeNull();
    });

    it('should derive results from distances when obstacle is selected after re-open', () => {
      // Simulates re-opening a study: distances restored by refreshSection, then user selects an obstacle
      const mockDistances: Distance[] = [
        {
          obstacleUuid: 'existing-obs-uuid',
          points: [
            {
              pointIndex: 0,
              linePoint: [10, 0, 5],
              virtualPointHorizontal: [10, 5, 0],
              virtualPointVertical: [10, 0, 5],
              distanceDiagonal: 100,
              distanceHorizontal: 50,
              distanceVertical: 30
            }
          ]
        }
      ];

      mockObstacleStateService.distances.set(mockDistances);
      mockObstaclesService.selectedObstacleUuid.set('existing-obs-uuid');
      mockObstaclesService.activePointIndex.set(0);

      expect(service.results().oblique).toBe(100);
      expect(service.results().horizontal).toBe(50);
      expect(service.results().vertical).toBe(30);
    });

    it('should return distances for the second point of a multi-point obstacle', async () => {
      // Python returns one Distance entry per point (not one entry with all points grouped),
      // so results must search across all entries for the obstacle UUID.
      const mockDistances: Distance[] = [
        {
          obstacleUuid: 'obs-multi',
          points: [
            {
              pointIndex: 0,
              linePoint: [1, 0, 0],
              virtualPointHorizontal: [1, 1, 0],
              virtualPointVertical: [1, 0, 1],
              distanceDiagonal: 10,
              distanceHorizontal: 3,
              distanceVertical: 4
            }
          ]
        },
        {
          obstacleUuid: 'obs-multi',
          points: [
            {
              pointIndex: 1,
              linePoint: [2, 0, 0],
              virtualPointHorizontal: [2, 1, 0],
              virtualPointVertical: [2, 0, 1],
              distanceDiagonal: 20,
              distanceHorizontal: 6,
              distanceVertical: 8
            }
          ]
        }
      ];

      mockObstacleStateService.calculateDistances.mockImplementation(async () => {
        mockObstacleStateService.distances.set(mockDistances);
      });

      service.form.patchValue({ ...validFormBase, uuid: 'obs-multi', name: 'Multi Point' });
      service.addPosition({ x: 1, y: 2, z: 3 });
      service.addPosition({ x: 4, y: 5, z: 6 });
      const section = { ...mockSection, obstacles: [] as Obstacle[] } as Section;
      mockSpanService.section.set(section);
      mockPlotService.study.set(mockStudy);

      await service.calculateAndSave();
      // calculateAndSave calls setSelectedObstacle(uuid, lastPointIndex=1)
      // the mock updates selectedObstacleUuid and activePointIndex accordingly

      expect(service.results().oblique).toBe(20);
      expect(service.results().horizontal).toBe(6);
      expect(service.results().vertical).toBe(8);
    });

    it('should call obstacleStateService.addObstacle to update plot state after saving', async () => {
      service.form.patchValue({ ...validFormBase, uuid: 'obs-store' });
      service.addPosition({ x: 1, y: 2, z: 3 });
      const section = { ...mockSection, obstacles: [] as Obstacle[] } as Section;
      mockSpanService.section.set(section);
      mockPlotService.study.set(mockStudy);

      await service.calculateAndSave();

      expect(mockObstacleStateService.addObstacle).toHaveBeenCalled();
    });

    it('should call obstacleStateService.addObstacle with temporaryLoadData present', async () => {
      const mockChargeData: ChargeData = {
        climate: {
          windPressure: 100,
          cableTemperature: 20,
          symmetryType: 'SYMMETRIC' as ChargeData['climate']['symmetryType'],
          iceThickness: null,
          frontierSupportNumber: null,
          iceThicknessBefore: null,
          iceThicknessAfter: null
        },
        spanLoads: []
      };
      mockPlotService.temporaryLoadData = mockChargeData;
      service.form.patchValue({ ...validFormBase, uuid: 'obs-loads' });
      service.addPosition({ x: 1, y: 2, z: 3 });
      const section = { ...mockSection, obstacles: [] as Obstacle[] } as Section;
      mockSpanService.section.set(section);
      mockPlotService.study.set(mockStudy);

      await service.calculateAndSave();

      // addObstacle is responsible for adding the obstacle to the middleware
      expect(mockObstacleStateService.addObstacle).toHaveBeenCalled();
    });

    it('should set isCalculatingObstacle to false after calculateAndSave', async () => {
      service.form.patchValue({ ...validFormBase, uuid: 'obs-loading' });
      service.addPosition({ x: 1, y: 2, z: 3 });
      const section = { ...mockSection, obstacles: [] as Obstacle[] } as Section;
      mockSpanService.section.set(section);
      mockPlotService.study.set(mockStudy);

      await service.calculateAndSave();

      expect(service.isCalculatingObstacle()).toBe(false);
    });

    it('should set isCalculatingObstacle to true at the start of async flow', async () => {
      service.form.patchValue({ ...validFormBase, uuid: 'obs-loading-true' });
      service.addPosition({ x: 1, y: 2, z: 3 });
      const section = { ...mockSection, obstacles: [] as Obstacle[] } as Section;
      mockSpanService.section.set(section);
      mockPlotService.study.set(mockStudy);
      service.isCalculatingObstacle.set(false);
      let loadingDuringExecution = false;
      mockObstacleStateService.addObstacle.mockImplementation(async () => {
        loadingDuringExecution = service.isCalculatingObstacle();
        return null;
      });

      await service.calculateAndSave();

      expect(loadingDuringExecution).toBe(true);
    });

    it('should set isCalculatingObstacle to false even when an error is thrown', async () => {
      service.form.patchValue({ ...validFormBase, uuid: 'obs-loading-error' });
      service.addPosition({ x: 1, y: 2, z: 3 });
      const section = { ...mockSection, obstacles: [] as Obstacle[] } as Section;
      mockSpanService.section.set(section);
      mockPlotService.study.set(mockStudy);
      mockObstacleStateService.addObstacle.mockRejectedValue(new Error('worker failure'));

      try {
        await service.calculateAndSave();
      } catch (_error) {
        // Expected error
      }

      expect(service.isCalculatingObstacle()).toBe(false);
    });

    it('should prevent concurrent calculateAndSave calls', async () => {
      service.form.patchValue({ ...validFormBase, uuid: 'obs-concurrent' });
      service.addPosition({ x: 1, y: 2, z: 3 });
      const section = { ...mockSection, obstacles: [] as Obstacle[] } as Section;
      mockSpanService.section.set(section);
      mockPlotService.study.set(mockStudy);

      // Create a slow async operation
      let resolveAddObstacle: (() => void) | undefined;
      const slowPromise = new Promise<null>((resolve) => {
        resolveAddObstacle = () => resolve(null);
      });
      mockObstacleStateService.addObstacle.mockReturnValue(slowPromise);

      // Start first call (should proceed)
      const firstCall = service.calculateAndSave();

      // Start second call while first is still running (should be ignored)
      const secondCall = service.calculateAndSave();

      // Resolve the slow operation
      resolveAddObstacle!();

      await firstCall;
      await secondCall;

      // addObstacle should only be called once (from first call)
      expect(mockObstacleStateService.addObstacle).toHaveBeenCalledTimes(1);
    });

    it('should set calculationError signal when operation fails', async () => {
      service.form.patchValue({ ...validFormBase, uuid: 'obs-error' });
      service.addPosition({ x: 1, y: 2, z: 3 });
      const section = { ...mockSection, obstacles: [] as Obstacle[] } as Section;
      mockSpanService.section.set(section);
      mockPlotService.study.set(mockStudy);
      mockObstacleStateService.addObstacle.mockRejectedValue(new Error('Calculation failed'));

      try {
        await service.calculateAndSave();
      } catch (_error) {
        // Expected error
      }

      expect(service.calculationError()).toContain('Calculation failed');
    });
  });

  describe('isFormValid', () => {
    it('should return form.valid', () => {
      expect(typeof service.isFormValid()).toBe('boolean');
    });
    it('should reflect computed form validity', () => {
      service.form.patchValue({ name: null });
      service.form.updateValueAndValidity();
      expect(service.isFormValid()).toBe(false);
    });
  });

  describe('canCalculateAndSave', () => {
    it('should return false when positions are empty', () => {
      service.positions.clear();
      service.form.patchValue({
        name: 'Obstacle',
        supportUuid: 'sup-1',
        type: 'House',
        referenceSupport: ReferenceSupport.LEFT,
        altitudeType: 'absolute',
        lateralDistanceType: LateralDistanceType.SPAN_AXIS
      });
      expect(service.canCalculateAndSave()).toBe(false);
    });
    it('should return false when any position coordinate is null', () => {
      service.positions.clear();
      service.addPosition({ x: 1, y: null, z: 3 });
      service.form.patchValue({
        name: 'Obstacle',
        supportUuid: 'sup-1',
        type: 'House',
        referenceSupport: ReferenceSupport.LEFT,
        altitudeType: 'absolute',
        lateralDistanceType: LateralDistanceType.SPAN_AXIS
      });
      expect(service.canCalculateAndSave()).toBe(false);
    });
    it('should return true when all requirements are met', () => {
      service.positions.clear();
      service.addPosition({ x: 1, y: 2, z: 3 });
      service.form.patchValue({
        name: 'Obstacle',
        supportUuid: 'sup-1',
        type: 'House',
        referenceSupport: ReferenceSupport.LEFT,
        altitudeType: 'absolute',
        lateralDistanceType: LateralDistanceType.SPAN_AXIS
      });
      expect(service.canCalculateAndSave()).toBe(true);
    });
  });

  describe('getErrorIds', () => {
    it('should return space-joined ids when control has matching errors', () => {
      service.form.get('name')?.setValue(null);
      service.form.get('name')?.markAsTouched();
      service.form.get('name')?.updateValueAndValidity();
      const ids = service.getErrorIds('name', ['required']);
      expect(ids).toContain('name');
      expect(ids).toContain('error');
      expect(ids).toContain('required');
    });
    it('should return null when control has no errors', () => {
      service.form.get('name')?.setValue('Valid');
      service.form.get('name')?.updateValueAndValidity();
      const ids = service.getErrorIds('name', ['required']);
      expect(ids).toBeNull();
    });
    it('should include multiple error ids when present', () => {
      service.form.get('name')?.setErrors({ required: true, custom: true });
      const ids = service.getErrorIds('name', ['required', 'custom']);
      expect(ids).toBe('name-error-required name-error-custom');
    });
    it('should return null when no matching error types exist', () => {
      service.form.get('name')?.setErrors({ custom: true });
      const ids = service.getErrorIds('name', ['required']);
      expect(ids).toBeNull();
    });
  });

  describe('buildObstacleFromForm', () => {
    it('should fallback to defaults for null form values', () => {
      service.form.patchValue({
        uuid: null,
        name: null,
        type: null,
        supportUuid: 'sup-1',
        referenceSupport: null,
        altitudeType: null,
        lateralDistanceType: null
      });

      const obstacle = (service as unknown as { buildObstacleFromForm: () => Obstacle }).buildObstacleFromForm();

      expect(obstacle.uuid).toBeTruthy();
      expect(obstacle.name).toBe('');
      expect(obstacle.type).toBe('');
      expect(obstacle.altitudeType).toBe('');
      expect(obstacle.lateralDistanceType).toBe(LateralDistanceType.SPAN_AXIS);
      expect(obstacle.referenceSupport).toBe(ReferenceSupport.LEFT);
    });
  });

  describe('upsertObstacleInSection', () => {
    const invokeUpsert = (obstacle: Obstacle) => {
      (service as unknown as { upsertObstacleInSection: (o: Obstacle) => void }).upsertObstacleInSection(obstacle);
    };

    it('should handle missing section safely', () => {
      mockSpanService.section.set(null);
      const obstacle: Obstacle = {
        uuid: 'obs-1',
        supportUuid: 'sup-1',
        supportIndex: 0,
        name: 'Obstacle 1',
        type: 'House',
        altitudeType: 'absolute',
        lateralDistanceType: LateralDistanceType.SPAN_AXIS,
        referenceSupport: ReferenceSupport.LEFT,
        positions: []
      };

      invokeUpsert(obstacle);

      expect(mockSpanService.section()).toBeNull();
    });

    it('should create obstacles array when section.obstacles is undefined', () => {
      const section = { ...mockSection, obstacles: undefined } as unknown as Section;
      mockSpanService.section.set(section);

      const obstacle: Obstacle = {
        ...baseObstacle,
        uuid: 'obs-new',
        name: 'New Obstacle',
        positions: [{ x: 1, y: 2, z: 3 }]
      };

      invokeUpsert(obstacle);

      const updatedSection = mockSpanService.section();
      expect(updatedSection?.obstacles).toBeDefined();
      expect(updatedSection?.obstacles.length).toBe(1);
      expect(updatedSection?.obstacles[0].uuid).toBe('obs-new');
    });

    it('should replace existing obstacle at the correct index', () => {
      const existing: Obstacle = { ...baseObstacle, name: 'Old Name' };
      const section = { ...mockSection, obstacles: [existing] } as Section;
      mockSpanService.section.set(section);

      const updated: Obstacle = {
        ...baseObstacle,
        name: 'Updated Name',
        type: 'Tree',
        altitudeType: 'relative',
        referenceSupport: ReferenceSupport.RIGHT,
        positions: [{ x: 10, y: 20, z: 30 }]
      };

      invokeUpsert(updated);

      const updatedSection = mockSpanService.section();
      expect(updatedSection?.obstacles.length).toBe(1);
      expect(updatedSection?.obstacles[0].name).toBe('Updated Name');
      expect(updatedSection?.obstacles[0].type).toBe('Tree');
      expect(updatedSection?.obstacles[0].positions).toHaveLength(1);
    });

    it('should append obstacle when uuid does not match existing ones', () => {
      const existing: Obstacle = { ...baseObstacle, name: 'Existing' };
      const section = { ...mockSection, obstacles: [existing] } as Section;
      mockSpanService.section.set(section);

      const newObstacle: Obstacle = {
        ...baseObstacle,
        uuid: 'obs-2',
        name: 'New One',
        type: 'Tree'
      };

      invokeUpsert(newObstacle);

      const updatedSection = mockSpanService.section();
      expect(updatedSection?.obstacles.length).toBe(2);
      expect(updatedSection?.obstacles[0].uuid).toBe('obs-1');
      expect(updatedSection?.obstacles[1].uuid).toBe('obs-2');
    });
  });

  describe('returnToSpan', () => {
    it('should return early when no supportUuid', () => {
      service.form.patchValue({ supportUuid: null });
      service.returnToSpan();
      expect(mockPlotService.plotOptionsChange).not.toHaveBeenCalled();
    });
    it('should not update plot when support index is invalid', () => {
      mockSpanService.getSupportIndex.mockReturnValue(-1);
      service.form.patchValue({ supportUuid: 'sup-1' });
      service.returnToSpan();
      expect(mockPlotService.plotOptionsChange).not.toHaveBeenCalled();
    });
    it('should call plotOptionsChange and spanAmountChoice when support valid', () => {
      mockSpanService.getSupportIndex.mockReturnValue(0);
      service.form.patchValue({ supportUuid: 'sup-1' });
      service.returnToSpan();
      expect(mockPlotService.plotOptionsChange).toHaveBeenCalledWith({
        startSupport: 0,
        endSupport: 1
      });
    });
    it('should reset camera to null before changing plot options', () => {
      mockSpanService.getSupportIndex.mockReturnValue(0);
      service.form.patchValue({ supportUuid: 'sup-1' });
      plotOptionsServiceMock.camera.set({ eye: { x: 1, y: -2, z: 0.5 } });
      service.returnToSpan();
      expect(plotOptionsServiceMock.camera()).toBeNull();
    });
  });
});
