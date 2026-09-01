import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { QuickMeasuresComponent } from './quick-measures.component';
import { PlotSpanService } from '@services/plot/plot-span.service';
import { PlotOptionsService } from '@services/plot/plot-options.service';
import { ObstaclesService } from '@services/obstacles/obstacles.service';
import { ObstacleFormService } from '@services/obstacles-form/obstaclesForm.service';
import { ObstacleStateService } from '@services/obstacle-state/obstacle-state.service';
import { FloorFormService } from '@services/floor-form/floor-form.service';
import { Section } from '@shared/domain';
import { Distance } from '@services/worker_python/tasks/types';

class SpanServiceMock {
  section = signal<Section | null>(null);
  getSpanOptions = vi.fn().mockReturnValue([{ label: '1 - 2', value: 'sup-0' }]);
}

describe('QuickMeasuresComponent', () => {
  let component: QuickMeasuresComponent;
  let fixture: ComponentFixture<QuickMeasuresComponent>;
  let spanService: SpanServiceMock;
  let plotOptionsServiceMock: { plotOptions: ReturnType<typeof vi.fn> };
  let obstaclesService: ObstaclesService;
  let obstacleFormService: {
    setExistingObstacle: ReturnType<typeof vi.fn>;
    results: ReturnType<typeof signal<{ oblique: number | null; vertical: number | null; horizontal: number | null }>>;
  };
  let obstacleStateService: {
    distanceType: ReturnType<typeof signal<string | null>>;
    distances: ReturnType<typeof signal<Distance[]>>;
  };
  let floorFormService: { selectFloorPoint: ReturnType<typeof vi.fn> };

  const sectionWithFloor = () =>
    ({
      supports: [{ uuid: 'sup-0' }, { uuid: 'sup-1' }, { uuid: 'sup-2' }],
      obstacles: [{ uuid: 'obs-0', name: 'Obstacle A', supportUuid: 'sup-0', positions: [{ x: 0, y: 0, z: 0 }] }],
      floors: [
        {
          uuid: 'floor-0',
          supportUuid: 'sup-0',
          referenceSupport: 'LEFT',
          points: [
            { altitude: 100, distanceToRefSupport: 0 },
            { altitude: 102, distanceToRefSupport: 450 }
          ]
        }
      ]
    }) as unknown as Section;

  beforeEach(async () => {
    spanService = new SpanServiceMock();
    plotOptionsServiceMock = {
      plotOptions: vi.fn().mockReturnValue({ invert: false, startSupport: 0, endSupport: 3 })
    };
    obstacleFormService = {
      setExistingObstacle: vi.fn(),
      results: signal<{ oblique: number | null; vertical: number | null; horizontal: number | null }>({
        oblique: null,
        vertical: null,
        horizontal: null
      })
    };
    obstacleStateService = { distanceType: signal<string | null>(null), distances: signal<Distance[]>([]) };
    floorFormService = { selectFloorPoint: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [
        TranslocoTestingModule.forRoot({
          langs: {
            en: {
              'studio.studio-page.not-selected-option': 'Not selected',
              'studio.studio-page.point-option': 'Point {{ index }}',
              'studio.studio-page.floor-option': 'floor {{ span }}',
              'studio.floor.point-title': 'Point {{ distance }} m'
            }
          },
          translocoConfig: { availableLangs: ['en'], defaultLang: 'en' },
          preloadLangs: true
        }),
        QuickMeasuresComponent
      ],
      providers: [
        provideNoopAnimations(),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: PlotSpanService, useValue: spanService },
        { provide: PlotOptionsService, useValue: plotOptionsServiceMock },
        { provide: ObstacleFormService, useValue: obstacleFormService },
        { provide: ObstacleStateService, useValue: obstacleStateService },
        { provide: FloorFormService, useValue: floorFormService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(QuickMeasuresComponent);
    component = fixture.componentInstance;
    obstaclesService = TestBed.inject(ObstaclesService);
    obstaclesService.setSelectedMeasure(null, null);
  });

  describe('filteredObstaclesOptions', () => {
    it('should return empty array when section is null', () => {
      expect(component.filteredObstaclesOptions()).toEqual([]);
    });

    it('should include only obstacles whose supportUuid falls within the slider range (endSupport exclusive)', () => {
      spanService.section.set({
        supports: [{ uuid: 'sup-0' }, { uuid: 'sup-1' }, { uuid: 'sup-2' }],
        obstacles: [
          { uuid: 'obs-0', name: 'Obstacle A', supportUuid: 'sup-0' },
          { uuid: 'obs-1', name: 'Obstacle B', supportUuid: 'sup-1' },
          { uuid: 'obs-2', name: 'Obstacle C', supportUuid: 'sup-2' }
        ]
      } as unknown as Section);

      expect(component.filteredObstaclesOptions()).toEqual([
        { label: 'Not selected', value: null },
        { label: 'Obstacle A', value: 'obs-0' },
        { label: 'Obstacle B', value: 'obs-1' },
        { label: 'Obstacle C', value: 'obs-2' }
      ]);
    });

    it('should exclude obstacles outside the slider range', () => {
      plotOptionsServiceMock.plotOptions.mockReturnValue({ invert: false, startSupport: 1, endSupport: 3 });
      spanService.section.set({
        supports: [{ uuid: 'sup-0' }, { uuid: 'sup-1' }, { uuid: 'sup-2' }],
        obstacles: [
          { uuid: 'obs-0', name: 'Obstacle A', supportUuid: 'sup-0' },
          { uuid: 'obs-1', name: 'Obstacle B', supportUuid: 'sup-1' }
        ]
      } as unknown as Section);

      expect(component.filteredObstaclesOptions()).toEqual([
        { label: 'Not selected', value: null },
        { label: 'Obstacle B', value: 'obs-1' }
      ]);
    });

    it('should include visible floors labeled with their span supports', () => {
      spanService.section.set(sectionWithFloor());

      expect(component.filteredObstaclesOptions()).toEqual([
        { label: 'Not selected', value: null },
        { label: 'Obstacle A', value: 'obs-0' },
        { label: 'floor 1 - 2', value: 'floor-0' }
      ]);
    });

    it('should exclude floors outside the slider range', () => {
      plotOptionsServiceMock.plotOptions.mockReturnValue({ invert: false, startSupport: 1, endSupport: 3 });
      spanService.section.set(sectionWithFloor());

      expect(component.filteredObstaclesOptions()).toEqual([]);
    });
  });

  describe('obstaclePointOptions', () => {
    it('should return empty array when no obstacle is selected', () => {
      expect(component.obstaclePointOptions()).toEqual([]);
    });

    it('should return labeled point options for the selected obstacle', () => {
      spanService.section.set({
        supports: [],
        obstacles: [
          {
            uuid: 'obs-1',
            name: 'Obstacle A',
            supportUuid: 'sup-0',
            positions: [
              { x: 1, y: 2, z: 3 },
              { x: 4, y: 5, z: 6 }
            ]
          }
        ]
      } as unknown as Section);
      obstaclesService.selectedMeasureUuid.set('obs-1');

      expect(component.obstaclePointOptions()).toEqual([
        { label: 'Point 1', value: 0 },
        { label: 'Point 2', value: 1 }
      ]);
    });

    it('should label floor points with their distance to the reference support', () => {
      spanService.section.set(sectionWithFloor());
      obstaclesService.selectedMeasureUuid.set('floor-0');

      expect(component.obstaclePointOptions()).toEqual([
        { label: 'Point 0.00 m', value: 0 },
        { label: 'Point 450.00 m', value: 1 }
      ]);
    });
  });

  describe('isFloorSelected', () => {
    it('should be true only when the selected uuid belongs to a floor', () => {
      spanService.section.set(sectionWithFloor());

      obstaclesService.selectedMeasureUuid.set('obs-0');
      expect(component.isFloorSelected()).toBe(false);

      obstaclesService.selectedMeasureUuid.set('floor-0');
      expect(component.isFloorSelected()).toBe(true);
    });
  });

  describe('onObstacleSelect', () => {
    it('should auto-select point index 0 when obstacle has exactly one point', () => {
      spanService.section.set(sectionWithFloor());

      component.onObstacleSelect('obs-0');

      expect(obstaclesService.selectedMeasureUuid()).toBe('obs-0');
      expect(obstaclesService.activePointIndex()).toBe(0);
      expect(obstacleFormService.setExistingObstacle).toHaveBeenCalled();
    });

    it('should set null point index when obstacle has multiple points', () => {
      spanService.section.set({
        supports: [],
        obstacles: [
          {
            uuid: 'obs-1',
            name: 'Obstacle A',
            supportUuid: 'sup-0',
            positions: [
              { x: 1, y: 2, z: 3 },
              { x: 4, y: 5, z: 6 }
            ]
          }
        ]
      } as unknown as Section);
      obstaclesService.activePointIndex.set(1);

      component.onObstacleSelect('obs-1');

      expect(obstaclesService.selectedMeasureUuid()).toBe('obs-1');
      expect(obstaclesService.activePointIndex()).toBeNull();
    });

    it('should clear the selection, point index and distanceType when called with null', () => {
      obstaclesService.setSelectedMeasure('obs-1', 2);
      obstacleStateService.distanceType.set('vertical');

      component.onObstacleSelect(null);

      expect(obstaclesService.selectedMeasureUuid()).toBeNull();
      expect(obstaclesService.activePointIndex()).toBeNull();
      expect(obstacleStateService.distanceType()).toBeNull();
    });

    it('should select a floor without loading the obstacle form', () => {
      spanService.section.set(sectionWithFloor());
      obstacleStateService.distanceType.set('oblique');

      component.onObstacleSelect('floor-0');

      expect(obstaclesService.selectedMeasureUuid()).toBe('floor-0');
      expect(obstaclesService.activePointIndex()).toBeNull();
      expect(obstacleStateService.distanceType()).toBeNull();
      expect(obstacleFormService.setExistingObstacle).not.toHaveBeenCalled();
    });
  });

  describe('onPointSelect', () => {
    it('should only set the active point index for an obstacle', () => {
      spanService.section.set(sectionWithFloor());
      obstaclesService.selectedMeasureUuid.set('obs-0');

      component.onPointSelect(0);

      expect(obstaclesService.activePointIndex()).toBe(0);
      // An obstacle keeps its distance-type radios, so nothing is picked for it here.
      expect(obstacleStateService.distanceType()).toBeNull();
      expect(floorFormService.selectFloorPoint).not.toHaveBeenCalled();
    });

    it('should route a floor point through the shared floor selection, as a plot click does', () => {
      spanService.section.set(sectionWithFloor());
      obstaclesService.selectedMeasureUuid.set('floor-0');

      component.onPointSelect(1);

      expect(obstaclesService.activePointIndex()).toBe(1);
      // selectFloorPoint owns the rest of the sync (selection + vertical distance) so that a plot
      // click and this select behave identically — covered in floor-form.service.spec.ts.
      expect(floorFormService.selectFloorPoint).toHaveBeenCalledWith('floor-0', 1);
    });
  });

  describe('HTML rendering - distance radio buttons disabled state', () => {
    const getByTestId = (testId: string): HTMLElement | null =>
      fixture.nativeElement.querySelector(`[data-testid="${testId}"]`);

    const getRadioInput = (testId: string): HTMLInputElement =>
      getByTestId(testId)?.querySelector('input[type="radio"]') as HTMLInputElement;

    it('should render the three distance radio buttons', () => {
      fixture.detectChanges();

      expect(getByTestId('oblique-distance-radio')).toBeTruthy();
      expect(getByTestId('vertical-distance-radio')).toBeTruthy();
      expect(getByTestId('horizontal-distance-radio')).toBeTruthy();
    });

    it('should disable all distance radio buttons when no obstacle is selected', () => {
      obstaclesService.selectedMeasureUuid.set(null);
      fixture.detectChanges();

      expect(getRadioInput('oblique-distance-radio')?.disabled).toBe(true);
      expect(getRadioInput('vertical-distance-radio')?.disabled).toBe(true);
      expect(getRadioInput('horizontal-distance-radio')?.disabled).toBe(true);
    });

    it('should enable all distance radio buttons when an obstacle is selected', () => {
      obstaclesService.selectedMeasureUuid.set('obs-1');
      fixture.detectChanges();

      expect(getRadioInput('oblique-distance-radio')?.disabled).toBe(false);
      expect(getRadioInput('vertical-distance-radio')?.disabled).toBe(false);
      expect(getRadioInput('horizontal-distance-radio')?.disabled).toBe(false);
    });

    it('should disable radio buttons when obstacle is deselected', () => {
      obstaclesService.selectedMeasureUuid.set('obs-1');
      fixture.detectChanges();

      obstaclesService.selectedMeasureUuid.set(null);
      fixture.detectChanges();

      expect(getRadioInput('oblique-distance-radio')?.disabled).toBe(true);
    });

    it('should show the floor value rows without radios when a floor is selected', () => {
      spanService.section.set(sectionWithFloor());
      obstaclesService.selectedMeasureUuid.set('floor-0');
      fixture.detectChanges();

      expect(getByTestId('floor-distance-vertical-value')).toBeTruthy();
      expect(getByTestId('floor-alt-cable-value')).toBeTruthy();
      expect(getByTestId('oblique-distance-radio')).toBeNull();
      expect(fixture.nativeElement.querySelector('input[type="radio"]')).toBeNull();
    });
  });

  describe('floorCableAltitude', () => {
    it('should return the z of virtualPointVertical for the selected point', () => {
      spanService.section.set(sectionWithFloor());
      obstaclesService.setSelectedMeasure('floor-0', 1);
      obstacleStateService.distances.set([
        {
          obstacleUuid: 'floor-0',
          points: [
            { pointIndex: 0, virtualPointVertical: [0, 0, 110.123] },
            { pointIndex: 1, virtualPointVertical: [450, 0, 112.456] }
          ]
        }
      ] as unknown as Distance[]);

      expect(component.floorCableAltitude()).toBeCloseTo(112.456);
    });

    it('should return null when no point is selected', () => {
      spanService.section.set(sectionWithFloor());
      obstaclesService.setSelectedMeasure('floor-0', null);

      expect(component.floorCableAltitude()).toBeNull();
    });
  });
});
