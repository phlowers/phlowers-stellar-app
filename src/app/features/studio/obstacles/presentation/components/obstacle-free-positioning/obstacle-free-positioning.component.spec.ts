/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
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
import { NotificationService } from '@services/notification/notification.service';
import { ObstacleFormService } from '@services/obstacles-form/obstaclesForm.service';
import { ObstaclesService } from '@services/obstacles/obstacles.service';
import { PlotOptionsService } from '@services/plot/plot-options.service';
import { PlotSpanService } from '@services/plot/plot-span.service';
import { PlotService } from '@services/plot/plot.service';
import { ObstacleFreePositioningComponent } from './obstacle-free-positioning.component';

describe('ObstacleFreePositioningComponent', () => {
  let component: ObstacleFreePositioningComponent;
  let fixture: ComponentFixture<ObstacleFreePositioningComponent>;
  let fb: FormBuilder;

  let positionsArray: FormArray;
  let obstacleForm: FormGroup;

  const mockDataService = {
    getPoints: vi.fn().mockReturnValue([])
  };

  const mockObstacleFormService = {
    form: null as unknown as FormGroup,
    positions: null as unknown as FormArray
  };

  const mockObstaclesService = {
    activePointIndex: signal<number | null>(0)
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
    litData: signal({
      coords: {
        supports: [[[0, 0, 100]], [[100, 0, 110]]]
      }
    })
  };

  const mockNotificationService = {
    warning: vi.fn()
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    fb = new FormBuilder();

    positionsArray = fb.array([fb.group({ x: [10], y: [5], z: [20] }), fb.group({ x: [30], y: [15], z: [25] })]);

    obstacleForm = fb.group({
      positions: positionsArray,
      supportUuid: ['sup-0'],
      altitudeType: ['absolute'],
      referenceSupport: ['LEFT'],
      lateralDistanceType: ['SPAN_AXIS']
    });

    mockObstacleFormService.form = obstacleForm;
    mockObstacleFormService.positions = positionsArray;
    mockObstaclesService.activePointIndex.set(0);
    mockPlotOptionsService.frozenSpan.set(0);

    await TestBed.configureTestingModule({
      imports: [
        TranslocoTestingModule.forRoot({
          langs: { en: {} },
          translocoConfig: { availableLangs: ['en'], defaultLang: 'en' },
          preloadLangs: true
        }),
        ObstacleFreePositioningComponent
      ],
      providers: [
        { provide: FreePositioningDataService, useValue: mockDataService },
        { provide: ObstacleFormService, useValue: mockObstacleFormService },
        { provide: ObstaclesService, useValue: mockObstaclesService },
        { provide: PlotOptionsService, useValue: mockPlotOptionsService },
        { provide: PlotSpanService, useValue: mockPlotSpanService },
        { provide: PlotService, useValue: mockPlotService },
        { provide: NotificationService, useValue: mockNotificationService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ObstacleFreePositioningComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  describe('forced frame warning', () => {
    it('should not warn when the obstacle frame already matches the forced fp frame', () => {
      expect(mockNotificationService.warning).not.toHaveBeenCalled();
    });

    it('should warn when the obstacle reference support differs from the forced fp frame', () => {
      obstacleForm.controls['referenceSupport'].setValue('RIGHT');
      TestBed.createComponent(ObstacleFreePositioningComponent);

      expect(mockNotificationService.warning).toHaveBeenCalled();
    });

    it('should warn when the obstacle altitude type differs from the forced fp frame', () => {
      obstacleForm.controls['altitudeType'].setValue('relative');
      TestBed.createComponent(ObstacleFreePositioningComponent);

      expect(mockNotificationService.warning).toHaveBeenCalled();
    });

    it('should warn when the obstacle lateral distance type differs from the forced fp frame', () => {
      obstacleForm.controls['lateralDistanceType'].setValue('LINE_AXIS');
      TestBed.createComponent(ObstacleFreePositioningComponent);

      expect(mockNotificationService.warning).toHaveBeenCalled();
    });
  });

  describe('frozenSpan and points', () => {
    it('should read the frozen span captured by PlotOptionsService', () => {
      fixture.detectChanges();
      expect(component.frozenSpan()).toBe(0);

      mockPlotOptionsService.frozenSpan.set(1);
      fixture.detectChanges();
      expect(component.frozenSpan()).toBe(1);
    });

    it('should query dataService with frozenSpan and obstacle category', () => {
      fixture.detectChanges();
      expect(mockDataService.getPoints).toHaveBeenCalledWith(0, 'obstacle');
    });

    it('should not follow the obstacle form supportUuid once frozen', () => {
      fixture.detectChanges();
      expect(component.frozenSpan()).toBe(0);

      obstacleForm.controls['supportUuid'].setValue('sup-1');
      fixture.detectChanges();
      expect(component.frozenSpan()).toBe(0);
    });
  });

  describe('onPlacement', () => {
    it('should update x and z on profile placement in absolute mode', () => {
      fixture.detectChanges();
      component.onPlacement({
        alongSpan: 45,
        lateral: null,
        altitude: 120,
        category: 'obstacle',
        side: 'profile'
      });

      expect(positionsArray.at(0).value).toEqual({
        x: 45,
        y: 5,
        z: 120
      });
    });

    it('should update y on face placement keeping x and z', () => {
      fixture.detectChanges();
      component.onPlacement({
        alongSpan: 0,
        lateral: -12.5,
        altitude: 120,
        category: 'obstacle',
        side: 'face'
      });

      expect(positionsArray.at(0).value).toEqual({
        x: 10,
        y: -12.5,
        z: 20
      });
    });

    it('should calculate relative altitude when altitudeType is not absolute', () => {
      obstacleForm.controls['altitudeType'].setValue('relative');
      fixture.detectChanges();

      // ref altitude of support 0 is 100
      component.onPlacement({
        alongSpan: 45,
        lateral: null,
        altitude: 120,
        category: 'obstacle',
        side: 'profile'
      });

      expect(positionsArray.at(0).value.z).toBe(20); // 120 - 100
    });
  });

  describe('onSelection', () => {
    it('should set active point index when an obstacle form point is selected', () => {
      fixture.detectChanges();
      component.onSelection({
        point: {
          id: 'obstacle-form-1',
          category: 'obstacle',
          alongSpan: 30,
          lateral: 15,
          altitude: 25,
          editable: false
        }
      });

      expect(mockObstaclesService.activePointIndex()).toBe(1);
    });

    it('should not change active point index for non-obstacle points or saved obstacles', () => {
      fixture.detectChanges();
      mockObstaclesService.activePointIndex.set(0);

      component.onSelection({
        point: {
          id: 'obstacle-saved-1-0',
          category: 'obstacle',
          alongSpan: 30,
          lateral: 15,
          altitude: 25,
          editable: false
        }
      });

      expect(mockObstaclesService.activePointIndex()).toBe(0);
    });
  });

  describe('ngOnDestroy', () => {
    it('should turn off free positioning mode for obstacle on destroy', () => {
      fixture.detectChanges();
      fixture.destroy();

      expect(mockPlotOptionsService.setFreePositioningMode).toHaveBeenCalledWith(false, 'obstacle');
    });
  });
});
