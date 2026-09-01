/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { FloorComponent } from './floor.component';
import { PlotOptionsService } from '@services/plot/plot-options.service';
import { FloorFormService } from '@services/floor-form/floor-form.service';

describe('FloorComponent', () => {
  let component: FloorComponent;
  let fixture: ComponentFixture<FloorComponent>;
  let hasEditablePoints: ReturnType<typeof signal<boolean>>;

  const mockPlotOptionsService = {
    isFreePositioningMode: signal(false),
    freePositioningSource: signal<'obstacle' | 'floor' | null>(null),
    setFreePositioningMode: vi.fn((enabled: boolean, source: 'obstacle' | 'floor') => {
      mockPlotOptionsService.isFreePositioningMode.set(enabled);
      mockPlotOptionsService.freePositioningSource.set(enabled ? source : null);
    })
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    hasEditablePoints = signal(true);
    mockPlotOptionsService.isFreePositioningMode.set(false);
    mockPlotOptionsService.freePositioningSource.set(null);

    await TestBed.configureTestingModule({
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
        { provide: FloorFormService, useValue: { hasEditablePoints } }
      ]
    })
      .overrideComponent(FloorComponent, { set: { template: '<div></div>' } })
      .compileComponents();

    fixture = TestBed.createComponent(FloorComponent);
    component = fixture.componentInstance;
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
