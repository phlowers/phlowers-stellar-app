/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { describe, it, expect } from 'vitest';
import type * as Plotly from 'plotly.js-dist-min';
import { TranslocoService } from '@jsverse/transloco';
import { RrtsCutStrandsData } from '@shared/domain/models/section.model';
import { createCutStrandsAnnotations } from './createCutStrandsAnnotations';
import {
  CUT_STRANDS_COLOR,
  CUT_STRANDS_DASH_GAP,
  CUT_STRANDS_DASH_LENGTH,
  CUT_STRANDS_ICON,
  CUT_STRANDS_LINE_LENGTH,
  CUT_STRANDS_OFFSET_Y
} from './createCutStrandsAnnotations.constantes';
import { CreatePlotParams } from './createPlot';

type Annotation = Partial<Plotly.Annotations> & { z?: number; hovertext?: string; data?: { type: string } };

const makeCutStrands = (overrides: Partial<RrtsCutStrandsData> = {}): RrtsCutStrandsData => ({
  spanUuid: 'span-1',
  supportRef: 'LEFT',
  distanceSupportRef: null,
  cutStrands: [1, 0, 0],
  addMarking: true,
  ...overrides
});

/**
 * Span 0 is a straight horizontal polyline from x = 0 to x = 10, so abscissa lookups are trivial:
 * x 3 → [3, 0, 0], x 7 → [7, 0, 0]. Its supports are vertical lines whose highest points are
 * [0, 1, 20] (left) and [10, 2, 30] (right), well above the cable.
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
  endSupport: 1,
  obstacles: [],
  currentObstacleUuid: null,
  currentObstaclePointIndex: 0,
  distances: [],
  distanceType: null,
  cutStrands: makeCutStrands(),
  spanUuidToIndex: new Map([['span-1', 0]]),
  litData: {
    coords: {
      spans: [
        [
          [0, 0, 0],
          [5, 0, 0],
          [10, 0, 0]
        ]
      ],
      supports: [
        [
          [0, 1, 0],
          [0, 1, 20]
        ],
        [
          [10, 2, 0],
          [10, 2, 30]
        ]
      ]
    },
    output_parameters: { span_length: [10], loads_coords: {} }
  } as unknown as CreatePlotParams['litData'],
  ...overrides
});

const iconOf = (annotations: Annotation[]): Annotation => annotations.at(-1)!;
const dashesOf = (annotations: Annotation[]): Annotation[] => annotations.slice(0, -1);

describe('createCutStrandsAnnotations', () => {
  describe('nothing to draw', () => {
    it('should return [] without saved cut strands', () => {
      expect(createCutStrandsAnnotations(makePlotParams({ cutStrands: null }))).toEqual([]);
      expect(createCutStrandsAnnotations(makePlotParams({ cutStrands: undefined }))).toEqual([]);
    });

    it('should return [] when the saved cut strands do not ask for a marking', () => {
      const params = makePlotParams({ cutStrands: makeCutStrands({ addMarking: false }) });
      expect(createCutStrandsAnnotations(params)).toEqual([]);
    });

    it('should return [] when the saved cut strands are linked to the whole section', () => {
      const params = makePlotParams({ cutStrands: makeCutStrands({ spanUuid: null }) });
      expect(createCutStrandsAnnotations(params)).toEqual([]);
    });

    it('should return [] when the span uuid is not in the lookup', () => {
      const params = makePlotParams({ cutStrands: makeCutStrands({ spanUuid: 'unknown' }) });
      expect(createCutStrandsAnnotations(params)).toEqual([]);
    });

    it('should return [] without a span lookup', () => {
      expect(createCutStrandsAnnotations(makePlotParams({ spanUuidToIndex: undefined }))).toEqual([]);
    });

    it.each([
      { startSupport: 1, endSupport: 3 },
      // endSupport belongs to the next span: the span starting there is not displayed
      { startSupport: 0, endSupport: 0 }
    ])('should return [] when the span is outside the visible window %o', (window) => {
      expect(createCutStrandsAnnotations(makePlotParams(window))).toEqual([]);
    });

    it('should return [] when the span has no polyline and a distance is given', () => {
      const params = makePlotParams({
        cutStrands: makeCutStrands({ distanceSupportRef: 3 }),
        litData: { coords: { spans: [], supports: [] } } as unknown as CreatePlotParams['litData']
      });
      expect(createCutStrandsAnnotations(params)).toEqual([]);
    });

    it('should return [] when the reference support has no coordinates and no distance is given', () => {
      const params = makePlotParams({
        litData: { coords: { spans: [], supports: [] } } as unknown as CreatePlotParams['litData']
      });
      expect(createCutStrandsAnnotations(params)).toEqual([]);
    });
  });

  describe('without distance to the reference support', () => {
    it('should anchor the marking on the highest point of the left support', () => {
      const annotations = createCutStrandsAnnotations(makePlotParams({ view: '3d' })) as Annotation[];

      [...dashesOf(annotations), iconOf(annotations)].forEach((annotation) => {
        expect([annotation.x, annotation.y, annotation.z]).toEqual([0, 1, 20]);
      });
    });

    it('should anchor the marking on the highest point of the right support', () => {
      const params = makePlotParams({ cutStrands: makeCutStrands({ supportRef: 'RIGHT' }) });
      const annotations = createCutStrandsAnnotations(params) as Annotation[];

      expect([iconOf(annotations).x, iconOf(annotations).y, iconOf(annotations).z]).toEqual([10, 2, 30]);
    });

    it('should use the left support when the entry has no reference support', () => {
      const params = makePlotParams({ cutStrands: makeCutStrands({ supportRef: null }) });
      const annotations = createCutStrandsAnnotations(params) as Annotation[];

      expect([iconOf(annotations).x, iconOf(annotations).y, iconOf(annotations).z]).toEqual([0, 1, 20]);
    });
  });

  describe('with a distance to the reference support', () => {
    it('should anchor the marking on the cable, at the distance from the left support', () => {
      const params = makePlotParams({ cutStrands: makeCutStrands({ distanceSupportRef: 3 }) });
      const annotations = createCutStrandsAnnotations(params) as Annotation[];

      expect([iconOf(annotations).x, iconOf(annotations).y, iconOf(annotations).z]).toEqual([3, 0, 0]);
    });

    it('should anchor the marking on the cable, at the distance from the right support', () => {
      const params = makePlotParams({ cutStrands: makeCutStrands({ supportRef: 'RIGHT', distanceSupportRef: 3 }) });
      const annotations = createCutStrandsAnnotations(params) as Annotation[];

      expect([iconOf(annotations).x, iconOf(annotations).y, iconOf(annotations).z]).toEqual([7, 0, 0]);
    });

    it('should anchor a zero distance on the cable end rather than on the support top', () => {
      const params = makePlotParams({ cutStrands: makeCutStrands({ distanceSupportRef: 0 }) });
      const annotations = createCutStrandsAnnotations(params) as Annotation[];

      expect([iconOf(annotations).x, iconOf(annotations).y, iconOf(annotations).z]).toEqual([0, 0, 0]);
    });

    it('should move with the distance', () => {
      const at = (distanceSupportRef: number) =>
        iconOf(
          createCutStrandsAnnotations(
            makePlotParams({ cutStrands: makeCutStrands({ distanceSupportRef }) })
          ) as Annotation[]
        ).x;

      expect(at(2)).toBe(2);
      expect(at(8)).toBe(8);
    });
  });

  // The left support top is [0, 1, 20]
  describe('axes mapping', () => {
    it('should keep x, y and z in 3D', () => {
      const icon = iconOf(createCutStrandsAnnotations(makePlotParams({ view: '3d' })) as Annotation[]);
      expect([icon.x, icon.y, icon.z]).toEqual([0, 1, 20]);
    });

    it('should plot z on the vertical axis in the 2D profile view', () => {
      const icon = iconOf(createCutStrandsAnnotations(makePlotParams({ view: '2d', side: 'profile' })) as Annotation[]);
      expect([icon.x, icon.y]).toEqual([0, 20]);
    });

    it('should plot y on the horizontal axis in the 2D face view', () => {
      const icon = iconOf(createCutStrandsAnnotations(makePlotParams({ view: '2d', side: 'face' })) as Annotation[]);
      expect([icon.x, icon.y]).toEqual([1, 20]);
    });
  });

  describe('icon', () => {
    it('should sit CUT_STRANDS_OFFSET_Y pixels above its anchor, in the marking color', () => {
      const icon = iconOf(createCutStrandsAnnotations(makePlotParams()) as Annotation[]);

      expect(icon.showarrow).toBe(false);
      expect(icon.yshift).toBe(CUT_STRANDS_OFFSET_Y);
      expect(icon.text).toBe(CUT_STRANDS_ICON);
      expect(icon.bordercolor).toBe(CUT_STRANDS_COLOR);
      expect(icon.font?.color).toBe(CUT_STRANDS_COLOR);
    });

    it('should use the primary-600 color', () => {
      expect(CUT_STRANDS_COLOR).toBe('#7D5A9F');
    });

    it('should show "Cut strands" on hover', () => {
      const icon = iconOf(createCutStrandsAnnotations(makePlotParams()) as Annotation[]);

      expect(icon.hovertext).toBe('Cut strands');
      expect(icon.hoverlabel?.bgcolor).toBe(CUT_STRANDS_COLOR);
    });

    it('should carry the payload that opens the RRTS tool when clicked', () => {
      const icon = iconOf(createCutStrandsAnnotations(makePlotParams()) as Annotation[]);

      expect(icon.data).toEqual({ type: 'cutStrands' });
    });

    it('should translate the hover label', () => {
      const translocoService = {
        translate: (key: string) => (key === 'shared.studio.cut-strands-marking' ? 'Brins coupés' : key)
      } as unknown as TranslocoService;
      const icon = iconOf(createCutStrandsAnnotations(makePlotParams({ translocoService })) as Annotation[]);

      expect(icon.hovertext).toBe('Brins coupés');
    });
  });

  describe('dashed line', () => {
    it('should be made of arrow-only annotations in the marking color', () => {
      const dashes = dashesOf(createCutStrandsAnnotations(makePlotParams()) as Annotation[]);

      expect(dashes.length).toBeGreaterThan(1);
      dashes.forEach((dash) => {
        expect(dash.showarrow).toBe(true);
        expect(dash.arrowhead).toBe(0);
        expect(dash.arrowcolor).toBe(CUT_STRANDS_COLOR);
        expect(dash.text).toBe('');
        expect(dash.captureevents).toBe(false);
      });
    });

    it('should start at the anchor point and stop before the icon', () => {
      const dashes = dashesOf(createCutStrandsAnnotations(makePlotParams()) as Annotation[]);

      expect(dashes[0].standoff).toBe(0);
      expect(Math.max(...dashes.map((dash) => -dash.ay!))).toBe(CUT_STRANDS_LINE_LENGTH);
      expect(CUT_STRANDS_LINE_LENGTH).toBeLessThan(CUT_STRANDS_OFFSET_Y);
    });

    it('should draw dashes of the same length, spaced by the same gap', () => {
      const dashes = dashesOf(createCutStrandsAnnotations(makePlotParams()) as Annotation[]);

      dashes.slice(0, -1).forEach((dash, i) => {
        expect(-dash.ay! - dash.standoff!).toBe(CUT_STRANDS_DASH_LENGTH);
        expect(dashes[i + 1].standoff! - -dash.ay!).toBe(CUT_STRANDS_DASH_GAP);
      });
    });

    it('should clip the last dash to the line length', () => {
      const dashes = dashesOf(createCutStrandsAnnotations(makePlotParams()) as Annotation[]);
      const last = dashes.at(-1)!;

      expect(-last.ay! - last.standoff!).toBeGreaterThan(0);
      expect(-last.ay! - last.standoff!).toBeLessThanOrEqual(CUT_STRANDS_DASH_LENGTH);
    });

    it('should not react to clicks', () => {
      dashesOf(createCutStrandsAnnotations(makePlotParams()) as Annotation[]).forEach((dash) => {
        expect(dash.data).toBeUndefined();
      });
    });

    it('should not shift the dashes horizontally', () => {
      dashesOf(createCutStrandsAnnotations(makePlotParams()) as Annotation[]).forEach((dash) => {
        expect(dash.ax).toBe(0);
      });
    });
  });
});
