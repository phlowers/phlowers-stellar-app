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
import { describe, expect, it, vi, beforeEach } from 'vitest';

import { FreePositioningDataService } from '@core/services/free-positioning-data/free-positioning-data.service';
import { DistanceMeasuringService } from '@features/studio/distance-measuring/distance-measuring.service';
import { PlotOptionsService } from '@services/plot/plot-options.service';
import { PlotSpanService } from '@services/plot/plot-span.service';
import { PlotService } from '@services/plot/plot.service';
import { DistanceFreePositioningComponent } from './distance-free-positioning.component';

describe('DistanceFreePositioningComponent', () => {
  let component: DistanceFreePositioningComponent;
  let fixture: ComponentFixture<DistanceFreePositioningComponent>;
  let fb: FormBuilder;

  let formArray: FormArray;

  const mockDataService = {
    getPoints: vi.fn().mockReturnValue([])
  };

  const mockDistanceMeasuringService = {
    form: null as unknown as FormArray,
    positions: null as unknown as ReturnType<typeof signal<{ x: number | null; y: number | null; z: number | null }[]>>,
    activePointIndex: signal<number | null>(0),
    selectedSupportUuid: signal<string | null>('sup-0')
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

    formArray = fb.array([
      fb.group({ x: [10], y: [null], z: [20] }),
      fb.group({ x: [null], y: [null], z: [null] })
    ]);

    mockDistanceMeasuringService.form = formArray;
    mockDistanceMeasuringService.activePointIndex.set(0);
    mockDistanceMeasuringService.selectedSupportUuid.set('sup-0');
    mockPlotOptionsService.frozenSpan.set(0);
    mockDistanceMeasuringService.positions = signal([
      { x: 10, y: null, z: 20 },
      { x: null, y: null, z: null }
    ]);

    await TestBed.configureTestingModule({
      imports: [
        TranslocoTestingModule.forRoot({
          langs: { en: {} },
          translocoConfig: { availableLangs: ['en'], defaultLang: 'en' },
          preloadLangs: true
        }),
        DistanceFreePositioningComponent
      ],
      providers: [
        { provide: FreePositioningDataService, useValue: mockDataService },
        { provide: DistanceMeasuringService, useValue: mockDistanceMeasuringService },
        { provide: PlotOptionsService, useValue: mockPlotOptionsService },
        { provide: PlotSpanService, useValue: mockPlotSpanService },
        { provide: PlotService, useValue: mockPlotService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(DistanceFreePositioningComponent);
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

    it('should query dataService with frozenSpan and distance category', () => {
      fixture.detectChanges();
      expect(mockDataService.getPoints).toHaveBeenCalledWith(0, 'distance');
    });

    it('should not follow the tab span field once frozen', () => {
      fixture.detectChanges();
      expect(component.frozenSpan()).toBe(0);

      mockDistanceMeasuringService.selectedSupportUuid.set('sup-1');
      fixture.detectChanges();
      expect(component.frozenSpan()).toBe(0);
    });
  });

  describe('onPlacement', () => {
    it('should update x and z on profile placement', () => {
      fixture.detectChanges();
      component.onPlacement({
        alongSpan: 60,
        lateral: null,
        altitude: 110,
        category: 'distance',
        side: 'profile'
      });

      expect(formArray.at(0).value).toEqual({
        x: 60,
        y: null,
        z: 110
      });
    });

    it('should update y on face placement keeping x and z', () => {
      fixture.detectChanges();
      component.onPlacement({
        alongSpan: 0,
        lateral: 12.5,
        altitude: 110,
        category: 'distance',
        side: 'face'
      });

      expect(formArray.at(0).value).toEqual({
        x: 10,
        y: 12.5,
        z: 20
      });
    });
  });

  describe('onSelection', () => {
    it('should set active point index when a distance form point is selected', () => {
      fixture.detectChanges();
      component.onSelection({
        point: {
          id: 'distance-form-1',
          category: 'distance',
          alongSpan: 50,
          lateral: 5,
          altitude: 100,
          editable: false
        }
      });

      expect(mockDistanceMeasuringService.activePointIndex()).toBe(1);
    });
  });

  describe('ngOnDestroy', () => {
    it('should turn off free positioning mode for distance on destroy', () => {
      fixture.detectChanges();
      fixture.destroy();

      expect(mockPlotOptionsService.setFreePositioningMode).toHaveBeenCalledWith(false, 'distance');
    });
  });
});

