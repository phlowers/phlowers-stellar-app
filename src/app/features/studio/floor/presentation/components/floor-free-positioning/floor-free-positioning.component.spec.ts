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
import Plotly from 'plotly.js-dist-min';
import { FloorFreePositioningComponent } from './floor-free-positioning.component';
import { PlotService } from '@services/plot/plot.service';
import { PlotSpanService } from '@services/plot/plot-span.service';
import { PlotOptionsService } from '@services/plot/plot-options.service';
import { FloorFormService } from '@services/floor-form/floor-form.service';
import { SideTabsService } from '@services/side-tabs/side-tabs.service';
import { LoggerService } from '@core/services/logger/logger.service';
import { createPlotData } from '@shared/components/studio/section/helpers/createPlotData';
import { FloorPointFormGroup } from '@shared/domain/floor/floor-form.interfaces';
import { FLOOR_FREE_POSITIONING_PLOT_ID } from './floor-free-positioning.component.constantes';
import { PlotElement, PlotLayout } from './floor-free-positioning.component.interfaces';

vi.mock('@shared/components/studio/section/helpers/createPlotData');
vi.mock('plotly.js-dist-min', () => ({
  __esModule: true,
  default: {
    newPlot: vi.fn().mockResolvedValue({ data: [] } as unknown as Plotly.PlotlyHTMLElement),
    relayout: vi.fn(),
    purge: vi.fn()
  },
  newPlot: vi.fn().mockResolvedValue({ data: [] } as unknown as Plotly.PlotlyHTMLElement),
  relayout: vi.fn(),
  purge: vi.fn()
}));

const mockCreatePlotData = vi.mocked(createPlotData);

/** Identity axes: 1 pixel = 1 unit, so pixel maths in the tests reads as plain coordinates. */
// `_fullLayout` is required here — tests override its axes — while it stays optional on `PlotElement`.
const makePlotElement = (): PlotElement & { _fullLayout: PlotLayout } =>
  ({
    clientWidth: 500,
    clientHeight: 300,
    _fullLayout: {
      margin: { l: 0, r: 0, t: 0, b: 0 },
      xaxis: { p2c: (v: number) => v, c2p: (v: number) => v },
      yaxis: { p2c: (v: number) => v, c2p: (v: number) => v }
    }
  }) as unknown as PlotElement & { _fullLayout: PlotLayout };

const clickAt = (x: number, y: number) => ({ layerX: x, layerY: y }) as unknown as MouseEvent;

describe('FloorFreePositioningComponent', () => {
  let component: FloorFreePositioningComponent;
  let fixture: ComponentFixture<FloorFreePositioningComponent>;
  let fb: FormBuilder;
  let points: FormArray<FloorPointFormGroup>;
  let activePointIndex: ReturnType<typeof signal<number | null>>;

  const mockFloorFormService = {
    points: null as unknown as FormArray<FloorPointFormGroup>,
    activePointIndex: null as unknown as ReturnType<typeof signal<number | null>>,
    pointsView: vi.fn(),
    setActivePoint: vi.fn(),
    setFreePointPosition: vi.fn()
  };

  const mockPlotOptionsService = {
    plotOptions: signal({ view: '2d' as const, side: 'profile' as const, startSupport: 0, endSupport: 1 }),
    setFreePositioningMode: vi.fn()
  };

  /** Rebuilds pointsView from the current form array; middle points are the removable (free) ones. */
  const refreshPointsView = () =>
    mockFloorFormService.pointsView.mockReturnValue(
      points.controls.map((group, index) => ({
        group,
        meta: { removable: index > 0 && index < points.length - 1 }
      }))
    );

  beforeEach(async () => {
    vi.clearAllMocks();
    mockCreatePlotData.mockReturnValue([]);

    fb = new FormBuilder();
    points = fb.array([
      fb.group({ altitude: 10 as number | null, distanceToRefSupport: 0 as number | null }),
      fb.group({ altitude: 20 as number | null, distanceToRefSupport: 50 as number | null }),
      fb.group({ altitude: 12 as number | null, distanceToRefSupport: 100 as number | null })
    ]) as unknown as FormArray<FloorPointFormGroup>;
    activePointIndex = signal<number | null>(1);

    mockFloorFormService.points = points;
    mockFloorFormService.activePointIndex = activePointIndex;
    refreshPointsView();

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
        {
          provide: PlotService,
          useValue: {
            workerReady: signal(false),
            litData: signal(null),
            error: signal(null),
            diagnostics: signal([]),
            loading: signal(false)
          }
        },
        { provide: PlotSpanService, useValue: { section: signal({ supports: [] }) } },
        { provide: PlotOptionsService, useValue: mockPlotOptionsService },
        { provide: FloorFormService, useValue: mockFloorFormService },
        { provide: SideTabsService, useValue: { sideTabs: signal<number | null>(null) } },
        { provide: LoggerService, useValue: { warn: vi.fn(), error: vi.fn() } }
      ]
    })
      .overrideComponent(FloorFreePositioningComponent, { set: { template: '<div></div>' } })
      .compileComponents();

    fixture = TestBed.createComponent(FloorFreePositioningComponent);
    component = fixture.componentInstance;
  });

  describe('handleClick — placing the active free point', () => {
    it('should place the active free point at the clicked distance and altitude', () => {
      // Click far from every existing point (0/10, 50/20, 100/12) so nothing gets selected instead.
      component['handleClick'](clickAt(200, 150), makePlotElement());

      expect(mockFloorFormService.setFreePointPosition).toHaveBeenCalledWith(1, {
        distanceToRefSupport: 200,
        altitude: 150
      });
    });

    it('should round the placed coordinates to two decimals', () => {
      const plotElement = makePlotElement();
      plotElement._fullLayout.xaxis.p2c = () => 12.3456;
      plotElement._fullLayout.yaxis.p2c = () => 7.891;

      component['handleClick'](clickAt(200, 150), plotElement);

      expect(mockFloorFormService.setFreePointPosition).toHaveBeenCalledWith(1, {
        distanceToRefSupport: 12.35,
        altitude: 7.89
      });
    });

    it('should ignore a click outside the plotting area', () => {
      component['handleClick'](clickAt(600, 150), makePlotElement());
      component['handleClick'](clickAt(200, -5), makePlotElement());

      expect(mockFloorFormService.setFreePointPosition).not.toHaveBeenCalled();
    });

    it('should ignore a click when no point is active', () => {
      activePointIndex.set(null);

      component['handleClick'](clickAt(200, 150), makePlotElement());

      expect(mockFloorFormService.setFreePointPosition).not.toHaveBeenCalled();
    });

    it('should refuse to move the reference or closing point', () => {
      activePointIndex.set(0);
      component['handleClick'](clickAt(200, 150), makePlotElement());

      activePointIndex.set(2);
      component['handleClick'](clickAt(200, 150), makePlotElement());

      expect(mockFloorFormService.setFreePointPosition).not.toHaveBeenCalled();
    });

    it('should do nothing when the plot has no layout yet', () => {
      component['handleClick'](clickAt(200, 150), null);

      expect(mockFloorFormService.setFreePointPosition).not.toHaveBeenCalled();
      expect(mockFloorFormService.setActivePoint).not.toHaveBeenCalled();
    });
  });

  describe('handleClick — selecting an existing point', () => {
    it('should select an existing point instead of moving the active one when clicked on it', () => {
      // Point 2 sits at (100, 12).
      component['handleClick'](clickAt(100, 12), makePlotElement());

      expect(mockFloorFormService.setActivePoint).toHaveBeenCalledWith(2);
      expect(mockFloorFormService.setFreePointPosition).not.toHaveBeenCalled();
    });

    it('should select a point clicked just inside the selection radius', () => {
      component['handleClick'](clickAt(100 + 8, 12 + 8), makePlotElement());

      expect(mockFloorFormService.setActivePoint).toHaveBeenCalledWith(2);
    });

    it('should place the point instead when the click falls outside the selection radius', () => {
      component['handleClick'](clickAt(100 + 20, 12 + 20), makePlotElement());

      expect(mockFloorFormService.setActivePoint).not.toHaveBeenCalled();
      expect(mockFloorFormService.setFreePointPosition).toHaveBeenCalled();
    });

    it('should select the nearest point when two are within the radius', () => {
      points.at(0).setValue({ altitude: 12, distanceToRefSupport: 96 });
      refreshPointsView();

      // (99, 12) is 1px from point 0 (96,12 → 3px) and 1px from point 2 (100,12).
      component['handleClick'](clickAt(100, 12), makePlotElement());

      expect(mockFloorFormService.setActivePoint).toHaveBeenCalledWith(2);
    });

    it('should ignore points that are not filled in yet', () => {
      points.at(1).setValue({ altitude: null, distanceToRefSupport: null });
      refreshPointsView();
      activePointIndex.set(1);

      component['handleClick'](clickAt(0, 0), makePlotElement());

      // (0,0) would match the empty point if nulls were read as zero; point 0 is at (0,10), 10px away.
      expect(mockFloorFormService.setActivePoint).toHaveBeenCalledWith(0);
    });
  });

  describe('getAnnotations', () => {
    it('should render one marker per filled point', () => {
      expect(component['getAnnotations']()).toHaveLength(3);
      expect(component['getAnnotations']()[0]).toMatchObject({ x: 0, y: 10, text: '+', showarrow: false });
    });

    it('should paint the active point red and the others black', () => {
      activePointIndex.set(1);

      expect(component['getAnnotations']().map((a) => a.font?.color)).toEqual(['black', 'red', 'black']);
    });

    it('should skip points that are not filled in yet', () => {
      points.at(1).setValue({ altitude: null, distanceToRefSupport: null });
      refreshPointsView();

      expect(component['getAnnotations']()).toHaveLength(2);
    });
  });

  describe('mouse position readout', () => {
    it('should expose the hovered coordinates with two decimals', () => {
      component['handleMouseMove'](clickAt(42.567, 8.123), makePlotElement());

      expect(component.mousePosition()).toEqual({ x: '42.57', z: '8.12' });
    });

    it('should stay null while the plot has no layout', () => {
      component['handleMouseMove'](clickAt(42, 8), null);

      expect(component.mousePosition()).toBeNull();
    });
  });

  describe('plot event listeners', () => {
    it('should not stack click handlers when the plot is recreated', async () => {
      const plotElement = document.createElement('div');
      plotElement.id = FLOOR_FREE_POSITIONING_PLOT_ID;
      document.body.appendChild(plotElement);
      mockCreatePlotData.mockReturnValue([{}] as unknown as ReturnType<typeof createPlotData>);
      const litData = {} as Parameters<FloorFreePositioningComponent['createPlot']>[0];

      await component.createPlot(litData, 0, []);
      component['destroyPlot']();
      await component.createPlot(litData, 0, []);

      const handleClick = vi.spyOn(component as never, 'handleClick');
      plotElement.dispatchEvent(new MouseEvent('click'));

      expect(handleClick).toHaveBeenCalledTimes(1);
      plotElement.remove();
    });
  });

  describe('ngOnDestroy', () => {
    it('should leave floor free positioning mode and purge the plot', () => {
      component.plot.set({} as Plotly.PlotlyHTMLElement);

      component.ngOnDestroy();

      expect(mockPlotOptionsService.setFreePositioningMode).toHaveBeenCalledWith(false, 'floor');
      expect(Plotly.purge).toHaveBeenCalled();
      expect(component.plot()).toBeNull();
    });
  });
});
