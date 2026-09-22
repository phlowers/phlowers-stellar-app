/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { FormArray, FormBuilder, FormGroup } from '@angular/forms';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import { FreePositioningDataService } from '@core/services/free-positioning-data/free-positioning-data.service';
import { FloorFormService } from '@services/floor-form/floor-form.service';
import { PlotOptionsService } from '@services/plot/plot-options.service';
import { PlotSpanService } from '@services/plot/plot-span.service';
import { PlotService } from '@services/plot/plot.service';
import { FloorFreePositioningComponent } from './floor-free-positioning.component';

describe('FloorFreePositioningComponent', () => {
  let component: FloorFreePositioningComponent;
  let fixture: ComponentFixture<FloorFreePositioningComponent>;
  let fb: FormBuilder;

  let pointsArray: FormArray;

  const mockDataService = {
    getPoints: vi.fn().mockReturnValue([])
  };

  const mockFloorFormService = {
    points: null as unknown as FormArray,
    activePointIndex: signal<number | null>(1),
    spanValue: signal<string | null>('sup-0'),
    referenceSupportValue: signal<'LEFT' | 'RIGHT' | null>('LEFT'),
    spanSupports: signal<{ reference: null; closing: null; spanLength: number | null }>({
      reference: null,
      closing: null,
      spanLength: 200
    }),
    pointsView: vi.fn(),
    setActivePoint: vi.fn(),
    setFreePointPosition: vi.fn()
  };

  const mockPlotOptionsService = {
    plotOptions: signal({ startSupport: 0, endSupport: 1, view: '2d', side: 'profile' }),
    frozenSpan: signal<number>(0),
    setFreePositioningMode: vi.fn()
  };

  const mockPlotSpanService = {
    section: signal({ supports: [{ uuid: 'sup-0' }, { uuid: 'sup-1' }] }),
    getSupportIndex: vi.fn((uuid: string) => (uuid === 'sup-1' ? 1 : 0))
  };

  const mockPlotService = {
    workerReady: signal(true),
    loading: signal(false),
    error: signal(null),
    diagnostics: signal([]),
    litData: signal(null)
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    fb = new FormBuilder();

    pointsArray = fb.array([
      fb.group({ distanceToRefSupport: [0], altitude: [100] }),
      fb.group({ distanceToRefSupport: [45], altitude: [98] }),
      fb.group({ distanceToRefSupport: [200], altitude: [105] })
    ]);

    mockFloorFormService.points = pointsArray;
    mockFloorFormService.spanValue.set('sup-0');
    mockFloorFormService.referenceSupportValue.set('LEFT');
    mockPlotOptionsService.frozenSpan.set(0);
    mockFloorFormService.activePointIndex.set(1);
    mockFloorFormService.pointsView.mockReturnValue([
      { group: pointsArray.at(0) as FormGroup, meta: { removable: false } },
      { group: pointsArray.at(1) as FormGroup, meta: { removable: true } },
      { group: pointsArray.at(2) as FormGroup, meta: { removable: false } }
    ]);

    await TestBed.configureTestingModule({
      imports: [
        TranslocoTestingModule.forRoot({
          langs: { en: {} },
          translocoConfig: { availableLangs: ['en'], defaultLang: 'en' },
          preloadLangs: true
        }),
        FloorFreePositioningComponent
      ],
      providers: [
        { provide: FreePositioningDataService, useValue: mockDataService },
        { provide: FloorFormService, useValue: mockFloorFormService },
        { provide: PlotOptionsService, useValue: mockPlotOptionsService },
        { provide: PlotSpanService, useValue: mockPlotSpanService },
        { provide: PlotService, useValue: mockPlotService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(FloorFreePositioningComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  describe('frozenSpan and points', () => {
    it('should read the frozen span captured by PlotOptionsService', () => {
      fixture.detectChanges();
      expect(component.frozenSpan()).toBe(0);

      mockPlotOptionsService.frozenSpan.set(1);
      fixture.detectChanges();
      expect(component.frozenSpan()).toBe(1);
    });

    it('should query dataService with frozenSpan and floor category', () => {
      fixture.detectChanges();
      expect(mockDataService.getPoints).toHaveBeenCalledWith(0, 'floor');
    });

    it('should not follow the tab span field once frozen', () => {
      fixture.detectChanges();
      expect(component.frozenSpan()).toBe(0);

      mockFloorFormService.spanValue.set('sup-1');
      fixture.detectChanges();
      expect(component.frozenSpan()).toBe(0);
    });
  });

  describe('onPlacement', () => {
    it('should update free point position when active point is removable', () => {
      fixture.detectChanges();
      component.onPlacement({
        alongSpan: 55.4,
        lateral: null,
        altitude: 97.2,
        category: 'floor',
        side: 'profile'
      });

      expect(mockFloorFormService.setFreePointPosition).toHaveBeenCalledWith(1, {
        distanceToRefSupport: 55.4,
        altitude: 97.2
      });
    });

    it('should mirror the click abscissa when the reference support is RIGHT', () => {
      mockFloorFormService.referenceSupportValue.set('RIGHT');
      fixture.detectChanges();
      component.onPlacement({
        alongSpan: 55.4,
        lateral: null,
        altitude: 97.2,
        category: 'floor',
        side: 'profile'
      });

      expect(mockFloorFormService.setFreePointPosition).toHaveBeenCalledWith(1, {
        distanceToRefSupport: 200 - 55.4,
        altitude: 97.2
      });
    });

    it('should do nothing if active point is not removable', () => {
      mockFloorFormService.activePointIndex.set(0); // non-removable support point
      fixture.detectChanges();

      component.onPlacement({
        alongSpan: 55.4,
        lateral: null,
        altitude: 97.2,
        category: 'floor',
        side: 'profile'
      });

      expect(mockFloorFormService.setFreePointPosition).not.toHaveBeenCalled();
    });
  });

  describe('onSelection', () => {
    it('should set active point index when a floor form point is selected', () => {
      fixture.detectChanges();
      component.onSelection({
        point: {
          id: 'floor-form-2',
          category: 'floor',
          alongSpan: 200,
          lateral: null,
          altitude: 105,
          editable: false
        }
      });

      expect(mockFloorFormService.setActivePoint).toHaveBeenCalledWith(2);
    });
  });

  describe('ngOnDestroy', () => {
    it('should turn off free positioning mode for floor on destroy', () => {
      fixture.detectChanges();
      fixture.destroy();

      expect(mockPlotOptionsService.setFreePositioningMode).toHaveBeenCalledWith(false, 'floor');
    });
  });
});
