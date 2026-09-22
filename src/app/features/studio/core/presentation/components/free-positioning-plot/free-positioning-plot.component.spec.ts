/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { TranslocoTestingModule } from '@jsverse/transloco';
import Plotly, { PlotlyHTMLElement } from 'plotly.js-dist-min';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import { createPlotData } from '@shared/components/studio/section/helpers/createPlotData';
import { LoggerService } from '@core/services/logger/logger.service';
import { PlotOptionsService } from '@services/plot/plot-options.service';
import { PlotSpanService } from '@services/plot/plot-span.service';
import { PlotService } from '@services/plot/plot.service';
import { SideTabsService } from '@services/side-tabs/side-tabs.service';

import { FreePositioningPlotComponent } from './free-positioning-plot.component';
import { CORE_PLOT_IDS } from './free-positioning-plot.constantes';
import { FreePositioningPoint, PlotElement, PlotLayout } from './free-positioning-plot.interfaces';

vi.mock('@shared/components/studio/section/helpers/createPlotData');
vi.mock('plotly.js-dist-min', () => ({
  __esModule: true,
  default: {
    newPlot: vi.fn(),
    react: vi.fn(),
    relayout: vi.fn(),
    purge: vi.fn()
  },
  newPlot: vi.fn(),
  react: vi.fn(),
  relayout: vi.fn(),
  purge: vi.fn()
}));

const mockCreatePlotData = vi.mocked(createPlotData);

const makePlotElement = (): PlotElement & { _fullLayout: PlotLayout } =>
  ({
    clientWidth: 500,
    clientHeight: 300,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    _fullLayout: {
      margin: { l: 0, r: 0, t: 0, b: 0 },
      xaxis: { p2c: (v: number) => v, c2p: (v: number) => v },
      yaxis: { p2c: (v: number) => v, c2p: (v: number) => v }
    }
  }) as unknown as PlotElement & { _fullLayout: PlotLayout };

describe('FreePositioningPlotComponent', () => {
  let component: FreePositioningPlotComponent;
  let fixture: ComponentFixture<FreePositioningPlotComponent>;

  const mockPlotOptionsService = {
    plotOptions: signal({ view: '2d' as const, side: 'profile' as const, startSupport: 0, endSupport: 1 }),
    setFreePositioningMode: vi.fn()
  };

  const mockPlotService = {
    workerReady: signal(false),
    litData: signal<unknown>(null),
    error: signal<unknown>(null),
    diagnostics: signal([]),
    loading: signal(false)
  };

  const mockSpanService = {
    section: signal({
      supports: [
        { uuid: 'sup-1', number: '1' },
        { uuid: 'sup-2', number: '2' }
      ]
    })
  };

  const mockSideTabsService = {
    sideTabs: signal<number | null>(null)
  };

  const mockLogger = {
    warn: vi.fn(),
    error: vi.fn()
  };

  const getByTestId = (id: string): HTMLElement | null => fixture.nativeElement.querySelector(`[data-testid="${id}"]`);

  beforeEach(async () => {
    vi.clearAllMocks();
    mockCreatePlotData.mockReturnValue([]);
    vi.mocked(Plotly.newPlot).mockResolvedValue({ data: [] } as unknown as PlotlyHTMLElement);

    mockPlotService.workerReady.set(false);
    mockPlotService.litData.set(null);
    mockPlotService.error.set(null);
    mockPlotService.loading.set(false);

    await TestBed.configureTestingModule({
      imports: [
        TranslocoTestingModule.forRoot({
          langs: {
            en: {
              'studio.free-positioning.categories.obstacle': 'Obstacles',
              'studio.free-positioning.categories.floor': 'Floor',
              'studio.free-positioning.categories.distance': 'Distance',
              'studio.free-positioning.categories.loads': 'Loads',
              'studio.free-positioning.x-label': 'x:',
              'studio.free-positioning.y-label': 'y:',
              'studio.free-positioning.z-label': 'z:',
              'common.loading': 'Loading'
            }
          },
          translocoConfig: { availableLangs: ['en'], defaultLang: 'en' },
          preloadLangs: true
        }),
        FreePositioningPlotComponent
      ],
      providers: [
        { provide: PlotService, useValue: mockPlotService },
        { provide: PlotOptionsService, useValue: mockPlotOptionsService },
        { provide: PlotSpanService, useValue: mockSpanService },
        { provide: SideTabsService, useValue: mockSideTabsService },
        { provide: LoggerService, useValue: mockLogger }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(FreePositioningPlotComponent);
    component = fixture.componentInstance;
  });

  it('should create component', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  describe('HTML rendering', () => {
    it('should display loading spinner when plotService.loading is true', () => {
      mockPlotService.loading.set(true);
      fixture.detectChanges();
      expect(getByTestId('free-positioning-loading')).not.toBeNull();
    });

    it('should display error message when plotService.error is present', () => {
      mockPlotService.error.set({ message: 'Engine failure' });
      fixture.detectChanges();
      expect(getByTestId('free-positioning-error')).not.toBeNull();
    });

    it('should render category toggle buttons', () => {
      fixture.detectChanges();
      expect(getByTestId('category-toggle-obstacle')).not.toBeNull();
      expect(getByTestId('category-toggle-floor')).not.toBeNull();
      expect(getByTestId('category-toggle-distance')).not.toBeNull();
      expect(getByTestId('category-toggle-loads')).not.toBeNull();
    });

    it('should render profile plot container and omit face plot container when showFace is false', () => {
      fixture.detectChanges();
      expect(getByTestId('plot-container-profile')).not.toBeNull();
      expect(getByTestId('plot-container-face')).toBeNull();
    });

    it('should render face plot container when showFace is true', () => {
      fixture.componentRef.setInput('config', { showFace: true, editableCategory: 'obstacle' });
      fixture.detectChanges();
      expect(getByTestId('plot-container-face')).not.toBeNull();
      expect(getByTestId('mouse-y')).not.toBeNull();
    });
  });

  describe('Category toggling', () => {
    it('should toggle category visibility when clicked', () => {
      fixture.componentRef.setInput('config', {
        showFace: false,
        editableCategory: 'obstacle',
        defaultVisibleCategories: ['obstacle', 'floor']
      });
      fixture.detectChanges();

      expect(component.visibleCategories().has('floor')).toBe(true);

      const floorBtn = getByTestId('category-toggle-floor');
      floorBtn?.click();
      fixture.detectChanges();

      expect(component.visibleCategories().has('floor')).toBe(false);

      floorBtn?.click();
      fixture.detectChanges();
      expect(component.visibleCategories().has('floor')).toBe(true);
    });
  });

  describe('Plot creation & destruction', () => {
    it('should create plot when createPlot is invoked', async () => {
      fixture.detectChanges();
      const mockElem = makePlotElement();
      vi.spyOn(document, 'getElementById').mockReturnValue(mockElem);

      await component['createPlot'](
        { coords: { spans: [], supports: [], insulators: [] } } as unknown as Parameters<typeof createPlotData>[0],
        0,
        'profile',
        []
      );

      expect(Plotly.newPlot).toHaveBeenCalledWith(
        CORE_PLOT_IDS.PROFILE,
        expect.any(Array),
        expect.any(Object),
        expect.any(Object)
      );
    });

    it('should create both profile and face plots when showFace is true and recreatePlots runs', async () => {
      fixture.componentRef.setInput('config', { showFace: true, editableCategory: 'obstacle' });
      fixture.detectChanges();

      const mockElem = makePlotElement();
      vi.spyOn(document, 'getElementById').mockReturnValue(mockElem);

      mockPlotService.litData.set({ coords: { spans: [], supports: [], insulators: [] } });

      component.recreatePlots();
      await component.recreatePlots.flush();

      expect(Plotly.newPlot).toHaveBeenCalledWith(
        CORE_PLOT_IDS.PROFILE,
        expect.any(Array),
        expect.any(Object),
        expect.any(Object)
      );
      expect(Plotly.newPlot).toHaveBeenCalledWith(
        CORE_PLOT_IDS.FACE,
        expect.any(Array),
        expect.any(Object),
        expect.any(Object)
      );
    });

    it('should purge plots and remove listeners on destroy', async () => {
      fixture.detectChanges();
      const mockElem = makePlotElement();
      vi.spyOn(document, 'getElementById').mockReturnValue(mockElem);

      mockPlotService.litData.set({ coords: { spans: [], supports: [], insulators: [] } });
      component.recreatePlots();
      await component.recreatePlots.flush();

      fixture.destroy();
      expect(Plotly.purge).toHaveBeenCalled();
    });
  });

  describe('Interactions (placement & selection)', () => {
    const samplePoint: FreePositioningPoint = {
      id: 'pt-1',
      category: 'obstacle',
      alongSpan: 50,
      lateral: 10,
      altitude: 100,
      editable: true
    };

    it('should emit placement output when clicking in empty space on profile plot', () => {
      const placementSpy = vi.fn();
      component.placement.subscribe(placementSpy);

      fixture.componentRef.setInput('points', [samplePoint]);
      fixture.detectChanges();

      const mockElem = makePlotElement();

      // Click at alongSpan: 120, altitude: 80 (far from samplePoint at 50, 100)
      component['handleClick']({ layerX: 120, layerY: 80 } as unknown as MouseEvent, 'profile', mockElem);

      expect(placementSpy).toHaveBeenCalledWith({
        alongSpan: 120,
        lateral: null,
        altitude: 80,
        category: 'obstacle',
        side: 'profile'
      });
    });

    it('should emit placement output when clicking on face plot', () => {
      const placementSpy = vi.fn();
      component.placement.subscribe(placementSpy);

      fixture.componentRef.setInput('points', [samplePoint]);
      fixture.detectChanges();

      const mockElem = makePlotElement();

      component['handleClick']({ layerX: 25, layerY: 80 } as unknown as MouseEvent, 'face', mockElem);

      expect(placementSpy).toHaveBeenCalledWith({
        alongSpan: 0,
        lateral: 25,
        altitude: 80,
        category: 'obstacle',
        side: 'face'
      });
    });

    it('should emit selection output when clicking near a non-editable existing point', () => {
      const selectionSpy = vi.fn();
      component.selection.subscribe(selectionSpy);

      fixture.componentRef.setInput('points', [{ ...samplePoint, editable: false }]);
      fixture.detectChanges();

      const mockElem = makePlotElement();

      // Click at (52, 101) -> within 15px radius of samplePoint at (50, 100)
      component['handleClick']({ layerX: 52, layerY: 101 } as unknown as MouseEvent, 'profile', mockElem);

      expect(selectionSpy).toHaveBeenCalledWith({
        point: { ...samplePoint, editable: false }
      });
    });

    it('should prioritize placement over selection for the active editable point', () => {
      const placementSpy = vi.fn();
      const selectionSpy = vi.fn();
      component.placement.subscribe(placementSpy);
      component.selection.subscribe(selectionSpy);

      fixture.componentRef.setInput('points', [samplePoint]);
      fixture.detectChanges();

      const mockElem = makePlotElement();

      component['handleClick']({ layerX: 52, layerY: 101 } as unknown as MouseEvent, 'profile', mockElem);

      expect(placementSpy).toHaveBeenCalledWith({
        alongSpan: 52,
        lateral: null,
        altitude: 101,
        category: 'obstacle',
        side: 'profile'
      });
      expect(selectionSpy).not.toHaveBeenCalled();
    });

    it('should update mouse coordinates on mousemove', () => {
      fixture.detectChanges();
      const mockElem = makePlotElement();

      component['handleMouseMove']({ layerX: 45.678, layerY: 89.123 } as unknown as MouseEvent, 'profile', mockElem);

      expect(component.profileMousePosition()).toEqual({
        x: '45.68',
        z: '89.12'
      });
    });

    it('should do nothing when clicking outside plot bounds', () => {
      const placementSpy = vi.fn();
      component.placement.subscribe(placementSpy);

      fixture.detectChanges();
      const mockElem = makePlotElement();

      // Click outside bounds: negative x
      component['handleClick']({ layerX: -10, layerY: 50 } as unknown as MouseEvent, 'profile', mockElem);
      expect(placementSpy).not.toHaveBeenCalled();
    });
  });

  describe('Trace updates (non-regression: #1038 unhandled DOM element error)', () => {
    const samplePoint: FreePositioningPoint = {
      id: 'pt-1',
      category: 'obstacle',
      alongSpan: 50,
      lateral: 10,
      altitude: 100,
      editable: true
    };

    beforeEach(async () => {
      fixture.detectChanges();
      const mockElem = makePlotElement();
      vi.spyOn(document, 'getElementById').mockReturnValue(mockElem);
      mockPlotService.litData.set({ coords: { spans: [], supports: [], insulators: [] } });

      component.recreatePlots();
      await component.recreatePlots.flush();
      vi.mocked(Plotly.react).mockClear();
    });

    it('should call Plotly.react with the live DOM element when the plot container still exists', () => {
      fixture.componentRef.setInput('points', [samplePoint]);
      fixture.detectChanges();
      component.debounceUpdateTraces.flush();

      expect(Plotly.react).toHaveBeenCalledWith(
        expect.objectContaining({ clientWidth: 500 }),
        expect.any(Array),
        expect.any(Object),
        expect.any(Object)
      );
    });

    it('should not call Plotly.react nor throw when the plot container has been removed from the DOM', () => {
      // Simulates the template swapping the chart div for the loading/error state
      vi.spyOn(document, 'getElementById').mockReturnValue(null);

      fixture.componentRef.setInput('points', [samplePoint]);
      fixture.detectChanges();

      expect(() => component.debounceUpdateTraces.flush()).not.toThrow();
      expect(Plotly.react).not.toHaveBeenCalled();
    });
  });
});
