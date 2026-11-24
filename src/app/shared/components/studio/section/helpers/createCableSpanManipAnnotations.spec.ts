/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { describe, it, expect } from 'vitest';
import type * as Plotly from 'plotly.js-dist-min';
import { PlotlyDrawings } from '@shared/constants/plotly-drawings.constantes';
import { Support } from '@shared/domain/models/support.model';
import { createCableSpanManipAnnotations, createCableSpanManipShapes } from './createCableSpanManipAnnotations';
import { getDashedIconLineLength } from './dashedIconLine.helpers';
import { CreatePlotParams } from './createPlot';

type Annotation = Partial<Plotly.Annotations> & { z?: number; data?: { type: string; spanUuid: string } };

/**
 * Three spans (supports 0 to 3). The engine drew two manipulations, listed in span order: one in span 0 whose crane
 * hook (the highest point of its virtual support) is [4, 2, 35], one in span 2 whose hook is [24, -1, 40].
 */
const makePlotParams = (overrides: Partial<CreatePlotParams> = {}): CreatePlotParams => ({
  documentRef: globalThis.document,
  plotId: 'test-plot',
  data: [],
  invert: false,
  view: '3d',
  camera: null,
  side: 'profile',
  spanLoads: [],
  startSupport: 0,
  endSupport: 3,
  obstacles: [],
  currentObstacleUuid: null,
  currentObstaclePointIndex: 0,
  distances: [],
  distanceType: null,
  supports: ['span-0', 'span-1', 'span-2', 'support-3'].map((uuid) => ({ uuid }) as Support),
  litData: {
    coords: {
      spans: [],
      supports: [],
      virtual_supports: [
        [
          [4, 2, 0],
          [4, 2, 35],
          [4, 2, 35]
        ],
        [
          [24, -1, 0],
          [24, -1, 40],
          [24, -1, 40]
        ]
      ],
      virtual_insulators: [
        [
          [4, 2, 35],
          [5, 0, 30]
        ],
        [
          [24, -1, 40],
          [25, 0, 30]
        ]
      ],
      virtual_supports_span_indices: [0, 2]
    },
    output_parameters: { span_length: [10, 10, 10], loads_coords: {} }
  } as unknown as CreatePlotParams['litData'],
  ...overrides
});

const withCoords = (coords: Record<string, unknown>): Partial<CreatePlotParams> => ({
  litData: { ...makePlotParams().litData, coords } as unknown as CreatePlotParams['litData']
});

const iconsOf = (annotations: Annotation[]): Annotation[] => annotations.filter((annotation) => annotation.data);
const dashesOf = (annotations: Annotation[]): Annotation[] => annotations.filter((annotation) => !annotation.data);

describe('createCableSpanManipAnnotations', () => {
  describe('nothing to draw', () => {
    it.each([
      ['no span manipulation was calculated', withCoords({ spans: [], supports: [] })],
      ['the span indices are null', withCoords({ spans: [], supports: [], virtual_supports_span_indices: null })],
      ['the virtual support has no coordinates', withCoords({ virtual_supports_span_indices: [0] })],
      ['the span has no support', { supports: undefined }]
    ])('should return [] when %s', (_, overrides) => {
      expect(createCableSpanManipAnnotations(makePlotParams(overrides))).toEqual([]);
      expect(createCableSpanManipShapes(makePlotParams({ view: '2d', ...overrides }))).toEqual([]);
    });
  });

  describe('visible spans', () => {
    const spanUuidsOf = (overrides: Partial<CreatePlotParams>) =>
      iconsOf(createCableSpanManipAnnotations(makePlotParams(overrides)) as Annotation[]).map(
        (icon) => icon.data?.spanUuid
      );

    it('should draw one icon per manipulation, linked to its span', () => {
      expect(spanUuidsOf({})).toEqual(['span-0', 'span-2']);
    });

    it.each([
      [{ startSupport: 1, endSupport: 3 }, ['span-2']],
      // endSupport belongs to the next span: the span starting there is not displayed
      [{ startSupport: 0, endSupport: 2 }, ['span-0']],
      [{ startSupport: 1, endSupport: 2 }, []]
    ])('should only draw the manipulations of the visible spans %o', (window, expected) => {
      expect(spanUuidsOf(window)).toEqual(expected);
    });
  });

  describe('axes mapping', () => {
    it('should keep x, y and z of the fixed point in 3D', () => {
      const [icon] = iconsOf(createCableSpanManipAnnotations(makePlotParams()) as Annotation[]);
      expect([icon.x, icon.y, icon.z]).toEqual([4, 2, 35]);
    });

    it('should plot z on the vertical axis in the 2D profile view', () => {
      const [icon] = createCableSpanManipAnnotations(makePlotParams({ view: '2d', side: 'profile' })) as Annotation[];
      expect([icon.x, icon.y]).toEqual([4, 35]);
    });

    it('should plot y on the horizontal axis in the 2D face view', () => {
      const [icon] = createCableSpanManipAnnotations(makePlotParams({ view: '2d', side: 'face' })) as Annotation[];
      expect([icon.x, icon.y]).toEqual([2, 35]);
    });
  });

  describe('icon', () => {
    it('should sit offsetY pixels straight above the fixed point, in the manipulation color', () => {
      const [icon] = iconsOf(createCableSpanManipAnnotations(makePlotParams()) as Annotation[]);

      expect(icon.showarrow).toBe(false);
      expect(icon.yshift).toBe(PlotlyDrawings.cableSpanManip.offsetY);
      expect(icon.text).toBe(PlotlyDrawings.cableSpanManip.icon);
      expect(icon.bordercolor).toBe(PlotlyDrawings.cableSpanManip.unselected.color);
      expect(icon.font?.color).toBe(PlotlyDrawings.cableSpanManip.unselected.color);
      expect(icon.captureevents).toBe(true);
    });

    it('should carry the payload that opens the span manipulation tab when clicked', () => {
      const [icon] = iconsOf(createCableSpanManipAnnotations(makePlotParams()) as Annotation[]);

      expect(icon.data).toEqual({ type: 'cableSpanManip', spanUuid: 'span-0' });
    });
  });

  describe('3D dashed line', () => {
    it('should be made of arrow-only annotations in the manipulation color, from the fixed point', () => {
      const params = makePlotParams({ startSupport: 0, endSupport: 1 });
      const dashes = dashesOf(createCableSpanManipAnnotations(params) as Annotation[]);

      expect(dashes.length).toBeGreaterThan(1);
      expect(dashes[0].standoff).toBe(0);
      dashes.forEach((dash) => {
        expect([dash.x, dash.y, dash.z]).toEqual([4, 2, 35]);
        expect(dash.showarrow).toBe(true);
        expect(dash.arrowcolor).toBe(PlotlyDrawings.cableSpanManip.unselected.color);
        expect(dash.captureevents).toBe(false);
      });
    });

    it('should stop before the icon', () => {
      const params = makePlotParams({ startSupport: 0, endSupport: 1 });
      const dashes = dashesOf(createCableSpanManipAnnotations(params) as Annotation[]);

      const lineLength = getDashedIconLineLength(PlotlyDrawings.cableSpanManip, '3d');
      const top = Math.max(...dashes.map((dash) => -dash.ay!));

      expect(top).toBeLessThanOrEqual(lineLength);
      expect(lineLength - top).toBeLessThanOrEqual(PlotlyDrawings.cableSpanManip.dashGap);
    });

    it('should not be made of shapes, which do not exist in 3D', () => {
      expect(createCableSpanManipShapes(makePlotParams({ view: '3d' }))).toEqual([]);
    });
  });

  describe('2D dashed line', () => {
    const params2d = (overrides: Partial<CreatePlotParams> = {}) => makePlotParams({ view: '2d', ...overrides });

    it('should leave the icons as the only annotations', () => {
      const annotations = createCableSpanManipAnnotations(params2d()) as Annotation[];

      expect(annotations).toHaveLength(2);
      annotations.forEach((annotation) => expect(annotation.text).toBe(PlotlyDrawings.cableSpanManip.icon));
    });

    it('should be one dashed shape per manipulation, from its fixed point up to its icon', () => {
      const shapes = createCableSpanManipShapes(params2d());

      expect(shapes).toHaveLength(2);
      expect(shapes.map((shape) => [shape.xanchor, shape.yanchor])).toEqual([
        [4, 35],
        [24, 40]
      ]);
      expect(shapes[0]).toMatchObject({
        type: 'line',
        xsizemode: 'pixel',
        ysizemode: 'pixel',
        x0: 0,
        x1: 0,
        y0: 0,
        y1: getDashedIconLineLength(PlotlyDrawings.cableSpanManip, '2d'),
        line: {
          color: PlotlyDrawings.cableSpanManip.unselected.color,
          width: PlotlyDrawings.cableSpanManip.lineWidth['2d'],
          dash: `${PlotlyDrawings.cableSpanManip.dashLength}px,${PlotlyDrawings.cableSpanManip.dashGap}px`
        }
      });
    });

    it('should not be drawn for the spans that are not displayed', () => {
      expect(createCableSpanManipShapes(params2d({ startSupport: 1, endSupport: 2 }))).toEqual([]);
    });
  });
});
