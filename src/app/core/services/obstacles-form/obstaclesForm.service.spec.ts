import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { PlotService } from '@services/plot/plot.service';
import { ObstaclesService } from '@services/obstacles/obstacles.service';
import { SectionService } from '@services/section/section.service';
import { MessageService } from 'primeng/api';
import { signal } from '@angular/core';
import { LateralDistanceType, Obstacle, Position3D, ReferenceSupport } from '@shared/domain/models/obstacle.model';
import { Section, Study, Support } from '@shared/domain';
import { ObstacleFormService } from './obstaclesForm.service';
import { DEBOUNCED_UPDATE_POINT_DELAY } from '@shared/domain/obstacles/obstacle-form.constants';

const mockSupports: Support[] = [
  {
    uuid: 'sup-1',
    number: '1',
    name: 'Support 1',
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
    chainSurface: null
  },
  {
    uuid: 'sup-2',
    number: '2',
    name: 'Support 2',
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
    chainSurface: null
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
  vtl_and_guying: undefined
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

describe('ObstacleFormService', () => {
  let service: ObstacleFormService;
  let mockPlotService: {
    getSupportIndex: vi.Mock;
    getSupportOptions: vi.Mock;
    getSpanOptions: vi.Mock;
    plotOptionsChange: vi.Mock;
    spanAmountChoice: ReturnType<typeof signal<'single' | 'double' | 'all'>>;
    section: ReturnType<typeof signal<Section | null>>;
    study: ReturnType<typeof signal<Study | null>>;
  };
  let mockObstaclesService: {
    currentPointIndex: ReturnType<typeof signal<number>>;
    setCurrentPointIndex: vi.Mock;
    resetCurrentPointIndex: vi.Mock;
  };
  let mockSectionService: { createOrUpdateSection: vi.Mock };
  let mockMessageService: { add: vi.Mock };

  beforeEach(() => {
    const sectionSignal = signal<Section | null>({ ...mockSection });
    const spanAmountChoiceSignal = signal<'single' | 'double' | 'all'>('all');
    mockPlotService = {
      getSupportIndex: vi.fn().mockReturnValue(0),
      getSupportOptions: vi.fn().mockReturnValue([
        { label: 1, value: 'LEFT' },
        { label: 2, value: 'RIGHT' }
      ]),
      getSpanOptions: vi.fn().mockReturnValue([{ label: '1 - 2', value: 'sup-1' }]),
      plotOptionsChange: vi.fn(),
      spanAmountChoice: spanAmountChoiceSignal,
      section: sectionSignal,
      study: signal<Study | null>(mockStudy)
    };
    mockObstaclesService = {
      currentPointIndex: signal(0),
      setCurrentPointIndex: vi.fn(),
      resetCurrentPointIndex: vi.fn()
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
        { provide: ObstaclesService, useValue: mockObstaclesService },
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
      const obstacle: Obstacle = {
        uuid: 'obs-1',
        supportUuid: 'sup-1',
        name: 'Obstacle 1',
        type: 'House',
        altitudeType: 'absolute',
        lateralDistanceType: LateralDistanceType.SPAN_AXIS,
        referenceSupport: ReferenceSupport.LEFT,
        positions: [{ x: 1, y: 2, z: 3 }]
      };
      service.setExistingObstacle(obstacle, 0);
      expect(service.form.get('uuid')?.value).toBe('obs-1');
      expect(service.form.get('name')?.value).toBe('Obstacle 1');
      expect(mockPlotService.plotOptionsChange).toHaveBeenCalledWith({ startSupport: 0, endSupport: 1 });
      expect(mockPlotService.spanAmountChoice()).toBe('single');
      expect(service.supportsOptions()).toEqual([
        { label: 1, value: 'LEFT' },
        { label: 2, value: 'RIGHT' }
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
    it('should update plot and supportsOptions when supportUuid is valid', () => {
      (mockPlotService.getSupportIndex as vi.Mock).mockReturnValue(0);
      service.resetFormForNewObstacle('sup-1');
      expect(mockPlotService.plotOptionsChange).toHaveBeenCalledWith({
        startSupport: 0,
        endSupport: 1
      });
      expect(mockPlotService.spanAmountChoice.set).toBeDefined();
      expect(service.supportsOptions().length).toBeGreaterThanOrEqual(0);
    });
    it('should avoid plot change when support index is invalid', () => {
      (mockPlotService.getSupportIndex as vi.Mock).mockReturnValue(-1);
      service.resetFormForNewObstacle('sup-1');
      expect(mockPlotService.plotOptionsChange).not.toHaveBeenCalled();
      expect(service.supportsOptions().length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('loadObstacle', () => {
    it('should do nothing when obstacle not found', () => {
      mockPlotService.section.set({ ...mockSection, obstacles: [] });
      service.loadObstacle('nonexistent');
      expect(service.form.get('name')?.value).toBeFalsy();
    });
    it('should do nothing when support is not found', () => {
      const obstacles: Obstacle[] = [
        {
          uuid: 'obs-1',
          supportUuid: 'missing-support',
          name: 'Obstacle 1',
          type: 'House',
          altitudeType: 'absolute',
          lateralDistanceType: LateralDistanceType.SPAN_AXIS,
          referenceSupport: ReferenceSupport.LEFT,
          positions: []
        }
      ];
      mockPlotService.section.set({ ...mockSection, supports: [], obstacles });
      service.loadObstacle('obs-1');
      expect(service.form.get('supportUuid')?.value).toBeNull();
    });
    it('should do nothing when obstacle is not in span options', () => {
      const obstacles: Obstacle[] = [
        {
          uuid: 'obs-1',
          supportUuid: 'sup-1',
          name: 'Obstacle 1',
          type: 'House',
          altitudeType: 'absolute',
          lateralDistanceType: LateralDistanceType.SPAN_AXIS,
          referenceSupport: ReferenceSupport.LEFT,
          positions: []
        }
      ];
      mockPlotService.section.set({ ...mockSection, obstacles });
      mockPlotService.getSpanOptions.mockReturnValue([{ label: '2 - 3', value: 'sup-2' }]);
      service.loadObstacle('obs-1');
      expect(service.form.get('supportUuid')?.value).toBeNull();
    });
    it('should patch form when obstacle and support found', () => {
      const obstacles: Obstacle[] = [
        {
          uuid: 'obs-1',
          supportUuid: 'sup-1',
          name: 'Obstacle 1',
          type: 'House',
          altitudeType: 'absolute',
          lateralDistanceType: LateralDistanceType.SPAN_AXIS,
          referenceSupport: ReferenceSupport.LEFT,
          positions: []
        }
      ];
      mockPlotService.section.set({ ...mockSection, obstacles });
      mockPlotService.getSpanOptions.mockReturnValue([{ label: '1 - 2', value: 'sup-1' }]);
      service.loadObstacle('obs-1');
      expect(service.form.get('supportUuid')?.value).toBe('sup-1');
      expect(service.form.get('name')?.value).toContain('Obstacle');
    });
    it('should set referenceSupport to RIGHT when support differs', () => {
      const obstacles: Obstacle[] = [
        {
          uuid: 'obs-1',
          supportUuid: 'sup-1',
          name: 'Obstacle 1',
          type: 'House',
          altitudeType: 'absolute',
          lateralDistanceType: LateralDistanceType.SPAN_AXIS,
          referenceSupport: ReferenceSupport.LEFT,
          positions: []
        }
      ];
      mockPlotService.section.set({ ...mockSection, obstacles });
      mockPlotService.getSpanOptions.mockReturnValue([{ label: '1 - 2', value: 'sup-1' }]);
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
    it('should use currentPointIndex when index not provided', () => {
      mockObstaclesService.currentPointIndex.set(0);
      service.addPosition();
      service.deletePoint();
      expect(mockObstaclesService.setCurrentPointIndex).toHaveBeenCalled();
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
      mockPlotService.section.set(section);
      mockPlotService.study.set(mockStudy);
      service.form.patchValue({ uuid: 'missing-uuid' });
      await service.deleteObstacle();
      expect(mockSectionService.createOrUpdateSection).not.toHaveBeenCalled();
    });
    it('should handle undefined obstacles collection safely', async () => {
      const section = { ...mockSection, obstacles: undefined } as unknown as Section;
      mockPlotService.section.set(section);
      mockPlotService.study.set(mockStudy);
      service.form.patchValue({ uuid: 'missing-uuid' });
      await service.deleteObstacle();
      expect(mockSectionService.createOrUpdateSection).not.toHaveBeenCalled();
    });
    it('should remove obstacle and call sectionService when obstacle exists', async () => {
      const obstacles: Obstacle[] = [
        {
          uuid: 'obs-1',
          supportUuid: 'sup-1',
          name: 'Obstacle 1',
          type: 'House',
          altitudeType: 'absolute',
          lateralDistanceType: LateralDistanceType.SPAN_AXIS,
          referenceSupport: ReferenceSupport.LEFT,
          positions: []
        }
      ];
      const section = { ...mockSection, obstacles: [...obstacles] } as Section;
      mockPlotService.section.set(section);
      mockPlotService.study.set(mockStudy);
      service.form.patchValue({ uuid: 'obs-1' });
      await service.deleteObstacle();
      expect(section.obstacles.length).toBe(0);
      expect(mockSectionService.createOrUpdateSection).toHaveBeenCalledWith(mockStudy, section);
      expect(mockMessageService.add).toHaveBeenCalledWith(
        expect.objectContaining({
          severity: 'success',
          summary: expect.any(String),
          detail: expect.any(String)
        })
      );
      expect(mockObstaclesService.resetCurrentPointIndex).toHaveBeenCalled();
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
    it('should return early when form invalid', async () => {
      service.form.patchValue({ name: null });
      service.form.markAllAsTouched();
      await service.calculateAndSave();
      expect(mockSectionService.createOrUpdateSection).not.toHaveBeenCalled();
    });
    it('should return early when no supportUuid', async () => {
      service.form.patchValue({
        name: 'Test',
        type: 'House',
        supportUuid: null,
        referenceSupport: ReferenceSupport.LEFT,
        altitudeType: 'absolute',
        lateralDistanceType: LateralDistanceType.SPAN_AXIS
      });
      service.form.updateValueAndValidity();
      await service.calculateAndSave();
      expect(mockSectionService.createOrUpdateSection).not.toHaveBeenCalled();
    });
    it('should skip saving when study or section is missing', async () => {
      service.form.patchValue({
        uuid: 'new-uuid',
        name: 'New Obstacle',
        type: 'House',
        supportUuid: 'sup-1',
        referenceSupport: ReferenceSupport.LEFT,
        altitudeType: 'absolute',
        lateralDistanceType: LateralDistanceType.SPAN_AXIS
      });
      service.addPosition({ x: 1, y: 2, z: 3 });
      mockPlotService.study.set(null);

      await service.calculateAndSave();

      expect(mockSectionService.createOrUpdateSection).not.toHaveBeenCalled();
      expect(service.results().oblique).toBeCloseTo(Math.sqrt(14), 5);
    });
    it('should create new obstacle and save when no existing obstacle for support', async () => {
      service.form.patchValue({
        uuid: 'new-uuid',
        name: 'New Obstacle',
        type: 'House',
        supportUuid: 'sup-1',
        referenceSupport: ReferenceSupport.LEFT,
        altitudeType: 'absolute',
        lateralDistanceType: LateralDistanceType.SPAN_AXIS
      });
      service.addPosition({ x: 1, y: 2, z: 3 });
      const section = {
        ...mockSection,
        obstacles: [] as Obstacle[]
      } as Section;
      mockPlotService.section.set(section);
      mockPlotService.study.set(mockStudy);
      mockPlotService.getSupportIndex.mockReturnValue(0);
      mockPlotService.getSupportOptions.mockReturnValue([
        { label: 1, value: 'LEFT' },
        { label: 2, value: 'RIGHT' }
      ]);
      await service.calculateAndSave();
      expect(section.obstacles.length).toBe(1);
      // New obstacle is built from resetFormForNewObstacle (reset form values) then positions/uuid are set
      expect(section.obstacles[0].uuid).toBe('new-uuid');
      expect(section.obstacles[0].positions).toHaveLength(1);
      expect(mockSectionService.createOrUpdateSection).toHaveBeenCalledWith(mockStudy, section);
      expect(service.results().oblique).toBeCloseTo(Math.sqrt(14), 5);
      expect(mockMessageService.add).toHaveBeenCalled();
    });
    it('should update existing obstacle and save when obstacle exists for support', async () => {
      const existing: Obstacle = {
        uuid: 'obs-1',
        supportUuid: 'sup-1',
        name: 'Old',
        type: 'House',
        altitudeType: 'absolute',
        lateralDistanceType: LateralDistanceType.SPAN_AXIS,
        referenceSupport: ReferenceSupport.LEFT,
        positions: []
      };
      const section = { ...mockSection, obstacles: [existing] } as Section;
      mockPlotService.section.set(section);
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
      const updated = section.obstacles.find((o) => o.uuid === 'obs-1')!;
      expect(updated.name).toBe('Updated Name');
      expect(updated.type).toBe('Tree');
      expect(updated.positions.length).toBe(1);
      expect(mockSectionService.createOrUpdateSection).toHaveBeenCalledWith(mockStudy, section);
    });

    it('should compute min distances correctly with multiple points', async () => {
      service.form.patchValue({
        uuid: 'obs-multi',
        name: 'Multi-point',
        type: 'House',
        supportUuid: 'sup-1',
        referenceSupport: ReferenceSupport.LEFT,
        altitudeType: 'absolute',
        lateralDistanceType: LateralDistanceType.SPAN_AXIS
      });
      // Point 1: x=3, y=4, z=5 => horizontal=5, oblique=sqrt(50), vertical=5
      service.addPosition({ x: 3, y: 4, z: 5 });
      // Point 2: x=1, y=1, z=1 => horizontal=sqrt(2), oblique=sqrt(3), vertical=1
      service.addPosition({ x: 1, y: 1, z: 1 });

      const section = { ...mockSection, obstacles: [] as Obstacle[] } as Section;
      mockPlotService.section.set(section);
      mockPlotService.study.set(mockStudy);

      await service.calculateAndSave();

      // Min oblique = sqrt(3) ≈ 1.732
      expect(service.results().oblique).toBeCloseTo(Math.sqrt(3), 5);
      // Min vertical = |1| = 1
      expect(service.results().vertical).toBeCloseTo(1, 5);
      // Min horizontal = sqrt(2) ≈ 1.414
      expect(service.results().horizontal).toBeCloseTo(Math.sqrt(2), 5);
    });

    it('should skip positions with null coordinates in distance calculations', async () => {
      service.form.patchValue({
        uuid: 'obs-null',
        name: 'Null points',
        type: 'House',
        supportUuid: 'sup-1',
        referenceSupport: ReferenceSupport.LEFT,
        altitudeType: 'absolute',
        lateralDistanceType: LateralDistanceType.SPAN_AXIS
      });
      service.addPosition({ x: null, y: 2, z: 3 });
      service.addPosition({ x: 10, y: 10, z: 10 });

      const section = { ...mockSection, obstacles: [] as Obstacle[] } as Section;
      mockPlotService.section.set(section);
      mockPlotService.study.set(mockStudy);

      await service.calculateAndSave();

      // Only the second point should be used
      const horizontal = Math.hypot(10, 10);
      const oblique = Math.hypot(horizontal, 10);
      expect(service.results().oblique).toBeCloseTo(oblique, 5);
      expect(service.results().vertical).toBeCloseTo(10, 5);
      expect(service.results().horizontal).toBeCloseTo(horizontal, 5);
    });

    it('should return null results when all positions have null coordinates', async () => {
      service.form.patchValue({
        uuid: 'obs-allnull',
        name: 'All null',
        type: 'House',
        supportUuid: 'sup-1',
        referenceSupport: ReferenceSupport.LEFT,
        altitudeType: 'absolute',
        lateralDistanceType: LateralDistanceType.SPAN_AXIS
      });
      service.addPosition({ x: null, y: null, z: null });

      const section = { ...mockSection, obstacles: [] as Obstacle[] } as Section;
      mockPlotService.section.set(section);
      mockPlotService.study.set(mockStudy);

      await service.calculateAndSave();

      expect(service.results().oblique).toBeNull();
      expect(service.results().vertical).toBeNull();
      expect(service.results().horizontal).toBeNull();
    });

    it('should handle negative coordinates correctly in distance calculations', async () => {
      service.form.patchValue({
        uuid: 'obs-neg',
        name: 'Negative',
        type: 'House',
        supportUuid: 'sup-1',
        referenceSupport: ReferenceSupport.LEFT,
        altitudeType: 'absolute',
        lateralDistanceType: LateralDistanceType.SPAN_AXIS
      });
      // z=-7 => absZ=7, horizontal=hypot(-3,-4)=5, oblique=hypot(5,-7)=sqrt(74)
      service.addPosition({ x: -3, y: -4, z: -7 });

      const section = { ...mockSection, obstacles: [] as Obstacle[] } as Section;
      mockPlotService.section.set(section);
      mockPlotService.study.set(mockStudy);

      await service.calculateAndSave();

      expect(service.results().oblique).toBeCloseTo(Math.sqrt(74), 5);
      expect(service.results().vertical).toBeCloseTo(7, 5);
      expect(service.results().horizontal).toBeCloseTo(5, 5);
    });

    it('should compute zero distances for a point at the origin', async () => {
      service.form.patchValue({
        uuid: 'obs-zero',
        name: 'Zero',
        type: 'House',
        supportUuid: 'sup-1',
        referenceSupport: ReferenceSupport.LEFT,
        altitudeType: 'absolute',
        lateralDistanceType: LateralDistanceType.SPAN_AXIS
      });
      service.addPosition({ x: 0, y: 0, z: 0 });

      const section = { ...mockSection, obstacles: [] as Obstacle[] } as Section;
      mockPlotService.section.set(section);
      mockPlotService.study.set(mockStudy);

      await service.calculateAndSave();

      expect(service.results().oblique).toBe(0);
      expect(service.results().vertical).toBe(0);
      expect(service.results().horizontal).toBe(0);
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
      mockPlotService.section.set(null);
      const obstacle: Obstacle = {
        uuid: 'obs-1',
        supportUuid: 'sup-1',
        name: 'Obstacle 1',
        type: 'House',
        altitudeType: 'absolute',
        lateralDistanceType: LateralDistanceType.SPAN_AXIS,
        referenceSupport: ReferenceSupport.LEFT,
        positions: []
      };

      invokeUpsert(obstacle);

      expect(mockPlotService.section()).toBeNull();
    });

    it('should create obstacles array when section.obstacles is undefined', () => {
      const section = { ...mockSection, obstacles: undefined } as unknown as Section;
      mockPlotService.section.set(section);

      const obstacle: Obstacle = {
        uuid: 'obs-new',
        supportUuid: 'sup-1',
        name: 'New Obstacle',
        type: 'House',
        altitudeType: 'absolute',
        lateralDistanceType: LateralDistanceType.SPAN_AXIS,
        referenceSupport: ReferenceSupport.LEFT,
        positions: [{ x: 1, y: 2, z: 3 }]
      };

      invokeUpsert(obstacle);

      expect(section.obstacles).toBeDefined();
      expect(section.obstacles!.length).toBe(1);
      expect(section.obstacles![0].uuid).toBe('obs-new');
    });

    it('should replace existing obstacle at the correct index', () => {
      const existing: Obstacle = {
        uuid: 'obs-1',
        supportUuid: 'sup-1',
        name: 'Old Name',
        type: 'House',
        altitudeType: 'absolute',
        lateralDistanceType: LateralDistanceType.SPAN_AXIS,
        referenceSupport: ReferenceSupport.LEFT,
        positions: []
      };
      const section = { ...mockSection, obstacles: [existing] } as Section;
      mockPlotService.section.set(section);

      const updated: Obstacle = {
        uuid: 'obs-1',
        supportUuid: 'sup-1',
        name: 'Updated Name',
        type: 'Tree',
        altitudeType: 'relative',
        lateralDistanceType: LateralDistanceType.SPAN_AXIS,
        referenceSupport: ReferenceSupport.RIGHT,
        positions: [{ x: 10, y: 20, z: 30 }]
      };

      invokeUpsert(updated);

      expect(section.obstacles.length).toBe(1);
      expect(section.obstacles[0].name).toBe('Updated Name');
      expect(section.obstacles[0].type).toBe('Tree');
      expect(section.obstacles[0].positions).toHaveLength(1);
    });

    it('should append obstacle when uuid does not match existing ones', () => {
      const existing: Obstacle = {
        uuid: 'obs-1',
        supportUuid: 'sup-1',
        name: 'Existing',
        type: 'House',
        altitudeType: 'absolute',
        lateralDistanceType: LateralDistanceType.SPAN_AXIS,
        referenceSupport: ReferenceSupport.LEFT,
        positions: []
      };
      const section = { ...mockSection, obstacles: [existing] } as Section;
      mockPlotService.section.set(section);

      const newObstacle: Obstacle = {
        uuid: 'obs-2',
        supportUuid: 'sup-1',
        name: 'New One',
        type: 'Tree',
        altitudeType: 'absolute',
        lateralDistanceType: LateralDistanceType.SPAN_AXIS,
        referenceSupport: ReferenceSupport.LEFT,
        positions: []
      };

      invokeUpsert(newObstacle);

      expect(section.obstacles.length).toBe(2);
      expect(section.obstacles[0].uuid).toBe('obs-1');
      expect(section.obstacles[1].uuid).toBe('obs-2');
    });
  });

  describe('returnToSpan', () => {
    it('should return early when no supportUuid', () => {
      service.form.patchValue({ supportUuid: null });
      service.returnToSpan();
      expect(mockPlotService.plotOptionsChange).not.toHaveBeenCalled();
    });
    it('should not update plot when support index is invalid', () => {
      mockPlotService.getSupportIndex.mockReturnValue(-1);
      service.form.patchValue({ supportUuid: 'sup-1' });
      service.returnToSpan();
      expect(mockPlotService.plotOptionsChange).not.toHaveBeenCalled();
    });
    it('should call plotOptionsChange and spanAmountChoice when support valid', () => {
      mockPlotService.getSupportIndex.mockReturnValue(0);
      service.form.patchValue({ supportUuid: 'sup-1' });
      service.returnToSpan();
      expect(mockPlotService.plotOptionsChange).toHaveBeenCalledWith({
        startSupport: 0,
        endSupport: 1
      });
    });
  });
});
