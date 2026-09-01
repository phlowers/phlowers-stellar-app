/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { createFloorTraces } from './createFloorTraces';
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
  const build = (params: Parameters<typeof createFloorTraces>[0]): Partial<PlotData>[] =>
    createFloorTraces(params) as unknown as Partial<PlotData>[];

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

  it('should build a line+markers trace and a ribbon in 3D', () => {
    const traces = build({
      litData,
      floors: [floor],
      supports,
      startSupport: 0,
      endSupport: 2,
      view: '3d',
      side: 'profile'
    });
    const line = traces.find((t) => t.mode === 'lines+markers');
    const ribbon = traces.find((t) => t.type === 'mesh3d');

    expect(traces).toHaveLength(2);
    expect(line?.type).toBe('scatter3d');
    expect(line?.x).toEqual([1, 4]);
    expect(line?.y).toEqual([2, 5]);
    expect(line?.z).toEqual([10, 12]);
    expect(line?.line).toMatchObject({ color: '#f6ab4d' });
    expect(ribbon).toBeDefined();
  });

  it('should give the ribbon the same hover payload as its source point, twice per vertex pair', () => {
    // The ribbon covers far more screen area than the markers, so it is what the mouse actually
    // hits in gl3d: each of a point's two vertices must resolve back to that point.
    const ribbon = build({
      litData,
      floors: [floor],
      supports,
      startSupport: 0,
      endSupport: 2,
      view: '3d',
      side: 'profile'
    }).find((t) => t.type === 'mesh3d') as { hovertext?: string[]; customdata?: unknown; hoverinfo?: string };

    expect(ribbon.hoverinfo).toBe('text');
    expect(ribbon.hovertext).toEqual(['point 0.00', 'point 0.00', 'point 25.00', 'point 25.00']);
    expect(ribbon.customdata).toEqual([
      ['floor-1', 0],
      ['floor-1', 0],
      ['floor-1', 1],
      ['floor-1', 1]
    ]);
  });

  it('should recess the ribbon below the markers so they stay hoverable', () => {
    const ribbon = build({
      litData,
      floors: [floor],
      supports,
      startSupport: 0,
      endSupport: 2,
      view: '3d',
      side: 'profile'
    }).find((t) => t.type === 'mesh3d') as { z?: number[] };

    // mesh3d always writes to the 3D pick buffer, so every ribbon vertex sits under its point altitude.
    expect(ribbon.z?.every((z, i) => z < [10, 10, 12, 12][i])).toBe(true);
  });

  it('should tag each floor marker with its [floorUuid, pointIndex] customdata', () => {
    const [line] = build({
      litData,
      floors: [floor],
      supports,
      startSupport: 0,
      endSupport: 2,
      view: '3d',
      side: 'profile'
    });

    expect((line as { customdata?: unknown }).customdata).toEqual([
      ['floor-1', 0],
      ['floor-1', 1]
    ]);
  });

  it('should highlight the selected point of the selected floor', () => {
    const [line] = build({
      litData,
      floors: [floor],
      supports,
      startSupport: 0,
      endSupport: 2,
      view: '3d',
      side: 'profile',
      selectedFloorUuid: 'floor-1',
      selectedPointIndex: 1
    });
    const marker = (line as { marker?: { color: string[]; size: number[] } }).marker!;

    expect(marker.color).toEqual(['#f6ab4d', '#ed6e13']);
    expect(marker.size[1]).toBeGreaterThan(marker.size[0]);
  });

  it('should not highlight when the selected floor uuid does not match', () => {
    const [line] = build({
      litData,
      floors: [floor],
      supports,
      startSupport: 0,
      endSupport: 2,
      view: '3d',
      side: 'profile',
      selectedFloorUuid: 'other-floor',
      selectedPointIndex: 1
    });
    const marker = (line as { marker?: { color: string[] } }).marker!;

    expect(marker.color).toEqual(['#f6ab4d', '#f6ab4d']);
  });

  it('should expose point names only on hover as "point {distance}"', () => {
    const [line] = build({
      litData,
      floors: [floor],
      supports,
      startSupport: 0,
      endSupport: 2,
      view: '3d',
      side: 'profile'
    });

    expect(line.hoverinfo).toBe('text');
    expect(line.text).toBeUndefined();
    expect(line.hovertext).toEqual(['point 0.00', 'point 25.00']);
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
    const line = traces.find((t) => t.mode === 'lines+markers');

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
    const [line] = build({
      litData,
      floors: [nullFloor],
      supports,
      startSupport: 0,
      endSupport: 2,
      view: '3d',
      side: 'profile'
    });

    expect(line.hovertext).toEqual(['point', 'point']);
  });
});
