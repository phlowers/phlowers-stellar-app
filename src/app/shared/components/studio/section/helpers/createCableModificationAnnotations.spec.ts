/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { describe, it, expect } from 'vitest';
import { CableModification } from '@shared/domain';
import { createCableModificationAnnotations } from './createCableModificationAnnotations';
import {
  CABLE_MOD_AX_OFFSET,
  CABLE_MOD_AY_OFFSET,
  CABLE_MOD_ICON
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
 * Default polyline is a straight horizontal segment of length 10 with a
 * midpoint sample, which makes arc-length math trivial:
 * arc 0 → [0,0,0], arc 3 → [3,0,0], arc 5 → [5,0,0],
 * arc 7 → [7,0,0], arc 10 → [10,0,0].
 */
const makePlotParams = (overrides: Partial<CreatePlotParams> = {}): CreatePlotParams => ({
  documentRef: globalThis.document,
  plotId: 'test-plot',
  data: [],
  invert: false,
  view: '3d',
  camera: null,
  side: 'top',
  spanLoads: [],
  startSupport: 0,
  endSupport: 5,
  obstacles: [],
  currentObstacleUuid: null,
  currentObstaclePointIndex: 0,
  distances: [],
  distanceType: null,
  litData: {
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
    ],
    span_length: [10, 10],
    loads_coords: {}
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
        litData: { spans: [], span_length: [], loads_coords: {} } as unknown as CreatePlotParams['litData']
      });
      const annotations = createCableModificationAnnotations(params, [makeModification()], new Map([['span-1', 0]]));
      expect(annotations).toEqual([]);
    });

    it('should ignore a modification whose span polyline is empty', () => {
      const params = makePlotParams({
        litData: { spans: [[]], span_length: [0], loads_coords: {} } as unknown as CreatePlotParams['litData']
      });
      const annotations = createCableModificationAnnotations(params, [makeModification()], new Map([['span-1', 0]]));
      expect(annotations).toEqual([]);
    });
  });

  describe('arc-length anchor (LEFT supportRef)', () => {
    it('should return the first polyline point when distanceSupportRef is 0', () => {
      const [annotation] = createCableModificationAnnotations(
        makePlotParams(),
        [makeModification({ supportRef: 'LEFT', distanceSupportRef: 0 })],
        new Map([['span-1', 0]])
      ) as AnnotationWithData[];
      expect(annotation.x).toBe(0);
      expect(annotation.y).toBe(0);
      expect(annotation.z).toBe(0);
    });

    it('should interpolate linearly inside a segment', () => {
      const [annotation] = createCableModificationAnnotations(
        makePlotParams(),
        [makeModification({ supportRef: 'LEFT', distanceSupportRef: 3 })],
        new Map([['span-1', 0]])
      ) as AnnotationWithData[];
      expect(annotation.x).toBeCloseTo(3, 10);
      expect(annotation.y).toBeCloseTo(0, 10);
      expect(annotation.z).toBeCloseTo(0, 10);
    });

    it('should clamp to the last polyline point when distance exceeds span length', () => {
      const [annotation] = createCableModificationAnnotations(
        makePlotParams(),
        [makeModification({ supportRef: 'LEFT', distanceSupportRef: 999 })],
        new Map([['span-1', 0]])
      ) as AnnotationWithData[];
      expect(annotation.x).toBe(10);
      expect(annotation.y).toBe(0);
      expect(annotation.z).toBe(0);
    });

    it('should return the only point of a single-point polyline', () => {
      const params = makePlotParams({
        litData: {
          spans: [[[42, 43, 44]]],
          span_length: [0],
          loads_coords: {}
        } as unknown as CreatePlotParams['litData']
      });
      const [annotation] = createCableModificationAnnotations(
        params,
        [makeModification({ supportRef: 'LEFT', distanceSupportRef: 5 })],
        new Map([['span-1', 0]])
      ) as AnnotationWithData[];
      expect(annotation.x).toBe(42);
      expect(annotation.y).toBe(43);
      expect(annotation.z).toBe(44);
    });
  });

  describe('arc-length anchor (RIGHT supportRef)', () => {
    it('should measure distance from the end of the polyline', () => {
      const [annotation] = createCableModificationAnnotations(
        makePlotParams(),
        [makeModification({ supportRef: 'RIGHT', distanceSupportRef: 3 })],
        new Map([['span-1', 0]])
      ) as AnnotationWithData[];
      // span_length=10, RIGHT, distance=3 → arc = 10-3 = 7 → [7, 0, 0]
      expect(annotation.x).toBeCloseTo(7, 10);
      expect(annotation.y).toBeCloseTo(0, 10);
    });

    it('should clamp to the first polyline point when distance exceeds span length', () => {
      const [annotation] = createCableModificationAnnotations(
        makePlotParams(),
        [makeModification({ supportRef: 'RIGHT', distanceSupportRef: 999 })],
        new Map([['span-1', 0]])
      ) as AnnotationWithData[];
      // arc = max(0, 10 - 999) = 0 → first point
      expect(annotation.x).toBe(0);
      expect(annotation.y).toBe(0);
    });
  });

  describe('view-specific coordinate mapping', () => {
    it('should swap x for 2d face view (use coord[1] as x and coord[2] as y)', () => {
      const params = makePlotParams({
        view: '2d',
        side: 'face',
        litData: {
          spans: [[[5, 6, 7]]],
          span_length: [0],
          loads_coords: {}
        } as unknown as CreatePlotParams['litData']
      });
      const [annotation] = createCableModificationAnnotations(
        params,
        [makeModification({ supportRef: 'LEFT', distanceSupportRef: 0 })],
        new Map([['span-1', 0]])
      ) as AnnotationWithData[];
      expect(annotation.x).toBe(6);
      expect(annotation.y).toBe(7);
    });

    it('should use coord[0] as x and coord[2] as y for 2d top view', () => {
      const params = makePlotParams({
        view: '2d',
        side: 'top',
        litData: {
          spans: [[[5, 6, 7]]],
          span_length: [0],
          loads_coords: {}
        } as unknown as CreatePlotParams['litData']
      });
      const [annotation] = createCableModificationAnnotations(
        params,
        [makeModification({ supportRef: 'LEFT', distanceSupportRef: 0 })],
        new Map([['span-1', 0]])
      ) as AnnotationWithData[];
      expect(annotation.x).toBe(5);
      expect(annotation.y).toBe(7);
    });
  });

  describe('annotation payload', () => {
    it('should attach the click discriminator with span and modification uuids', () => {
      const [annotation] = createCableModificationAnnotations(
        makePlotParams(),
        [makeModification({ uuid: 'mod-abc', spanUuid: 'span-1' })],
        new Map([['span-1', 0]])
      ) as AnnotationWithData[];
      expect(annotation.data).toEqual({
        type: 'cableModification',
        spanUuid: 'span-1',
        cableModificationUuid: 'mod-abc'
      });
    });

    it('should apply the configured icon and pixel offsets', () => {
      const [annotation] = createCableModificationAnnotations(
        makePlotParams(),
        [makeModification()],
        new Map([['span-1', 0]])
      ) as AnnotationWithData[];
      expect(annotation.text).toBe(CABLE_MOD_ICON);
      expect(annotation.ax).toBe(CABLE_MOD_AX_OFFSET);
      expect(annotation.ay).toBe(CABLE_MOD_AY_OFFSET);
      expect(annotation.captureevents).toBe(true);
    });
  });

  describe('overlap-prevention contract with load annotation', () => {
    it('should sit vertically above the load icon (ay < -50) and stay horizontally aligned (ax = 0)', () => {
      // The load helper uses ax: 0, ay: -50. The cable modification helper
      // keeps ax: 0 (so the icon stays on its anchor point along the cable)
      // and uses a smaller ay so it sits clearly above the load icon when both
      // happen to anchor at the same data point.
      const [annotation] = createCableModificationAnnotations(
        makePlotParams(),
        [makeModification()],
        new Map([['span-1', 0]])
      ) as AnnotationWithData[];
      expect(annotation.ax).toBe(0);
      expect((annotation.ay as number) < -50).toBe(true);
    });
  });
});
