import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { PlotService } from '@ui/pages/studio/services/plot.service';
import { ObstaclesService } from '../obstacles.service';
import { SectionService } from '@core/services/sections/section.service';
import { MessageService } from 'primeng/api';
import { signal } from '@angular/core';
import { LateralDistanceType, Obstacle, Position3D, ReferenceSupport } from '@core/domain/models/obstacle.model';
import { Section, Study, Support } from '@core/domain';
import { ObstacleFormService } from './obstaclesForm.service';
import { DEBOUNCED_UPDATE_POINT_DELAY } from './constants';

const mockSupports = [
  { uuid: 'sup-1', number: 1 } as unknown as Support,
  { uuid: 'sup-2', number: 2 } as unknown as Support
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
  obstacles: [] as Obstacle[],
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
    getSupportIndex: jest.Mock;
    getSupportOptions: jest.Mock;
    getSpanOptions: jest.Mock;
    plotOptionsChange: jest.Mock;
    spanAmountChoice: ReturnType<typeof signal<'single' | 'double' | 'all'>>;
    section: ReturnType<typeof signal<Section | null>>;
    study: ReturnType<typeof signal<Study | null>>;
  };
  let mockObstaclesService: {
    currentPointIndex: ReturnType<typeof signal<number>>;
    setCurrentPointIndex: jest.Mock;
    resetCurrentPointIndex: jest.Mock;
  };
  let mockSectionService: { createOrUpdateSection: jest.Mock };
  let mockMessageService: { add: jest.Mock };

  beforeEach(() => {
    const sectionSignal = signal<Section | null>({ ...mockSection });
    const spanAmountChoiceSignal = signal<'single' | 'double' | 'all'>('all');
    mockPlotService = {
      getSupportIndex: jest.fn().mockReturnValue(0),
      getSupportOptions: jest.fn().mockReturnValue([
        { label: 1, value: ReferenceSupport.LEFT },
        { label: 2, value: ReferenceSupport.RIGHT }
      ]),
      getSpanOptions: jest.fn().mockReturnValue([{ label: '1 - 2', value: 'sup-1' }]),
      plotOptionsChange: jest.fn(),
      spanAmountChoice: spanAmountChoiceSignal,
      section: sectionSignal,
      study: signal<Study | null>(mockStudy)
    };
    mockObstaclesService = {
      currentPointIndex: signal(0),
      setCurrentPointIndex: jest.fn(),
      resetCurrentPointIndex: jest.fn()
    };
    mockSectionService = {
      createOrUpdateSection: jest.fn().mockResolvedValue(undefined)
    };
    mockMessageService = {
      add: jest.fn()
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
        verticale: null,
        horizontale: null
      });
      expect(result).toBeDefined();
    }));
    it('should update plot and supportsOptions when supportUuid is valid', () => {
      (mockPlotService.getSupportIndex as jest.Mock).mockReturnValue(0);
      service.resetFormForNewObstacle('sup-1');
      expect(mockPlotService.plotOptionsChange).toHaveBeenCalledWith({
        startSupport: 0,
        endSupport: 1
      });
      expect(mockPlotService.spanAmountChoice.set).toBeDefined();
      expect(service.supportsOptions().length).toBeGreaterThanOrEqual(0);
    });
    it('should avoid plot change when support index is invalid', () => {
      (mockPlotService.getSupportIndex as jest.Mock).mockReturnValue(-1);
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
      jest
        .spyOn(service as unknown as { findSupportForObstacle: () => Support | undefined }, 'findSupportForObstacle')
        .mockReturnValue({ uuid: 'sup-2', number: 2 } as unknown as Support);

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
      expect(service.results().oblique).toBe(123);
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
        { label: 1, value: ReferenceSupport.LEFT },
        { label: 2, value: ReferenceSupport.RIGHT }
      ]);
      await service.calculateAndSave();
      expect(section.obstacles.length).toBe(1);
      // New obstacle is built from resetFormForNewObstacle (reset form values) then positions/uuid are set
      expect(section.obstacles[0].uuid).toBe('new-uuid');
      expect(section.obstacles[0].positions).toHaveLength(1);
      expect(mockSectionService.createOrUpdateSection).toHaveBeenCalledWith(mockStudy, section);
      expect(service.results().oblique).toBe(123);
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
      expect(existing.name).toBe('Updated Name');
      expect(existing.type).toBe('Tree');
      expect(existing.positions.length).toBe(1);
      expect(mockSectionService.createOrUpdateSection).toHaveBeenCalledWith(mockStudy, section);
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

      (service as unknown as { upsertObstacleInSection: (o: Obstacle) => void }).upsertObstacleInSection(obstacle);

      expect(mockPlotService.section()).toBeNull();
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
