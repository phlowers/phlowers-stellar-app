/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { describe, expect, it } from 'vitest';
import {
  buildFreePositioningTraces,
  filterPointsForSide,
  findNearestPointAtPixel
} from './free-positioning-traces.helpers';
import { FreePositioningPoint, PlotLayout } from './free-positioning.interfaces';
import { PlotlyDrawings } from '@shared/constants/plotly-drawings.constantes';

describe('free-positioning-traces helpers', () => {
  const { obstacle, loads } = PlotlyDrawings.freePositioning.category;

  const samplePoints: FreePositioningPoint[] = [
    {
      id: 'obs-1',
      category: 'obstacle',
      alongSpan: 50,
      lateral: 10,
      altitude: 120,
      editable: true,
      name: 'Tree'
    },
    {
      id: 'obs-2',
      category: 'obstacle',
      alongSpan: 80,
      lateral: -5,
      altitude: 110,
      editable: false
    },
    {
      id: 'floor-1',
      category: 'floor',
      alongSpan: 30,
      lateral: null,
      altitude: 100,
      editable: false
    },
    {
      id: 'load-1',
      category: 'loads',
      alongSpan: 40,
      lateral: 0,
      altitude: 135,
      editable: false,
      color: '#9333ea'
    },
    {
      id: 'dist-1',
      category: 'distance',
      alongSpan: 70,
      lateral: 5,
      altitude: 125,
      editable: false
    }
  ];

  describe('filterPointsForSide', () => {
    it('should filter points by visible categories', () => {
      const visible = new Set<FreePositioningPoint['category']>(['obstacle']);
      const filtered = filterPointsForSide(samplePoints, 'profile', visible);

      expect(filtered.map((p) => p.id)).toEqual(['obs-1', 'obs-2']);
    });

    it('should accept an array of visible categories as well as a Set', () => {
      const filtered = filterPointsForSide(samplePoints, 'profile', ['obstacle', 'floor']);
      expect(filtered.map((p) => p.id)).toEqual(['obs-1', 'obs-2', 'floor-1']);
    });

    it('should exclude points with lateral null when side is face', () => {
      const filtered = filterPointsForSide(samplePoints, 'face', ['obstacle', 'floor', 'loads', 'distance']);
      expect(filtered.map((p) => p.id)).not.toContain('floor-1');
    });

    it('should exclude points with NaN or non-number coordinates', () => {
      const invalidPoints: FreePositioningPoint[] = [
        {
          id: 'invalid-alt',
          category: 'obstacle',
          alongSpan: 50,
          lateral: 10,
          altitude: Number.NaN,
          editable: false
        },
        {
          id: 'invalid-along',
          category: 'obstacle',
          alongSpan: Number.NaN,
          lateral: 10,
          altitude: 100,
          editable: false
        },
        {
          id: 'invalid-lateral',
          category: 'obstacle',
          alongSpan: 50,
          lateral: Number.NaN,
          altitude: 100,
          editable: false
        }
      ];

      const profileFiltered = filterPointsForSide(invalidPoints, 'profile', ['obstacle']);
      expect(profileFiltered.map((p) => p.id)).toEqual(['invalid-lateral']);

      const faceFiltered = filterPointsForSide(invalidPoints, 'face', ['obstacle']);
      expect(faceFiltered.map((p) => p.id)).toEqual(['invalid-along']);
    });
  });

  describe('buildFreePositioningTraces', () => {
    it('should return empty array when no valid points exist', () => {
      const traces = buildFreePositioningTraces([], 'profile', ['obstacle']);
      expect(traces).toEqual([]);
    });

    it('should generate marker traces grouped by category', () => {
      const traces = buildFreePositioningTraces(samplePoints, 'profile', ['obstacle', 'floor']);
      expect(traces).toHaveLength(2); // obstacle-markers, floor-markers

      const obstacleTrace = traces.find((t) => (t as { name: string }).name === 'obstacle-markers') as {
        x: number[];
        y: number[];
        marker: { size: number[]; color: string[]; symbol: string };
        mode: string;
      };

      expect(obstacleTrace).toBeDefined();
      expect(obstacleTrace.x).toEqual([50, 80]);
      expect(obstacleTrace.y).toEqual([120, 110]);
      expect(obstacleTrace.mode).toBe('text+markers');
      expect(obstacleTrace.marker.size).toEqual([obstacle.selected.size, obstacle.unselected.size]);
      expect(obstacleTrace.marker.color).toEqual([obstacle.selected.color, obstacle.unselected.color]);
      expect(obstacleTrace.marker.symbol).toBe(obstacle.symbol);
    });

    describe('floor line', () => {
      interface FloorTrace {
        mode: string;
        x: number[];
        y: number[];
        line?: { color: string; width: number; dash: string };
      }
      const floorPoint = (id: string, alongSpan: number, altitude: number): FreePositioningPoint => ({
        id,
        category: 'floor',
        alongSpan,
        lateral: null,
        altitude,
        editable: false
      });

      it('should join the floor points, in their order, with the configured line', () => {
        const points = [floorPoint('f-1', 10, 100), floorPoint('f-2', 40, 90), floorPoint('f-3', 25, 95)];
        const [trace] = buildFreePositioningTraces(points, 'profile', ['floor']) as unknown as FloorTrace[];

        expect(trace.mode).toBe('lines+markers');
        expect(trace.x).toEqual([10, 40, 25]);
        expect(trace.y).toEqual([100, 90, 95]);
        expect(trace.line).toEqual({
          color: PlotlyDrawings.freePositioning.floorLine.color,
          width: PlotlyDrawings.freePositioning.floorLine.width,
          dash: PlotlyDrawings.freePositioning.floorLine.style
        });
      });

      it('should keep the labels of the floor points when it draws the line', () => {
        const points = [{ ...floorPoint('f-1', 10, 100), name: 'Floor 1' }, floorPoint('f-2', 40, 90)];
        const [trace] = buildFreePositioningTraces(points, 'profile', ['floor']) as unknown as FloorTrace[];

        expect(trace.mode).toBe('text+lines+markers');
      });

      it('should not draw a line for a single floor point', () => {
        const [trace] = buildFreePositioningTraces([floorPoint('f-1', 10, 100)], 'profile', [
          'floor'
        ]) as unknown as FloorTrace[];

        expect(trace.mode).toBe('markers');
        expect(trace.line).toBeUndefined();
      });

      it('should not draw a line for the other categories', () => {
        const traces = buildFreePositioningTraces(samplePoints, 'profile', [
          'obstacle',
          'loads',
          'distance'
        ]) as unknown as FloorTrace[];

        traces.forEach((trace) => expect(trace.line).toBeUndefined());
      });
    });

    it('should outline each point with the outline of its category and state', () => {
      const traces = buildFreePositioningTraces(samplePoints, 'profile', ['obstacle', 'loads']);
      const lineOf = (name: string) =>
        (traces.find((t) => (t as { name: string }).name === name) as { marker: { line: unknown } }).marker.line;

      expect(lineOf('obstacle-markers')).toEqual({
        width: [obstacle.selected.outlineWidth, obstacle.unselected.outlineWidth],
        color: [obstacle.selected.outlineColor, obstacle.unselected.outlineColor]
      });
      expect(lineOf('loads-markers')).toEqual({
        width: [loads.unselected.outlineWidth],
        color: [loads.unselected.outlineColor]
      });
    });

    it('should render loads points as square markers on their category trace', () => {
      const traces = buildFreePositioningTraces(samplePoints, 'profile', ['loads']);
      expect(traces).toHaveLength(1);

      const loadTrace = traces[0] as {
        name: string;
        x: number[];
        y: number[];
        marker: { symbol: string };
      };

      expect(loadTrace.name).toBe('loads-markers');
      expect(loadTrace.x).toEqual([40]);
      expect(loadTrace.y).toEqual([135]);
      expect(loadTrace.marker.symbol).toBe(PlotlyDrawings.freePositioning.category.loads.symbol);
    });

    it('should use lateral coordinate when side is face', () => {
      const traces = buildFreePositioningTraces(samplePoints, 'face', ['obstacle']);
      const obstacleTrace = traces[0] as { x: number[]; y: number[] };
      expect(obstacleTrace.x).toEqual([10, -5]);
      expect(obstacleTrace.y).toEqual([120, 110]);
    });

    it('should use the editable color and size for an editable load point', () => {
      const points: FreePositioningPoint[] = [
        {
          id: 'editable-load',
          category: 'loads',
          alongSpan: 25,
          lateral: 0,
          altitude: 100,
          editable: true
        }
      ];

      const traces = buildFreePositioningTraces(points, 'profile', ['loads']);
      const trace = traces[0] as { marker: { color: string[]; size: number[]; symbol: string } };
      expect(trace.marker.color).toEqual([loads.selected.color]);
      expect(trace.marker.size).toEqual([loads.selected.size]);
      expect(trace.marker.symbol).toBe(loads.symbol);
    });

    it('should disable hover on all point traces', () => {
      const traces = buildFreePositioningTraces(samplePoints, 'profile', ['obstacle', 'floor', 'loads', 'distance']);
      expect(traces.length).toBeGreaterThan(0);
      for (const trace of traces) {
        expect((trace as Record<string, unknown>).hoverinfo).toBe('skip');
        expect((trace as Record<string, unknown>).hovertext).toBeUndefined();
      }
    });
  });

  describe('findNearestPointAtPixel', () => {
    const mockLayout: PlotLayout = {
      margin: { l: 40, r: 10, t: 10, b: 40 },
      xaxis: {
        p2c: (pixel: number) => pixel * 2,
        c2p: (coord: number) => coord / 2
      },
      yaxis: {
        p2c: (pixel: number) => pixel * 3,
        c2p: (coord: number) => coord / 3
      }
    };

    it('should return the point closest to click when within radius', () => {
      // obs-1 is at alongSpan: 50 -> c2p(50) = 25, altitude: 120 -> c2p(120) = 40
      const nearest = findNearestPointAtPixel(
        samplePoints,
        'profile',
        mockLayout,
        26, // close to 25
        41, // close to 40
        ['obstacle', 'floor', 'loads', 'distance']
      );

      expect(nearest).not.toBeNull();
      expect(nearest?.id).toBe('obs-1');
    });

    it('should return null if no point is within radius', () => {
      const nearest = findNearestPointAtPixel(
        samplePoints,
        'profile',
        mockLayout,
        500,
        500,
        ['obstacle', 'floor', 'loads', 'distance'],
        10
      );

      expect(nearest).toBeNull();
    });

    it('should consider lateral coordinates for face side', () => {
      // obs-1 has lateral: 10 -> c2p(10) = 5, altitude: 120 -> c2p(120) = 40
      const nearest = findNearestPointAtPixel(samplePoints, 'face', mockLayout, 6, 40, ['obstacle']);

      expect(nearest?.id).toBe('obs-1');
    });
  });
});
