/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import { FreePositioningDataService } from '@core/services/free-positioning-data/free-positioning-data.service';
import { LoadFormsService } from '@features/studio/loads/presentation/services/loadForms.service';
import { PlotOptionsService } from '@services/plot/plot-options.service';
import { PlotSpanService } from '@services/plot/plot-span.service';
import { PlotService } from '@services/plot/plot.service';
import { LoadsFreePositioningComponent } from './loads-free-positioning.component';

describe('LoadsFreePositioningComponent', () => {
  let component: LoadsFreePositioningComponent;
  let fixture: ComponentFixture<LoadsFreePositioningComponent>;

  const mockDataService = {
    getPoints: vi.fn().mockReturnValue([])
  };

  const mockLoadFormsService = {
    setLoadPosition: vi.fn(),
    activeSpanSupportUuid: signal<string | null>(null)
  };

  const mockPlotOptionsService = {
    plotOptions: signal({ startSupport: 1, endSupport: 2, view: '2d', side: 'profile' }),
    setFreePositioningMode: vi.fn(),
    syncFrozenSpan: vi.fn()
  };

  const mockPlotSpanService = {
    section: signal({ supports: [{ uuid: 'sup-0' }, { uuid: 'sup-1' }, { uuid: 'sup-2' }] }),
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

    mockPlotOptionsService.plotOptions.set({ startSupport: 1, endSupport: 2, view: '2d', side: 'profile' });
    mockLoadFormsService.activeSpanSupportUuid.set(null);

    await TestBed.configureTestingModule({
      imports: [
        TranslocoTestingModule.forRoot({
          langs: { en: {} },
          translocoConfig: { availableLangs: ['en'], defaultLang: 'en' },
          preloadLangs: true
        }),
        LoadsFreePositioningComponent
      ],
      providers: [
        { provide: FreePositioningDataService, useValue: mockDataService },
        { provide: LoadFormsService, useValue: mockLoadFormsService },
        { provide: PlotOptionsService, useValue: mockPlotOptionsService },
        { provide: PlotSpanService, useValue: mockPlotSpanService },
        { provide: PlotService, useValue: mockPlotService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(LoadsFreePositioningComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  describe('frozenSpan and points', () => {
    it('should compute frozen span from plotOptions startSupport', () => {
      fixture.detectChanges();
      expect(component.frozenSpan()).toBe(1);
    });

    it('should query dataService with frozenSpan and loads category', () => {
      fixture.detectChanges();
      expect(mockDataService.getPoints).toHaveBeenCalledWith(1, 'loads');
    });

    it('should recompute frozen span from the load-marking form span selection', () => {
      fixture.detectChanges();
      expect(component.frozenSpan()).toBe(1);

      mockLoadFormsService.activeSpanSupportUuid.set('sup-1');
      fixture.detectChanges();
      expect(component.frozenSpan()).toBe(1);

      mockLoadFormsService.activeSpanSupportUuid.set('sup-0');
      fixture.detectChanges();
      expect(component.frozenSpan()).toBe(0);
    });

    it('should sync the span selector display when frozenSpan changes', () => {
      fixture.detectChanges();
      expect(mockPlotOptionsService.syncFrozenSpan).toHaveBeenCalledWith(1);

      mockLoadFormsService.activeSpanSupportUuid.set('sup-0');
      fixture.detectChanges();
      expect(mockPlotOptionsService.syncFrozenSpan).toHaveBeenCalledWith(0);
    });
  });

  describe('onPlacement', () => {
    it('should delegate alongSpan to loadFormsService.setLoadPosition', () => {
      fixture.detectChanges();
      component.onPlacement({
        alongSpan: 42.5,
        lateral: null,
        altitude: 120,
        category: 'loads',
        side: 'profile'
      });

      expect(mockLoadFormsService.setLoadPosition).toHaveBeenCalledWith(42.5);
    });
  });

  describe('ngOnDestroy', () => {
    it('should turn off free positioning mode for loads on destroy', () => {
      fixture.detectChanges();
      fixture.destroy();

      expect(mockPlotOptionsService.setFreePositioningMode).toHaveBeenCalledWith(false, 'loads');
    });
  });
});
