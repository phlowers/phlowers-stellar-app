/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { describe, it, expect } from 'vitest';
import type * as Plotly from 'plotly.js-dist-min';
import { CableModification } from '@shared/domain';
import { createCableModificationAnnotations } from './createCableModificationAnnotations';
import {
  CABLE_MOD_ARROW_X_OFFSET,
  CABLE_MOD_ARROW_Y_OFFSET,
  CABLE_MOD_ICON,
  CABLE_MOD_LABEL_Y_SHIFT,
  getCableModificationLabel
} from './createCableModificationAnnotations.constantes';
import { CreatePlotParams } from './createPlot';

type AnnotationWithData = Partial<Plotly.Annotations> & {
  data?: { type: string; spanUuid: string; cableModificationUuid: string };
  z?: number;
};

const makeModification = (overrides: Partial<CableModification> = {}): CableModification => ({
  uuid: 'mod-1',
  spanUuid: 'span-1',
  supportRef: 'LEFT',
  widthCable: 'lengthening',
  sizeCable: 1,
  distanceSupportRef: 0,
  ...overrides
});

/**
 * Default polyline is a straight horizontal segment from x = 0 to x = 10
 * with a midpoint sample, so horizontal x-abscissa lookups are trivial:
 * x 0 → [0,0,0], x 3 → [3,0,0], x 5 → [5,0,0],
 * x 7 → [7,0,0], x 10 → [10,0,0].
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
  endSupport: 5,
  obstacles: [],
  currentObstacleUuid: null,
  currentObstaclePointIndex: 0,
  distances: [],
  distanceType: null,
  litData: {
    coords: {
      spans: [
        [
          [0, 0, 0],
          [5, 0, 0],
          [10, 0, 0]
        ],
        [
          [100, 200, 300],
          [105, 200, 300],
          [110, 200, 300]
        ]
      ]
    },
    output_parameters: {
      span_length: [10, 10],
      loads_coords: {}
    }
  } as unknown as CreatePlotParams['litData'],
  ...overrides
});

describe('createCableModificationAnnotations', () => {
  describe('empty cases', () => {
    it('should return [] when no modifications are provided', () => {
      const annotations = createCableModificationAnnotations(makePlotParams(), [], new Map());
      expect(annotations).toEqual([]);
    });

    it('should ignore a modification whose span uuid is not in the lookup', () => {
      const annotations = createCableModificationAnnotations(
        makePlotParams(),
        [makeModification({ spanUuid: 'unknown' })],
        new Map([['span-1', 0]])
      );
      expect(annotations).toEqual([]);
    });

    it('should ignore a modification whose span is outside the visible window', () => {
      const annotations = createCableModificationAnnotations(
        makePlotParams({ startSupport: 2, endSupport: 5 }),
        [makeModification({ spanUuid: 'span-1' })],
        new Map([['span-1', 0]])
      );
      expect(annotations).toEqual([]);
    });

    it('should ignore a modification whose span has no polyline', () => {
      const params = makePlotParams({
        litData: {
          coords: { spans: [] },
          output_parameters: { span_length: [], loads_coords: {} }
        } as unknown as CreatePlotParams['litData']
      });
      const annotations = createCableModificationAnnotations(params, [makeModification()], new Map([['span-1', 0]]));
      expect(annotations).toEqual([]);
    });

    it('should ignore a modification whose span polyline is empty', () => {
      const params = makePlotParams({
        litData: {
          coords: { spans: [[]] },
          output_parameters: { span_length: [0], loads_coords: {} }
        } as unknown as CreatePlotParams['litData']
      });
      const annotations = createCableModificationAnnotations(params, [makeModification()], new Map([['span-1', 0]]));
      expect(annotations).toEqual([]);
    });
  });

  describe('x-abscissa anchor (LEFT supportRef)', () => {
    it('should return the first polyline point when distanceSupportRef is 0', () => {
      const [icon] = createCableModificationAnnotations(
        makePlotParams(),
        [makeModification({ supportRef: 'LEFT', distanceSupportRef: 0 })],
        new Map([['span-1', 0]])
      ) as AnnotationWithData[];
      expect(icon.x).toBe(0);
      expect(icon.y).toBe(0);
      expect(icon.z).toBe(0);
    });

    it('should interpolate linearly inside a segment by x-distance', () => {
      const [icon] = createCableModificationAnnotations(
        makePlotParams(),
        [makeModification({ supportRef: 'LEFT', distanceSupportRef: 3 })],
        new Map([['span-1', 0]])
      ) as AnnotationWithData[];
      expect(icon.x).toBeCloseTo(3, 10);
      expect(icon.y).toBeCloseTo(0, 10);
      expect(icon.z).toBeCloseTo(0, 10);
    });

    it('should clamp to the last polyline point when x-distance exceeds span length', () => {
      const [icon] = createCableModificationAnnotations(
        makePlotParams(),
        [makeModification({ supportRef: 'LEFT', distanceSupportRef: 999 })],
        new Map([['span-1', 0]])
      ) as AnnotationWithData[];
      expect(icon.x).toBe(10);
      expect(icon.y).toBe(0);
      expect(icon.z).toBe(0);
    });

    it('should return the only point of a single-point polyline', () => {
      const params = makePlotParams({
        litData: {
          coords: { spans: [[[42, 43, 44]]] },
          output_parameters: { span_length: [0], loads_coords: {} }
        } as unknown as CreatePlotParams['litData']
      });
      const [icon] = createCableModificationAnnotations(
        params,
        [makeModification({ supportRef: 'LEFT', distanceSupportRef: 5 })],
        new Map([['span-1', 0]])
      ) as AnnotationWithData[];
      expect(icon.x).toBe(42);
      expect(icon.y).toBe(43);
      expect(icon.z).toBe(44);
    });
  });

  describe('x-abscissa anchor (RIGHT supportRef)', () => {
    it('should measure x-distance from the end of the polyline', () => {
      const [icon] = createCableModificationAnnotations(
        makePlotParams(),
        [makeModification({ supportRef: 'RIGHT', distanceSupportRef: 3 })],
        new Map([['span-1', 0]])
      ) as AnnotationWithData[];
      // span_length=10, RIGHT, distance=3 → target x = 10-3 = 7 → [7, 0, 0]
      expect(icon.x).toBeCloseTo(7, 10);
      expect(icon.y).toBeCloseTo(0, 10);
    });

    it('should clamp to the first polyline point when x-distance exceeds span length', () => {
      const [icon] = createCableModificationAnnotations(
        makePlotParams(),
        [makeModification({ supportRef: 'RIGHT', distanceSupportRef: 999 })],
        new Map([['span-1', 0]])
      ) as AnnotationWithData[];
      // target x = max(0, 10 - 999) = 0 → first point
      expect(icon.x).toBe(0);
      expect(icon.y).toBe(0);
    });
  });

  describe('view-specific coordinate mapping', () => {
    it('should swap x for 2d face view (use coord[1] as x and coord[2] as y)', () => {
      const params = makePlotParams({
        view: '2d',
        side: 'face',
        litData: {
          coords: { spans: [[[5, 6, 7]]] },
          output_parameters: { span_length: [0], loads_coords: {} }
        } as unknown as CreatePlotParams['litData']
      });
      const [icon] = createCableModificationAnnotations(
        params,
        [makeModification({ supportRef: 'LEFT', distanceSupportRef: 0 })],
        new Map([['span-1', 0]])
      ) as AnnotationWithData[];
      expect(icon.x).toBe(6);
      expect(icon.y).toBe(7);
    });

    it('should use coord[0] as x and coord[2] as y for 2d profile view', () => {
      const params = makePlotParams({
        view: '2d',
        side: 'profile',
        litData: {
          coords: { spans: [[[5, 6, 7]]] },
          output_parameters: { span_length: [0], loads_coords: {} }
        } as unknown as CreatePlotParams['litData']
      });
      const [icon] = createCableModificationAnnotations(
        params,
        [makeModification({ supportRef: 'LEFT', distanceSupportRef: 0 })],
        new Map([['span-1', 0]])
      ) as AnnotationWithData[];
      expect(icon.x).toBe(5);
      expect(icon.y).toBe(7);
    });
  });

  describe('icon annotation (load-like display)', () => {
    it('should use the same arrow style as the load annotation (showarrow, no head, arrowwidth 1)', () => {
      const [icon] = createCableModificationAnnotations(
        makePlotParams(),
        [makeModification()],
        new Map([['span-1', 0]])
      ) as AnnotationWithData[];
      expect(icon.showarrow).toBe(true);
      expect(icon.arrowhead).toBe(0);
      expect(icon.arrowwidth).toBe(1);
      expect(icon.ax).toBe(CABLE_MOD_ARROW_X_OFFSET);
      expect(icon.ay).toBe(CABLE_MOD_ARROW_Y_OFFSET);
      expect(icon.captureevents).toBe(true);
    });

    it('should apply the configured icon glyph', () => {
      const [icon] = createCableModificationAnnotations(
        makePlotParams(),
        [makeModification()],
        new Map([['span-1', 0]])
      ) as AnnotationWithData[];
      expect(icon.text).toBe(CABLE_MOD_ICON);
    });

    it('should attach the click discriminator with span and modification uuids', () => {
      const [icon] = createCableModificationAnnotations(
        makePlotParams(),
        [makeModification({ uuid: 'mod-abc', spanUuid: 'span-1' })],
        new Map([['span-1', 0]])
      ) as AnnotationWithData[];
      expect(icon.data).toEqual({
        type: 'cableModification',
        spanUuid: 'span-1',
        cableModificationUuid: 'mod-abc'
      });
    });
  });

  describe('label annotation', () => {
    it('should emit a label annotation per modification with the right text', () => {
      const lengthening = createCableModificationAnnotations(
        makePlotParams(),
        [makeModification({ widthCable: 'lengthening' })],
        new Map([['span-1', 0]])
      ) as AnnotationWithData[];
      expect(lengthening).toHaveLength(2);
      expect(lengthening[1].text).toBe(getCableModificationLabel('lengthening'));

      const shortening = createCableModificationAnnotations(
        makePlotParams(),
        [makeModification({ widthCable: 'shortening' })],
        new Map([['span-1', 0]])
      ) as AnnotationWithData[];
      expect(shortening[1].text).toBe(getCableModificationLabel('shortening'));
    });

    it('should not capture click events and sit above the icon (yshift > |ay|)', () => {
      const [, label] = createCableModificationAnnotations(
        makePlotParams(),
        [makeModification()],
        new Map([['span-1', 0]])
      ) as AnnotationWithData[];
      expect(label.showarrow).toBe(false);
      expect(label.captureevents).toBe(false);
      expect(label.yshift).toBe(CABLE_MOD_LABEL_Y_SHIFT);
      // |ay| = 90, label yshift = 110 → label sits above the icon.
      expect((label.yshift as number) > Math.abs(CABLE_MOD_ARROW_Y_OFFSET)).toBe(true);
    });

    it('should anchor the label on the same data point as the icon', () => {
      const [icon, label] = createCableModificationAnnotations(
        makePlotParams(),
        [makeModification({ supportRef: 'LEFT', distanceSupportRef: 3 })],
        new Map([['span-1', 0]])
      ) as AnnotationWithData[];
      expect(label.x).toBe(icon.x);
      expect(label.y).toBe(icon.y);
      expect(label.z).toBe(icon.z);
    });
  });

  describe('horizontal abscissa interpolation (matches load placement)', () => {
    it('should interpolate by x-distance from left support on a sagging cable, not by arc length', () => {
      // Sagging cable: x goes 0 → 100 in 3 samples, z dips at mid-span.
      // Arc-length interpolation at distance=50 would land short of x=50 because
      // the curve is longer than the chord. Horizontal interpolation at
      // distanceSupportRef=50 must land exactly on the midpoint sample (x=50).
      const params = makePlotParams({
        litData: {
          coords: {
            spans: [
              [
                [0, 0, 100],
                [50, 0, 90],
                [100, 0, 100]
              ]
            ]
          },
          output_parameters: {
            span_length: [100],
            loads_coords: {}
          }
        } as unknown as CreatePlotParams['litData']
      });
      const [icon] = createCableModificationAnnotations(
        params,
        [makeModification({ supportRef: 'LEFT', distanceSupportRef: 50 })],
        new Map([['span-1', 0]])
      ) as AnnotationWithData[];
      expect(icon.x).toBe(50);
      expect(icon.z).toBe(90); // sag depth at mid-span
    });

    it('should still anchor on the polyline when the line direction is reversed (x decreasing)', () => {
      const params = makePlotParams({
        litData: {
          coords: {
            spans: [
              [
                [100, 0, 0],
                [50, 0, -10],
                [0, 0, 0]
              ]
            ]
          },
          output_parameters: {
            span_length: [100],
            loads_coords: {}
          }
        } as unknown as CreatePlotParams['litData']
      });
      const [icon] = createCableModificationAnnotations(
        params,
        [makeModification({ supportRef: 'LEFT', distanceSupportRef: 50 })],
        new Map([['span-1', 0]])
      ) as AnnotationWithData[];
      // LEFT support is the first polyline point (x=100); distance 50 toward
      // the right support (x=0) → target x = 50, sample z = -10.
      expect(icon.x).toBe(50);
      expect(icon.z).toBe(-10);
    });
  });

  describe('overlap-prevention contract with load annotation', () => {
    it('should sit vertically above the load icon (ay < -50) and stay horizontally aligned (ax = 0)', () => {
      // The load helper uses ax: 0, ay: -50. The cable modification helper
      // keeps ax: 0 (so the icon stays on its anchor point along the cable)
      // and uses a smaller ay so it sits clearly above the load icon when both
      // happen to anchor at the same data point.
      const [icon] = createCableModificationAnnotations(
        makePlotParams(),
        [makeModification()],
        new Map([['span-1', 0]])
      ) as AnnotationWithData[];
      expect(icon.ax).toBe(0);
      expect((icon.ay as number) < -50).toBe(true);
    });
  });
});
