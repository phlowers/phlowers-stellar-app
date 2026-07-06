/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { createDistanceMeasuringPointsTraces } from './createAdditionalPointsTraces';
import { ObstacleOutput } from '@services/worker_python/tasks/types';

describe('createAdditionalPointsTraces', () => {
  const twoPointGroup: ObstacleOutput['obstacles'] = [
    {
      uuid: 'group-1',
      points: [
        [1, 2, 3],
        [4, 5, 6]
      ]
    }
  ];

  const threePointGroup: ObstacleOutput['obstacles'] = [
    {
      uuid: 'group-2',
      points: [
        [1, 2, 3],
        [4, 5, 6],
        [7, 8, 9]
      ]
    }
  ];

  it('should return an empty array when additionalPoints is undefined', () => {
    expect(createDistanceMeasuringPointsTraces(undefined, '3d', 'profile')).toEqual([]);
  });

  it('should return an empty array when additionalPoints is empty', () => {
    expect(createDistanceMeasuringPointsTraces([], '3d', 'profile')).toEqual([]);
  });

  it('should build one marker trace per point and one line trace per segment for a 2-point group', () => {
    const traces = createDistanceMeasuringPointsTraces(twoPointGroup, '3d', 'profile');

    const markers = traces.filter((t) => t.mode === 'markers');
    const lines = traces.filter((t) => t.mode === 'lines');
    expect(markers).toHaveLength(2);
    expect(lines).toHaveLength(1);
  });

  it('should build 3 marker traces and 2 line traces for a 3-point group', () => {
    const traces = createDistanceMeasuringPointsTraces(threePointGroup, '3d', 'profile');

    const markers = traces.filter((t) => t.mode === 'markers');
    const lines = traces.filter((t) => t.mode === 'lines');
    expect(markers).toHaveLength(3);
    expect(lines).toHaveLength(2);
  });

  it('should map coordinates to x/y/z with scatter3d type in 3D view', () => {
    const [marker] = createDistanceMeasuringPointsTraces(twoPointGroup, '3d', 'profile');

    expect(marker.type).toBe('scatter3d');
    expect(marker.x).toEqual([1]);
    expect(marker.y).toEqual([2]);
    expect(marker.z).toEqual([3]);
  });

  it('should map x/z to x/y with scatter type in 2D profile view', () => {
    const [marker] = createDistanceMeasuringPointsTraces(twoPointGroup, '2d', 'profile');

    expect(marker.type).toBe('scatter');
    expect(marker.x).toEqual([1]);
    expect(marker.y).toEqual([3]);
    expect(marker.z).toBeUndefined();
  });

  it('should map y/z to x/y with scatter type in 2D face view', () => {
    const [marker] = createDistanceMeasuringPointsTraces(twoPointGroup, '2d', 'face');

    expect(marker.type).toBe('scatter');
    expect(marker.x).toEqual([2]);
    expect(marker.y).toEqual([3]);
  });

  it('should connect consecutive points with a line trace using dashed styling', () => {
    const traces = createDistanceMeasuringPointsTraces(twoPointGroup, '3d', 'profile');
    const line = traces.find((t) => t.mode === 'lines');

    expect(line?.x).toEqual([1, 4]);
    expect(line?.y).toEqual([2, 5]);
    expect(line?.z).toEqual([3, 6]);
    expect(line?.line).toMatchObject({ dash: 'dash' });
  });

  it('should mark all traces as non-legend and non-hoverable', () => {
    const traces = createDistanceMeasuringPointsTraces(twoPointGroup, '3d', 'profile');

    traces.forEach((trace) => {
      expect(trace.showlegend).toBe(false);
      expect(trace.hoverinfo).toBe('skip');
    });
  });

  it('should build traces for multiple groups independently', () => {
    const traces = createDistanceMeasuringPointsTraces([...twoPointGroup, ...threePointGroup], '3d', 'profile');

    // 2 markers + 1 line for group 1, 3 markers + 2 lines for group 2
    expect(traces).toHaveLength(8);
  });
});
