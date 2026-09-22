/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { createFloorAnnotations, createFloorTraces } from './createFloorTraces';
import { GetSectionOutput } from '@services/worker_python/tasks/types';
import { Floor } from '@shared/domain/models/floor.model';
import { Support } from '@shared/domain/models/support.model';
import { PlotData } from 'plotly.js-dist-min';

describe('createFloorTraces', () => {
  const supports = [{ uuid: 'sup-0' }, { uuid: 'sup-1' }, { uuid: 'sup-2' }] as Support[];

  const floor: Floor = {
    uuid: 'floor-1',
    supportUuid: 'sup-0',
    referenceSupport: 'LEFT',
    points: [
      { distanceToRefSupport: 0, altitude: 10 },
      { distanceToRefSupport: 25, altitude: 12 }
    ]
  };

  const litData = {
    obstacles: [
      {
        uuid: 'floor-1',
        points: [
          [1, 2, 10],
          [4, 5, 12]
        ]
      }
    ]
  } as unknown as GetSectionOutput;

  // Cast the union `DataObject[]` to plottable traces so scatter props (x/y/z/mode/marker/...) are readable.
  const build = (params: Omit<Parameters<typeof createFloorTraces>[0], 'pointLabel'>): Partial<PlotData>[] =>
    createFloorTraces({
      // Stands in for the transloco label the app passes (`studio.floor.point-title`).
      pointLabel: (distance) => (distance == null ? 'point' : `point ${distance.toFixed(2)}`),
      ...params
    }) as unknown as Partial<PlotData>[];

  type FloorAnnotation = Partial<Plotly.Annotations> & {
    z?: number;
    data?: { type: string; floorUuid: string; pointIndex: number };
  };
  const buildAnnotations = (
    params: Omit<Parameters<typeof createFloorAnnotations>[0], 'pointLabel'>
  ): FloorAnnotation[] =>
    createFloorAnnotations({
      pointLabel: (distance) => (distance == null ? 'point' : `point ${distance.toFixed(2)}`),
      ...params
    }) as FloorAnnotation[];

  const window3d = { supports, startSupport: 0, endSupport: 2, view: '3d', side: 'profile' } as const;

  it('should return [] when there are no floors', () => {
    expect(
      build({ litData, floors: [], supports, startSupport: 0, endSupport: 2, view: '3d', side: 'profile' })
    ).toEqual([]);
  });

  it('should return [] when litData has no obstacles', () => {
    expect(
      build({
        litData: { obstacles: [] } as unknown as GetSectionOutput,
        floors: [floor],
        supports,
        startSupport: 0,
        endSupport: 2,
        view: '3d',
        side: 'profile'
      })
    ).toEqual([]);
  });

  it('should skip a floor whose span is outside the visible support window', () => {
    // Window [1, 2) contains sup-1 only; the floor is attached to sup-0.
    expect(
      build({
        litData,
        floors: [floor],
        supports,
        startSupport: 1,
        endSupport: 2,
        view: '3d',
        side: 'profile'
      })
    ).toEqual([]);
  });

  it('should skip a floor with no matching rendered points', () => {
    const other = { ...floor, uuid: 'floor-missing' };
    expect(
      build({
        litData,
        floors: [other],
        supports,
        startSupport: 0,
        endSupport: 2,
        view: '3d',
        side: 'profile'
      })
    ).toEqual([]);
  });

  it('should build a line trace and a ribbon in 3D', () => {
    const traces = build({ litData, floors: [floor], ...window3d });
    const line = traces.find((t) => t.type === 'scatter3d');
    const ribbon = traces.find((t) => t.type === 'mesh3d');

    expect(traces).toHaveLength(2);
    expect(line?.mode).toBe('lines');
    expect(line?.x).toEqual([1, 4]);
    expect(line?.y).toEqual([2, 5]);
    expect(line?.z).toEqual([10, 12]);
    expect(line?.line).toMatchObject({ color: '#f6ab4d' });
    expect(ribbon).toBeDefined();
  });

  it('should keep the line and the ribbon out of mouse interaction', () => {
    // Floor points are picked through their annotations; the traces only draw the floor.
    const traces = build({ litData, floors: [floor], ...window3d }) as { hoverinfo?: string; customdata?: unknown }[];

    traces.forEach((trace) => {
      expect(trace.hoverinfo).toBe('skip');
      expect(trace.customdata).toBeUndefined();
    });
  });

  it('should bend the ribbon at every point so it follows an angled floor line', () => {
    const vShape = {
      obstacles: [
        {
          uuid: 'floor-1',
          points: [
            [0, 0, 10],
            [10, 0, 4],
            [20, 0, 10]
          ]
        }
      ]
    } as unknown as GetSectionOutput;
    const ribbon = build({
      litData: vShape,
      floors: [{ ...floor, points: [...floor.points, { distanceToRefSupport: 50, altitude: 10 }] }],
      ...window3d
    }).find((t) => t.type === 'mesh3d') as { x?: number[]; z?: number[]; i?: number[] };

    // One rail per point, each hanging from the line, and one quad (two triangles) per segment.
    expect(ribbon.x).toEqual([0, 0, 10, 10, 20, 20]);
    expect(ribbon.z?.map((z) => z + 0.15)).toEqual([10, 10, 4, 4, 10, 10].map((z) => expect.closeTo(z, 9)));
    expect(ribbon.i).toHaveLength(4);
  });

  it('should widen the ribbon perpendicular to the span, not along global Y', () => {
    // A span running along Y would collapse to zero-area triangles if widened along Y.
    const alongY = {
      obstacles: [
        {
          uuid: 'floor-1',
          points: [
            [0, 0, 10],
            [0, 25, 12]
          ]
        }
      ]
    } as unknown as GetSectionOutput;
    const ribbon = build({
      litData: alongY,
      floors: [floor],
      supports,
      startSupport: 0,
      endSupport: 2,
      view: '3d',
      side: 'profile'
    }).find((t) => t.type === 'mesh3d') as { x?: number[]; y?: number[] };

    expect(ribbon.x).toEqual([-10, 10, -10, 10]);
    expect(ribbon.y).toEqual([0, 0, 25, 25]);
  });

  it('should recess the ribbon just below the line', () => {
    const ribbon = build({ litData, floors: [floor], ...window3d }).find((t) => t.type === 'mesh3d') as {
      z?: number[];
    };

    expect(ribbon.z?.every((z, i) => z < [10, 10, 12, 12][i])).toBe(true);
  });

  it('should draw every floor point as a clickable annotation tagged with its floor and index', () => {
    const annotations = buildAnnotations({ litData, floors: [floor], ...window3d });

    expect(annotations).toHaveLength(2);
    expect(annotations.map((a) => [a.x, a.y, a.z])).toEqual([
      [1, 2, 10],
      [4, 5, 12]
    ]);
    annotations.forEach((a) => {
      expect(a.captureevents).toBe(true);
      expect(a.text).toBe('\u25cf');
      expect(a.font?.color).toBe('#f6ab4d');
    });
    expect(annotations.map((a) => a.data)).toEqual([
      { type: 'floor', floorUuid: 'floor-1', pointIndex: 0 },
      { type: 'floor', floorUuid: 'floor-1', pointIndex: 1 }
    ]);
  });

  it('should show point names on hover as "point {distance}"', () => {
    const annotations = buildAnnotations({ litData, floors: [floor], ...window3d });

    expect(annotations.map((a) => a.hovertext)).toEqual(['point 0.00', 'point 25.00']);
  });

  it('should draw the selected point as a red diamond labelled with its name', () => {
    const annotations = buildAnnotations({
      litData,
      floors: [floor],
      ...window3d,
      selectedFloorUuid: 'floor-1',
      selectedPointIndex: 1
    });
    const [first, selected, label] = annotations;

    expect(annotations).toHaveLength(3);
    expect(first.text).toBe('\u25cf');
    expect(selected).toMatchObject({ text: '\u25c6', captureevents: true, font: { color: 'red' } });
    expect(label).toMatchObject({ x: 4, text: 'point 25.00', captureevents: false });
    expect(label.yshift).toBeGreaterThan(0);
  });

  it('should not highlight any point when the selected floor uuid does not match', () => {
    const annotations = buildAnnotations({
      litData,
      floors: [floor],
      ...window3d,
      selectedFloorUuid: 'other-floor',
      selectedPointIndex: 1
    });

    expect(annotations).toHaveLength(2);
    expect(annotations.every((a) => a.text === '\u25cf')).toBe(true);
  });

  it('should skip annotations of a floor outside the visible support window', () => {
    expect(buildAnnotations({ litData, floors: [floor], ...window3d, startSupport: 1 })).toEqual([]);
  });

  it('should map annotations to plot x/y in 2D face view', () => {
    const annotations = buildAnnotations({ litData, floors: [floor], ...window3d, view: '2d', side: 'face' });

    expect(annotations.map((a) => [a.x, a.y])).toEqual([
      [2, 10],
      [5, 12]
    ]);
  });

  it('should map x/z to plot x/y and omit ribbon in 2D profile', () => {
    const traces = build({
      litData,
      floors: [floor],
      supports,
      startSupport: 0,
      endSupport: 2,
      view: '2d',
      side: 'profile'
    });
    const line = traces.find((t) => t.mode === 'lines');

    expect(traces).toHaveLength(1);
    expect(line?.type).toBe('scatter');
    expect(line?.x).toEqual([1, 4]);
    expect(line?.y).toEqual([10, 12]);
    expect(line?.z).toBeUndefined();
  });

  it('should map y/z to plot x/y in 2D face view', () => {
    const [line] = build({
      litData,
      floors: [floor],
      supports,
      startSupport: 0,
      endSupport: 2,
      view: '2d',
      side: 'face'
    });

    expect(line.x).toEqual([2, 5]);
    expect(line.y).toEqual([10, 12]);
  });

  it('should fall back to "point" when distanceToRefSupport is null', () => {
    const nullFloor: Floor = {
      ...floor,
      points: [
        { distanceToRefSupport: null, altitude: 10 },
        { distanceToRefSupport: null, altitude: 12 }
      ]
    };
    const annotations = buildAnnotations({ litData, floors: [nullFloor], ...window3d });

    expect(annotations.map((a) => a.hovertext)).toEqual(['point', 'point']);
  });
});
