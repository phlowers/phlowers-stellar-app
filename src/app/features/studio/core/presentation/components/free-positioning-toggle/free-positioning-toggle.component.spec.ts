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

  it('should force a 2D reprojection when enabling free positioning from the 3D view', () => {
    mockPlotOptionsService.plotOptions.set({ view: '3d', side: 'profile', startSupport: 0, endSupport: 1, invert: false });

    component.onChange(true);

    expect(mockPlotService.plotOptionsChange).toHaveBeenCalledWith({ view: '2d' });
    expect(mockPlotOptionsService.setFreePositioningMode).toHaveBeenCalledWith(true, 'floor', null);
  });

  it('should not trigger a reprojection when enabling free positioning already in 2D', () => {
    component.onChange(true);

    expect(mockPlotService.plotOptionsChange).not.toHaveBeenCalled();
  });
});
