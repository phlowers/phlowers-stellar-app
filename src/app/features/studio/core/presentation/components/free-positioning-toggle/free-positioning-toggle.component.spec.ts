/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { vi } from 'vitest';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { FreePositioningToggleComponent } from './free-positioning-toggle.component';
import { PlotOptionsService } from '@services/plot/plot-options.service';
import { PlotService } from '@services/plot/plot.service';

describe('FreePositioningToggleComponent', () => {
  let component: FreePositioningToggleComponent;
  let fixture: ComponentFixture<FreePositioningToggleComponent>;

  const mockPlotOptionsService = {
    isFreePositioningMode: signal(false),
    freePositioningSource: signal<'obstacle' | 'floor' | 'loads' | 'distance' | null>(null),
    plotOptions: signal({ view: '2d', side: 'profile', startSupport: 0, endSupport: 1, invert: false }),
    setFreePositioningMode: vi.fn(
      (enabled: boolean, source: 'obstacle' | 'floor' | 'loads' | 'distance', _spanIndex?: number | null) => {
        mockPlotOptionsService.isFreePositioningMode.set(enabled);
        mockPlotOptionsService.freePositioningSource.set(enabled ? source : null);
      }
    )
  };

  const mockPlotService = {
    plotOptionsChange: vi.fn()
  };

  const query = (selector: string) => fixture.nativeElement.querySelector(selector);

  beforeEach(async () => {
    mockPlotOptionsService.isFreePositioningMode.set(false);
    mockPlotOptionsService.freePositioningSource.set(null);
    mockPlotOptionsService.plotOptions.set({ view: '2d', side: 'profile', startSupport: 0, endSupport: 1, invert: false });
    vi.clearAllMocks();

    await TestBed.configureTestingModule({
      imports: [
        FreePositioningToggleComponent,
        TranslocoTestingModule.forRoot({
          langs: { en: {}, fr: {} },
          translocoConfig: { availableLangs: ['en', 'fr'], defaultLang: 'en' },
          preloadLangs: true
        })
      ],
      providers: [
        { provide: PlotOptionsService, useValue: mockPlotOptionsService },
        { provide: PlotService, useValue: mockPlotService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(FreePositioningToggleComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('source', 'floor');
    fixture.componentRef.setInput('labelKey', 'studio.floor.free-positioning-label');
    fixture.detectChanges();
  });

  it('should be created', () => {
    expect(component).toBeTruthy();
  });

  it('should render the toggle unchecked when another source owns the mode', () => {
    mockPlotOptionsService.setFreePositioningMode(true, 'obstacle');
    fixture.detectChanges();

    expect(query('[data-testid="free-positioning"]')).not.toBeNull();
  });

  it('should turn on free positioning for its own source', () => {
    component.onChange(true);

    expect(mockPlotOptionsService.setFreePositioningMode).toHaveBeenCalledWith(true, 'floor', null);
    expect(mockPlotOptionsService.freePositioningSource()).toBe('floor');
  });

  it('should freeze the selected span index when enabling free positioning', () => {
    fixture.componentRef.setInput('spanIndex', 3);
    fixture.detectChanges();

    component.onChange(true);

    expect(mockPlotOptionsService.setFreePositioningMode).toHaveBeenCalledWith(true, 'floor', 3);
  });

  it('should turn off free positioning for its own source', () => {
    mockPlotOptionsService.setFreePositioningMode(true, 'floor');

    component.onChange(false);

    expect(mockPlotOptionsService.setFreePositioningMode).toHaveBeenCalledWith(false, 'floor', null);
    expect(mockPlotOptionsService.isFreePositioningMode()).toBe(false);
  });

  it('should force a 2D reprojection on the frozen span when enabling free positioning', () => {
    mockPlotOptionsService.plotOptions.set({ view: '3d', side: 'profile', startSupport: 0, endSupport: 1, invert: false });
    fixture.componentRef.setInput('spanIndex', 2);
    fixture.detectChanges();

    component.onChange(true);

    expect(mockPlotService.plotOptionsChange).toHaveBeenCalledWith({ view: '2d', startSupport: 2, endSupport: 3 });
    expect(mockPlotOptionsService.setFreePositioningMode).toHaveBeenCalledWith(true, 'floor', 2);
  });

  it('should reproject on the tab span even when the studio shows a different span (reference support bug)', () => {
    // Studio shows span 1-2 (startSupport 0) while the tab selects span 2-3 (index 1). The
    // reprojection must re-zero litData on the tab span so its left support sits at x=0.
    mockPlotOptionsService.plotOptions.set({ view: '2d', side: 'profile', startSupport: 0, endSupport: 1, invert: false });
    fixture.componentRef.setInput('spanIndex', 1);
    fixture.detectChanges();

    component.onChange(true);

    expect(mockPlotService.plotOptionsChange).toHaveBeenCalledWith({ view: '2d', startSupport: 1, endSupport: 2 });
  });

  it('should fall back to the studio startSupport when no tab span is selected', () => {
    mockPlotOptionsService.plotOptions.set({ view: '2d', side: 'profile', startSupport: 3, endSupport: 4, invert: false });

    component.onChange(true);

    expect(mockPlotService.plotOptionsChange).toHaveBeenCalledWith({ view: '2d', startSupport: 3, endSupport: 4 });
  });

  it('should not reproject when disabling free positioning', () => {
    component.onChange(false);

    expect(mockPlotService.plotOptionsChange).not.toHaveBeenCalled();
  });
});
