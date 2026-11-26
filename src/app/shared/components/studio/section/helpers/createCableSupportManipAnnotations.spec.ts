/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { describe, it, expect } from 'vitest';
import type * as Plotly from 'plotly.js-dist-min';
import { CableSupportManipulation } from '@shared/domain';
import { PlotlyDrawings } from '@shared/constants/plotly-drawings.constantes';
import { createCableSupportManipAnnotations } from './createCableSupportManipAnnotations';
import { CableSupportManipAnnotationData } from './createCableSupportManipAnnotations.interfaces';
import { CreatePlotParams } from './createPlot';

type AnnotationWithData = Partial<Plotly.Annotations> & { data?: CableSupportManipAnnotationData; z?: number };

const makeManip = (overrides: Partial<CableSupportManipulation> = {}): CableSupportManipulation => ({
  uuid: 'manip-1',
  supportUuid: 'support-1',
  chargeUuid: 'charge-1',
  manip1: {
    type: 'rope',
    vertDisplacement: null,
    anchoring: null,
    lateralDistance: null,
    ropeLength: 2,
    shiftingClampLength: null
  },
  manip2: null,
  ...overrides
});

// Two supports, the highest point of each is not its first one
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
  litData: {
    coords: {
      supports: [
        [
          [0, 1, 0],
          [0, 2, 20],
          [0, 3, 10]
        ],
        [
          [100, 4, 0],
          [100, 5, 30],
          [100, 6, 15]
        ]
      ]
    }
  } as unknown as CreatePlotParams['litData'],
  ...overrides
});

const lookup = new Map([
  ['support-1', 0],
  ['support-2', 1]
]);

describe('createCableSupportManipAnnotations', () => {
  describe('empty cases', () => {
    it('should return [] when no manipulation is provided', () => {
      expect(createCableSupportManipAnnotations(makePlotParams(), [], lookup)).toEqual([]);
    });

    it('should ignore a manipulation whose support uuid is not in the lookup', () => {
      const annotations = createCableSupportManipAnnotations(
        makePlotParams(),
        [makeManip({ supportUuid: 'unknown' })],
        lookup
      );
      expect(annotations).toEqual([]);
    });

    it('should ignore a manipulation whose support is before the visible window', () => {
      const annotations = createCableSupportManipAnnotations(
        makePlotParams({ startSupport: 1, endSupport: 2 }),
        [makeManip()],
        lookup
      );
      expect(annotations).toEqual([]);
    });

    it('should ignore a manipulation whose support is after the visible window', () => {
      const annotations = createCableSupportManipAnnotations(
        makePlotParams({ startSupport: 0, endSupport: 0 }),
        [makeManip({ supportUuid: 'support-2' })],
        lookup
      );
      expect(annotations).toEqual([]);
    });

    it('should draw the manipulation of the last visible support, the end of the window included', () => {
      const annotations = createCableSupportManipAnnotations(
        makePlotParams({ startSupport: 0, endSupport: 1 }),
        [makeManip({ supportUuid: 'support-2' })],
        lookup
      );
      expect(annotations).toHaveLength(1);
    });

    it('should ignore a manipulation whose support has no coordinates', () => {
      const params = makePlotParams({
        litData: { coords: { supports: [] } } as unknown as CreatePlotParams['litData']
      });
      expect(createCableSupportManipAnnotations(params, [makeManip()], lookup)).toEqual([]);
    });

    it('should ignore a manipulation whose support polyline is empty', () => {
      const params = makePlotParams({
        litData: { coords: { supports: [[]] } } as unknown as CreatePlotParams['litData']
      });
      expect(createCableSupportManipAnnotations(params, [makeManip()], lookup)).toEqual([]);
    });
  });

  describe('anchor', () => {
    it('should anchor the arrow on the highest point of the support', () => {
      const [icon] = createCableSupportManipAnnotations(
        makePlotParams(),
        [makeManip()],
        lookup
      ) as AnnotationWithData[];
      expect(icon.x).toBe(0);
      expect(icon.y).toBe(2);
      expect(icon.z).toBe(20);
    });

    it('should anchor each manipulation on its own support', () => {
      const annotations = createCableSupportManipAnnotations(
        makePlotParams(),
        [makeManip(), makeManip({ uuid: 'manip-2', supportUuid: 'support-2' })],
        lookup
      ) as AnnotationWithData[];
      expect(annotations.map((a) => a.z)).toEqual([20, 30]);
    });

    it('should map the anchor to x / z in 2d profile view', () => {
      const [icon] = createCableSupportManipAnnotations(
        makePlotParams({ view: '2d', side: 'profile' }),
        [makeManip({ supportUuid: 'support-2' })],
        lookup
      ) as AnnotationWithData[];
      expect(icon.x).toBe(100);
      expect(icon.y).toBe(30);
    });

    it('should map the anchor to y / z in 2d face view', () => {
      const [icon] = createCableSupportManipAnnotations(
        makePlotParams({ view: '2d', side: 'face' }),
        [makeManip({ supportUuid: 'support-2' })],
        lookup
      ) as AnnotationWithData[];
      expect(icon.x).toBe(5);
      expect(icon.y).toBe(30);
    });
  });

  describe('look and click data', () => {
    it('should draw the icon of PlotlyDrawings joined to the support by an arrow', () => {
      const [icon] = createCableSupportManipAnnotations(
        makePlotParams(),
        [makeManip()],
        lookup
      ) as AnnotationWithData[];
      expect(icon.text).toBe(PlotlyDrawings.cableSupportManip.icon);
      expect(icon.showarrow).toBe(true);
      expect(icon.ay).toBe(PlotlyDrawings.cableSupportManip.arrowYOffset);
      expect(icon.bordercolor).toBe(PlotlyDrawings.cableSupportManip.unselected.color);
      expect(icon.captureevents).toBe(true);
    });

    it.each(['2d', '3d'] as const)('should use the %s sizes of PlotlyDrawings', (view) => {
      const [icon] = createCableSupportManipAnnotations(makePlotParams({ view }), [makeManip()], lookup);
      expect(icon.font?.size).toBe(PlotlyDrawings.cableSupportManip.iconSize[view]);
      expect(icon.borderpad).toBe(PlotlyDrawings.cableSupportManip.borderPad[view]);
      expect(icon.arrowwidth).toBe(PlotlyDrawings.cableSupportManip.arrowWidth[view]);
    });

    it('should attach the support and manipulation uuids for the click handler', () => {
      const [icon] = createCableSupportManipAnnotations(
        makePlotParams(),
        [makeManip()],
        lookup
      ) as AnnotationWithData[];
      expect(icon.data).toEqual({
        type: 'cableSupportManip',
        supportUuid: 'support-1',
        cableSupportManipUuid: 'manip-1'
      });
    });
  });
});
