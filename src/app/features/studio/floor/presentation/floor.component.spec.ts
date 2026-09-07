/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { FormArray, FormBuilder } from '@angular/forms';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { FloorComponent } from './floor.component';
import { PlotOptionsService } from '@services/plot/plot-options.service';
import { FloorFormService } from '@services/floor-form/floor-form.service';
import { FloorPointFormGroup, FloorResults } from '@shared/domain/floor/floor-form.interfaces';

describe('FloorComponent', () => {
  let component: FloorComponent;
  let fixture: ComponentFixture<FloorComponent>;
  let hasEditablePoints: ReturnType<typeof signal<boolean>>;
  let points: FormArray<FloorPointFormGroup>;

  const mockPlotOptionsService = {
    isFreePositioningMode: signal(false),
    freePositioningSource: signal<'obstacle' | 'floor' | null>(null),
    setFreePositioningMode: vi.fn((enabled: boolean, source: 'obstacle' | 'floor') => {
      mockPlotOptionsService.isFreePositioningMode.set(enabled);
      mockPlotOptionsService.freePositioningSource.set(enabled ? source : null);
    })
  };

  const noResults: FloorResults = {
    minVerticalDistance: null,
    floorAltitude: null,
    cableAltitude: null,
    minVerticalPosition: null
  };

  /** Everything the real template reads; only `hasEditablePoints` matters to the stubbed-template tests. */
  const mockFloorFormService = {
    form: null as unknown as ReturnType<FormBuilder['group']>,
    hasEditablePoints: null as unknown as ReturnType<typeof signal<boolean>>,
    spanValue: signal<string | null>('s1'),
    referenceSupportValue: signal<'LEFT' | 'RIGHT' | null>('LEFT'),
    spanOptions: signal([{ label: 'span 1', value: 's1' }]),
    supportsOptions: signal([{ label: 'left', value: 'LEFT' }]),
    activePointIndex: signal<number | null>(1),
    pointsView: vi.fn(),
    results: signal<FloorResults>(noResults),
    isFloorSaved: signal(false),
    isCalculating: signal(false),
    canCalculateAndSave: signal(true),
    formatDistance: (value: number | null) => `${value ?? '-'}`,
    returnToSpan: vi.fn(),
    addPoint: vi.fn(),
    deletePoint: vi.fn(),
    setActivePoint: vi.fn(),
    onDistanceBlur: vi.fn(),
    eraseFloor: vi.fn(),
    calculateAndSave: vi.fn()
  };

  /** `stubTemplate: false` keeps the real template, so its branches and bindings get compiled and rendered. */
  const configureTestBed = async (stubTemplate = true) => {
    const testBed = TestBed.configureTestingModule({
      imports: [
        TranslocoTestingModule.forRoot({
          langs: { en: {} },
          translocoConfig: { availableLangs: ['en'], defaultLang: 'en' },
          preloadLangs: true
        }),
        FloorComponent
      ],
      providers: [
        { provide: PlotOptionsService, useValue: mockPlotOptionsService },
        { provide: FloorFormService, useValue: mockFloorFormService }
      ]
    });
    if (stubTemplate) {
      testBed.overrideComponent(FloorComponent, { set: { template: '<div></div>' } });
    }
    await testBed.compileComponents();

    fixture = TestBed.createComponent(FloorComponent);
    component = fixture.componentInstance;
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    hasEditablePoints = signal(true);
    mockPlotOptionsService.isFreePositioningMode.set(false);
    mockPlotOptionsService.freePositioningSource.set(null);

    const fb = new FormBuilder();
    points = fb.array([
      fb.group({ altitude: 10 as number | null, distanceToRefSupport: 0 as number | null }),
      fb.group({ altitude: 20 as number | null, distanceToRefSupport: 50 as number | null }),
      fb.group({ altitude: 12 as number | null, distanceToRefSupport: 100 as number | null })
    ]) as unknown as FormArray<FloorPointFormGroup>;

    mockFloorFormService.form = fb.group({ span: 's1', referenceSupport: 'LEFT' });
    mockFloorFormService.hasEditablePoints = hasEditablePoints;
    mockFloorFormService.referenceSupportValue.set('LEFT');
    mockFloorFormService.activePointIndex.set(1);
    mockFloorFormService.results.set(noResults);
    mockFloorFormService.isFloorSaved.set(false);
    mockFloorFormService.isCalculating.set(false);
    mockFloorFormService.canCalculateAndSave.set(true);
    // Middle points are the removable (free) ones, as in the service.
    mockFloorFormService.pointsView.mockReturnValue(
      points.controls.map((group, index) => ({
        group,
        meta: {
          titleKey: 'studio.floor.point-title',
          altitudeReadonly: index === 0,
          distanceToRefSupportReadonly: index === 0,
          removable: index > 0 && index < points.length - 1
        }
      }))
    );

    await configureTestBed();
  });

  describe('template rendering', () => {
    /** The real template, so its branches and bindings are compiled rather than stubbed away. */
    beforeEach(async () => {
      TestBed.resetTestingModule();
      await configureTestBed(false);
    });

    const queryAll = (testId: string): HTMLElement[] => [
      ...fixture.nativeElement.querySelectorAll(`[data-testid="${testId}"]`)
    ];
    const query = (testId: string) => queryAll(testId)[0] ?? null;

    it('should render one item per point, flagging the active one as selected', () => {
      fixture.detectChanges();

      const items = queryAll('point-item');
      expect(items).toHaveLength(3);
      expect(items.map((item) => item.getAttribute('aria-selected'))).toEqual(['false', 'true', 'false']);
    });

    it('should offer deletion only on the free points', () => {
      fixture.detectChanges();

      expect(queryAll('delete-point')).toHaveLength(1);
      expect(query('delete-point')?.getAttribute('aria-label')).toBeTruthy();
    });

    it('should hide the point list until a reference support is picked', () => {
      mockFloorFormService.referenceSupportValue.set(null);

      fixture.detectChanges();

      expect(query('points-list')).toBeNull();
      expect(query('free-positioning')).toBeNull();
      // The results panel stays: it belongs to the saved floor, not to the edited points.
      expect(query('results')).not.toBeNull();
    });

    it('should disable free positioning while no point is editable', () => {
      hasEditablePoints.set(false);

      fixture.detectChanges();

      expect(query('free-positioning')?.querySelector('input')?.disabled).toBe(true);
    });

    it('should show a dash for every empty result and the formatted value otherwise', () => {
      fixture.detectChanges();
      expect(query('result-min-vertical-distance')?.textContent?.trim()).toBe('-');

      mockFloorFormService.results.set({ ...noResults, minVerticalDistance: 3.456 });
      fixture.detectChanges();

      expect(query('result-min-vertical-distance')?.textContent?.trim()).toBe('3.46 m');
    });

    it('should keep the destructive and save actions disabled until they apply', () => {
      // `app-btn` is an attribute directive, so the element carrying the testid is the button itself.
      const button = (testId: string) => query(testId) as HTMLButtonElement | null;

      fixture.detectChanges();
      expect(button('delete-floor')?.disabled).toBe(true);

      mockFloorFormService.isFloorSaved.set(true);
      mockFloorFormService.canCalculateAndSave.set(false);
      fixture.detectChanges();

      expect(button('delete-floor')?.disabled).toBe(false);
      expect(button('calculate-save')?.disabled).toBe(true);
    });
  });

  describe('setFreePositioningMode', () => {
    it('should tag the session as floor-driven when turning the mode on', () => {
      component.setFreePositioningMode(true);

      expect(mockPlotOptionsService.setFreePositioningMode).toHaveBeenCalledWith(true, 'floor');
      expect(mockPlotOptionsService.freePositioningSource()).toBe('floor');
    });

    it('should turn the mode off', () => {
      component.setFreePositioningMode(true);

      component.setFreePositioningMode(false);

      expect(mockPlotOptionsService.isFreePositioningMode()).toBe(false);
    });
  });

  describe('leaving free positioning when the last free point is removed', () => {
    it('should stay in the mode while a free point remains', () => {
      component.setFreePositioningMode(true);
      TestBed.flushEffects();

      expect(mockPlotOptionsService.isFreePositioningMode()).toBe(true);
    });

    it('should leave the mode once the last free point is removed', () => {
      component.setFreePositioningMode(true);
      TestBed.flushEffects();

      hasEditablePoints.set(false);
      TestBed.flushEffects();

      expect(mockPlotOptionsService.isFreePositioningMode()).toBe(false);
      expect(mockPlotOptionsService.freePositioningSource()).toBeNull();
    });

    it('should not disturb an obstacle-driven free positioning session', () => {
      mockPlotOptionsService.setFreePositioningMode(true, 'obstacle');
      TestBed.flushEffects();
      vi.clearAllMocks();

      hasEditablePoints.set(false);
      TestBed.flushEffects();

      expect(mockPlotOptionsService.setFreePositioningMode).not.toHaveBeenCalled();
      expect(mockPlotOptionsService.isFreePositioningMode()).toBe(true);
    });
  });
});
