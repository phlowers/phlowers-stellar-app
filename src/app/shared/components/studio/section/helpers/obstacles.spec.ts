import { LateralDistanceType, Obstacle, ReferenceSupport } from '@shared/domain/models/obstacle.model';
import { Support } from '@shared/domain/models/support.model';
import {
  ObstacleAnnotationData,
  getObstacleClickPayload,
  appendExistingObstaclesWithFormObstacle,
  createObstaclesAnnotations
} from './obstacles';
import { CreatePlotParams } from './createPlot';
import { DataObject } from './createPlotDataObject';

import { GetSectionOutput } from '@services/worker_python/tasks/types';

type ObstacleAnnotation = Partial<Plotly.Annotations> & { z?: number; data?: ObstacleAnnotationData };

const makeLitData = (obstacles: { uuid: string; points: [number, number, number][] }[]): GetSectionOutput =>
  ({ obstacles }) as unknown as GetSectionOutput;

const makeObstacle = (overrides: Partial<Obstacle> = {}): Obstacle => ({
  uuid: 'obs-1',
  supportUuid: 'sup-1',
  supportIndex: 0,
  name: 'Obstacle 1',
  type: 'tree',
  altitudeType: 'absolute',
  referenceSupport: ReferenceSupport.LEFT,
  lateralDistanceType: LateralDistanceType.SPAN_AXIS,
  positions: [{ x: 1, y: 2, z: 3 }],
  ...overrides
});

const makeSupport = (uuid: string) =>
  ({ uuid, number: null, name: null, spanLength: null, spanAngle: null, attachmentSet: null, attachmentHeight: null, heightBelowConsole: null, towerModel: null, cableType: null, armLength: null, chainName: null, chainLength: null, chainWeight: null, chainV: null, counterWeight: null, supportFootAltitude: null, attachmentPosition: null, chainSurface: null }) satisfies Support;

describe('getObstacleClickPayload', () => {
  const obstacles = [makeObstacle(), makeObstacle({ uuid: 'obs-2', supportUuid: 'sup-2' })];
  const supports = [makeSupport('sup-1'), makeSupport('sup-2')];

  it('should return null when data is undefined', () => {
    expect(getObstacleClickPayload(undefined, obstacles, supports)).toBeNull();
  });

  it('should return null when data type is not obstacle', () => {
    const data = {
      type: 'load',
      obstacleUuid: 'obs-1',
      obstaclePositionIndex: 0
    } as unknown as ObstacleAnnotationData;
    expect(getObstacleClickPayload(data, obstacles, supports)).toBeNull();
  });

  it('should return null when obstacleUuid is null', () => {
    const data = {
      type: 'obstacle',
      obstacleUuid: null,
      obstaclePositionIndex: 0
    } as unknown as ObstacleAnnotationData;
    expect(getObstacleClickPayload(data, obstacles, supports)).toBeNull();
  });

  it('should return null when obstacle is not found', () => {
    const data: ObstacleAnnotationData = {
      type: 'obstacle',
      obstacleUuid: 'unknown',
      obstaclePositionIndex: 0
    };
    expect(getObstacleClickPayload(data, obstacles, supports)).toBeNull();
  });

  it('should return null when support is not found', () => {
    const obs = [makeObstacle({ supportUuid: 'missing-support' })];
    const data: ObstacleAnnotationData = {
      type: 'obstacle',
      obstacleUuid: 'obs-1',
      obstaclePositionIndex: 0
    };
    expect(getObstacleClickPayload(data, obs, supports)).toBeNull();
  });

  it('should return valid payload for matching obstacle and support', () => {
    const data: ObstacleAnnotationData = {
      type: 'obstacle',
      obstacleUuid: 'obs-1',
      obstaclePositionIndex: 0
    };
    const result = getObstacleClickPayload(data, obstacles, supports);
    expect(result).toEqual({
      obstacle: obstacles[0],
      supportIndex: 0,
      obstaclePositionIndex: 0
    });
  });

  it('should default obstaclePositionIndex to 0 when missing', () => {
    const data = {
      type: 'obstacle',
      obstacleUuid: 'obs-2'
    } as unknown as ObstacleAnnotationData;
    const result = getObstacleClickPayload(data, obstacles, supports);
    expect(result).toEqual({
      obstacle: obstacles[1],
      supportIndex: 1,
      obstaclePositionIndex: 0
    });
  });
});

describe('appendExistingObstaclesWithFormObstacle', () => {
  const existing = [makeObstacle(), makeObstacle({ uuid: 'obs-2' })];

  it('should return existing obstacles when formObstacle is null', () => {
    expect(appendExistingObstaclesWithFormObstacle(existing, null)).toBe(existing);
  });

  it('should return existing obstacles when formObstacle has no uuid', () => {
    const noUuid = { ...makeObstacle(), uuid: '' } as Obstacle;
    expect(appendExistingObstaclesWithFormObstacle(existing, noUuid)).toBe(existing);
  });

  it('should replace existing obstacle with matching uuid and append', () => {
    const updated = makeObstacle({ uuid: 'obs-1', name: 'Updated' });
    const result = appendExistingObstaclesWithFormObstacle(existing, updated);
    expect(result).toHaveLength(2);
    expect(result[1].name).toBe('Updated');
    // obs-2 should still be there
    expect(result[0].uuid).toBe('obs-2');
  });

  it('should append new obstacle when uuid does not exist', () => {
    const newObs = makeObstacle({ uuid: 'obs-3', name: 'New' });
    const result = appendExistingObstaclesWithFormObstacle(existing, newObs);
    expect(result).toHaveLength(3);
    expect(result[2].name).toBe('New');
  });
});

describe('createObstaclesAnnotations', () => {
  const makeSupportDataObject = (uuid: string, x: number, y: number, z: number): DataObject =>
    ({
      name: 'supports',
      supportUuid: uuid,
      x: [x],
      y: [y],
      z: [z]
    }) as unknown as DataObject;

  const basePlotParams = (overrides: Partial<CreatePlotParams> = {}): CreatePlotParams => ({
    plotId: 'plot-1',
    data: [],
    litData: {} as CreatePlotParams['litData'],
    invert: false,
    view: '3d' as const,
    camera: null,
    side: 'profile' as const,
    spanLoads: [],
    startSupport: 0,
    endSupport: 1,
    obstacles: [],
    currentObstacleUuid: 'obs-1',
    currentObstaclePointIndex: 0,
    supports: [makeSupport('sup-1'), makeSupport('sup-2')],
    distances: [],
    distanceType: 'oblique' as const,
    ...overrides
  });

  it('should return empty array when there are no obstacles', () => {
    const params = basePlotParams({
      currentObstacleUuid: null,
      data: [makeSupportDataObject('sup-1', 0, 0, 0), makeSupportDataObject('sup-2', 10, 0, 0)]
    });
    expect(createObstaclesAnnotations(params)).toEqual([]);
  });

  it('should render all obstacles in black when no obstacle is selected', () => {
    const obstacle = makeObstacle({ supportUuid: 'sup-1' });
    const params = basePlotParams({
      currentObstacleUuid: null,
      obstacles: [obstacle],
      litData: makeLitData([{ uuid: 'obs-1', points: [[1, 2, 3]] }])
    });
    const annotations = createObstaclesAnnotations(params) as ObstacleAnnotation[];
    expect(annotations).toHaveLength(2);
    const marker = annotations.find((a) => a.text === '●') as ObstacleAnnotation;
    expect(marker.font!.color).toBe('black');
  });

  it('should show all obstacles and highlight selected in red, others in black', () => {
    const obstacleA = makeObstacle({ uuid: 'obs-A', supportUuid: 'sup-1', name: 'A' });
    const obstacleB = makeObstacle({ uuid: 'obs-B', supportUuid: 'sup-1', name: 'B' });
    const params = basePlotParams({
      currentObstacleUuid: 'obs-A',
      obstacles: [obstacleA, obstacleB],
      litData: makeLitData([
        { uuid: 'obs-A', points: [[1, 2, 3]] },
        { uuid: 'obs-B', points: [[10, 20, 30]] }
      ])
    });
    const annotations = createObstaclesAnnotations(params) as ObstacleAnnotation[];
    // 2 obstacles × 1 point × 2 annotations = 4
    expect(annotations).toHaveLength(4);
    const markerA = annotations.find(
      (a) => a.text === '◆' && a.data?.obstacleUuid === 'obs-A'
    ) as ObstacleAnnotation;
    const markerB = annotations.find(
      (a) => a.text === '●' && a.data?.obstacleUuid === 'obs-B'
    ) as ObstacleAnnotation;
    expect(markerA.font!.color).toBe('red');
    expect(markerB.font!.color).toBe('black');
  });

  it('should return empty array when obstacle support is outside visible span', () => {
    const obstacle = makeObstacle({ supportUuid: 'sup-3' });
    const params = basePlotParams({
      startSupport: 0,
      endSupport: 1,
      supports: [makeSupport('sup-1'), makeSupport('sup-2'), makeSupport('sup-3')],
      obstacles: [obstacle],
      litData: makeLitData([{ uuid: 'obs-1', points: [[5, 5, 5]] }])
    });
    // sup-3 is outside [startSupport, endSupport] and must be hidden
    expect(createObstaclesAnnotations(params)).toEqual([]);
  });

  it('should only show obstacles within visible support range', () => {
    const visibleObstacle = makeObstacle({ uuid: 'obs-visible', supportUuid: 'sup-1', name: 'Visible' });
    const hiddenObstacle = makeObstacle({ uuid: 'obs-hidden', supportUuid: 'sup-3', name: 'Hidden' });
    const params = basePlotParams({
      startSupport: 0,
      endSupport: 1,
      currentObstacleUuid: 'obs-visible',
      supports: [makeSupport('sup-1'), makeSupport('sup-2'), makeSupport('sup-3')],
      obstacles: [visibleObstacle, hiddenObstacle],
      litData: makeLitData([
        { uuid: 'obs-visible', points: [[1, 2, 3]] },
        { uuid: 'obs-hidden', points: [[10, 20, 30]] }
      ])
    });
    const annotations = createObstaclesAnnotations(params) as ObstacleAnnotation[];
    // Only obs-visible is within [startSupport, endSupport]: 1 obstacle × 1 point × 2 annotations = 2
    expect(annotations).toHaveLength(2);
    const markerVisible = annotations.find(
      (a) => a.text === '◆' && a.data?.obstacleUuid === 'obs-visible'
    ) as ObstacleAnnotation;
    expect(markerVisible.font!.color).toBe('red');
    expect(annotations.some((a) => a.data?.obstacleUuid === 'obs-hidden')).toBe(false);
  });

  it('should not show obstacles on the endSupport (they belong to the next span)', () => {
    const obstacle = makeObstacle({ uuid: 'obs-end', supportUuid: 'sup-2', name: 'End' });
    const params = basePlotParams({
      startSupport: 0,
      endSupport: 1,
      currentObstacleUuid: 'obs-end',
      supports: [makeSupport('sup-1'), makeSupport('sup-2'), makeSupport('sup-3')],
      obstacles: [obstacle],
      litData: makeLitData([{ uuid: 'obs-end', points: [[5, 5, 5]] }])
    });
    const annotations = createObstaclesAnnotations(params) as ObstacleAnnotation[];
    // sup-2 is the endSupport and belongs to the next span
    expect(annotations).toHaveLength(0);
  });

  it('should not show obstacles attached to endSupport (they belong to the next span)', () => {
    // Span 0 = support 0→1, obstacles on support 1 are on span 1 (next span)
    const obstacleOnCurrentSpan = makeObstacle({ uuid: 'obs-span0', supportUuid: 'sup-1', name: 'Span0' });
    const obstacleOnNextSpan = makeObstacle({ uuid: 'obs-span1', supportUuid: 'sup-2', name: 'Span1' });
    const params = basePlotParams({
      startSupport: 0,
      endSupport: 1,
      currentObstacleUuid: null,
      supports: [makeSupport('sup-1'), makeSupport('sup-2'), makeSupport('sup-3')],
      obstacles: [obstacleOnCurrentSpan, obstacleOnNextSpan],
      litData: makeLitData([
        { uuid: 'obs-span0', points: [[1, 2, 3]] },
        { uuid: 'obs-span1', points: [[10, 20, 30]] }
      ])
    });
    const annotations = createObstaclesAnnotations(params) as ObstacleAnnotation[];
    // Only obs-span0 should appear; obs-span1 is on the next span
    expect(annotations).toHaveLength(2);
    expect(annotations[0].data?.obstacleUuid).toBe('obs-span0');
    expect(annotations.some((a) => a.data?.obstacleUuid === 'obs-span1')).toBe(false);
  });

  it('should create annotation for obstacle with valid position in 3d', () => {
    const obstacle = makeObstacle({
      supportUuid: 'sup-1',
      positions: [{ x: 1, y: 2, z: 3 }]
    });
    const params = basePlotParams({
      obstacles: [obstacle],
      litData: makeLitData([{ uuid: 'obs-1', points: [[11, 22, 3]] }]),
      view: '3d'
    });
    const annotations = createObstaclesAnnotations(params);
    expect(annotations).toHaveLength(2);
    const marker = annotations.find((a) => (a as ObstacleAnnotation).text === '◆') as ObstacleAnnotation;
    const label = annotations.find((a) => (a as ObstacleAnnotation).text === 'Obstacle 1') as ObstacleAnnotation;
    expect(marker).toMatchObject({ x: 11, y: 22, z: 3 });
    expect(label).toMatchObject({ x: 11, y: 22, z: 3, text: 'Obstacle 1' });
  });

  it('should fallback to obstacle UUID when domain obstacle is not found', () => {
    const params = basePlotParams({
      obstacles: [], // Empty — no domain obstacles
      litData: makeLitData([{ uuid: 'obs-missing-uuid-123', points: [[1, 2, 3]] }]),
      view: '3d'
    });
    const annotations = createObstaclesAnnotations(params);
    expect(annotations).toHaveLength(2);
    // Label should display the UUID instead of an empty string
    const label = annotations.find(
      (a) => (a as ObstacleAnnotation).text === 'obs-missing-uuid-123'
    ) as ObstacleAnnotation;
    expect(label).toBeTruthy();
    expect(label.text).toBe('obs-missing-uuid-123');
  });

  it('should add support altitude to z when altitudeType is relative', () => {
    const obstacle = makeObstacle({
      altitudeType: 'relative',
      supportUuid: 'sup-1',
      positions: [{ x: 1, y: 2, z: 3 }]
    });
    // Python computes altitude = position.z + support.z = 3 + 30 = 33
    const params = basePlotParams({
      obstacles: [obstacle],
      litData: makeLitData([{ uuid: 'obs-1', points: [[11, 22, 33]] }]),
      view: '3d'
    });
    const annotations = createObstaclesAnnotations(params);
    expect(annotations).toHaveLength(2);
    const marker = annotations.find((a) => (a as ObstacleAnnotation).text === '◆') as ObstacleAnnotation;
    expect(marker).toMatchObject({ x: 11, y: 22, z: 33 });
  });

  it('should skip positions where x, y or z is null', () => {
    const obstacle = makeObstacle({
      supportUuid: 'sup-1',
      positions: [
        { x: null, y: 2, z: 3 },
        { x: 1, y: null, z: 3 },
        { x: 1, y: 2, z: null },
        { x: 1, y: 2, z: 3 }
      ]
    });
    // Python filters invalid positions; only the 1 valid point is returned in litData
    const params = basePlotParams({
      obstacles: [obstacle],
      litData: makeLitData([{ uuid: 'obs-1', points: [[1, 2, 3]] }])
    });
    const annotations = createObstaclesAnnotations(params);
    expect(annotations).toHaveLength(2);
  });

  it('should use diamond for non-active selected points and open circle for the active point', () => {
    const obstacle = makeObstacle({
      supportUuid: 'sup-1',
      positions: [
        { x: 1, y: 2, z: 3 },
        { x: 4, y: 5, z: 6 }
      ]
    });
    const params = basePlotParams({
      obstacles: [obstacle],
      litData: makeLitData([
        {
          uuid: 'obs-1',
          points: [
            [1, 2, 3],
            [4, 5, 6]
          ]
        }
      ]),
      currentObstacleUuid: 'obs-1',
      currentObstaclePointIndex: 1
    });
    const annotations = createObstaclesAnnotations(params);
    // 2 points => 4 annotations (marker + label for each)
    expect(annotations).toHaveLength(4);
    // point 0 is non-active — should use open circle
    const marker0 = annotations.find(
      (a: ObstacleAnnotation) => a.text === '○' && a.data?.obstaclePositionIndex === 0
    ) as ObstacleAnnotation;
    // point 1 is the active point — should use diamond
    const marker1 = annotations.find(
      (a: ObstacleAnnotation) => a.text === '◆' && a.data?.obstaclePositionIndex === 1
    ) as ObstacleAnnotation;
    // Non-active point uses inactive color, active point uses active color
    expect(marker0.font!.color).toBe('#922911');
    expect(marker1.font!.color).toBe('red');
  });

  it('should use z-based y coordinate in 2d face view', () => {
    const obstacle = makeObstacle({
      supportUuid: 'sup-1',
      positions: [{ x: 1, y: 2, z: 3 }]
    });
    // In 2D face view: px = cy, py = cz. Python returns [cx, cy, cz] = [1, 12, 3].
    const params = basePlotParams({
      obstacles: [obstacle],
      litData: makeLitData([{ uuid: 'obs-1', points: [[1, 12, 3]] }]),
      view: '2d',
      side: 'face'
    });
    const annotations = createObstaclesAnnotations(params);
    expect(annotations).toHaveLength(2);
    const marker = annotations.find((a) => (a as ObstacleAnnotation).text === '◆') as ObstacleAnnotation;
    expect(marker).toMatchObject({ x: 12, y: 3, z: 3 });
  });

  it('should add support altitude in 2d when altitudeType is relative', () => {
    const obstacle = makeObstacle({
      altitudeType: 'relative',
      supportUuid: 'sup-1',
      positions: [{ x: 1, y: 2, z: 3 }]
    });
    // Python computes altitude = position.z + support.y (2D NGF) = 3 + 30 = 33.
    // In 2D face: px = cy = 12, py = cz = 33.
    const params = basePlotParams({
      obstacles: [obstacle],
      litData: makeLitData([{ uuid: 'obs-1', points: [[1, 12, 33]] }]),
      view: '2d',
      side: 'face'
    });
    const annotations = createObstaclesAnnotations(params);
    expect(annotations).toHaveLength(2);
    const marker = annotations.find((a) => (a as ObstacleAnnotation).text === '◆') as ObstacleAnnotation;
    expect(marker).toMatchObject({ x: 12, y: 33, z: 33 });
  });

  it('should use support foot altitude for relative altitude type (Python computes absolute z)', () => {
    const obstacle = makeObstacle({
      altitudeType: 'relative',
      supportUuid: 'sup-1',
      positions: [{ x: 1, y: 2, z: 5 }]
    });
    const params = basePlotParams({
      obstacles: [obstacle],
      // Python computes absolute z: position.z + supportFootAltitude = 5 + 100 = 105
      litData: makeLitData([{ uuid: 'obs-1', points: [[1, 2, 105]] }]),
      view: '3d'
    });
    const annotations = createObstaclesAnnotations(params);
    const marker = annotations.find((a) => (a as ObstacleAnnotation).text === '◆') as ObstacleAnnotation;
    expect(marker.z).toBe(105);
  });

  it('should use cable attachment altitude for relative_cable altitude type (Python computes absolute z)', () => {
    const obstacle = makeObstacle({
      altitudeType: 'relative_cable',
      supportUuid: 'sup-1',
      positions: [{ x: 1, y: 2, z: 5 }]
    });
    const params = basePlotParams({
      obstacles: [obstacle],
      // Python computes absolute z: position.z + attachmentHeight = 5 + 165 = 170
      litData: makeLitData([{ uuid: 'obs-1', points: [[1, 2, 170]] }]),
      view: '3d'
    });
    const annotations = createObstaclesAnnotations(params);
    const marker = annotations.find((a) => (a as ObstacleAnnotation).text === '◆') as ObstacleAnnotation;
    expect(marker.z).toBe(170);
  });

  it('should use RIGHT support foot altitude when referenceSupport is RIGHT and altitudeType is relative (Python computes absolute z)', () => {
    const obstacle = makeObstacle({
      altitudeType: 'relative',
      referenceSupport: ReferenceSupport.RIGHT,
      supportUuid: 'sup-1',
      positions: [{ x: 1, y: 2, z: 5 }]
    });
    const params = basePlotParams({
      obstacles: [obstacle],
      // Python computes absolute z using RIGHT support: position.z + rightSupportFootAltitude = 5 + 120 = 125
      litData: makeLitData([{ uuid: 'obs-1', points: [[1, 2, 125]] }]),
      view: '3d'
    });
    const annotations = createObstaclesAnnotations(params);
    const marker = annotations.find((a) => (a as ObstacleAnnotation).text === '◆') as ObstacleAnnotation;
    expect(marker.z).toBe(125);
  });

  it('should fallback to plot base altitude when supportFootAltitude is null for relative type (Python computes absolute z)', () => {
    const obstacle = makeObstacle({
      altitudeType: 'relative',
      supportUuid: 'sup-1',
      positions: [{ x: 1, y: 2, z: 5 }]
    });
    const params = basePlotParams({
      obstacles: [obstacle],
      // Python falls back to plot base altitude: position.z + baseAltitude = 5 + 200 = 205
      litData: makeLitData([{ uuid: 'obs-1', points: [[1, 2, 205]] }]),
      view: '3d'
    });
    const annotations = createObstaclesAnnotations(params);
    const marker = annotations.find((a) => (a as ObstacleAnnotation).text === '◆') as ObstacleAnnotation;
    expect(marker.z).toBe(205);
  });

  it('should fallback to plot base altitude for relative_cable when attachmentHeight is null (Python computes absolute z)', () => {
    const obstacle = makeObstacle({
      altitudeType: 'relative_cable',
      supportUuid: 'sup-1',
      positions: [{ x: 1, y: 2, z: 5 }]
    });
    const params = basePlotParams({
      obstacles: [obstacle],
      // Python falls back to plot base altitude: position.z + baseAltitude = 5 + 200 = 205
      litData: makeLitData([{ uuid: 'obs-1', points: [[1, 2, 205]] }]),
      view: '3d'
    });
    const annotations = createObstaclesAnnotations(params);
    const marker = annotations.find((a) => (a as ObstacleAnnotation).text === '◆') as ObstacleAnnotation;
    expect(marker.z).toBe(205);
  });

  it('should use RIGHT support attachmentHeight for relative_cable with RIGHT reference (Python computes absolute z)', () => {
    const obstacle = makeObstacle({
      altitudeType: 'relative_cable',
      referenceSupport: ReferenceSupport.RIGHT,
      supportUuid: 'sup-1',
      positions: [{ x: 1, y: 2, z: 5 }]
    });
    const params = basePlotParams({
      obstacles: [obstacle],
      // Python computes absolute z using RIGHT support attachmentHeight: position.z + 180 = 5 + 180 = 185
      litData: makeLitData([{ uuid: 'obs-1', points: [[1, 2, 185]] }]),
      view: '3d'
    });
    const annotations = createObstaclesAnnotations(params);
    const marker = annotations.find((a) => (a as ObstacleAnnotation).text === '◆') as ObstacleAnnotation;
    expect(marker.z).toBe(185);
  });

  it('should include annotation data for event handling', () => {
    const obstacle = makeObstacle({
      supportUuid: 'sup-1',
      positions: [{ x: 1, y: 2, z: 3 }]
    });
    const params = basePlotParams({
      obstacles: [obstacle],
      litData: makeLitData([{ uuid: 'obs-1', points: [[1, 2, 3]] }])
    });
    const annotations = createObstaclesAnnotations(params);
    const marker = annotations.find((a) => (a as ObstacleAnnotation).text === '◆') as ObstacleAnnotation;
    const label = annotations.find((a) => (a as ObstacleAnnotation).text === 'Obstacle 1') as ObstacleAnnotation;
    expect(marker.data).toEqual({ obstacleUuid: 'obs-1', obstaclePositionIndex: 0, type: 'obstacle' });
    expect(label.data).toEqual({ obstacleUuid: 'obs-1', obstaclePositionIndex: 0, type: 'obstacle' });
  });

  it('should show tooltip only on marker (not on label)', () => {
    const obstacle = makeObstacle({
      supportUuid: 'sup-1',
      positions: [{ x: 1, y: 2, z: 3 }]
    });
    const params = basePlotParams({
      obstacles: [obstacle],
      litData: makeLitData([{ uuid: 'obs-1', points: [[11, 22, 3]] }]),
      view: '3d'
    });

    const annotations = createObstaclesAnnotations(params) as ObstacleAnnotation[];
    const marker = annotations.find((a) => a.text === '◆');
    const label = annotations.find((a) => a.text === 'Obstacle 1');

    expect(marker!.captureevents).toBe(true);
    expect(typeof marker!.hovertext).toBe('string');

    expect(label!.captureevents).toBe(false);
    expect(label!.hovertext).toBeUndefined();
    expect(label!.yshift).toBe(12);
  });

  it('should use right support altitude for RIGHT-referenced obstacle with relative altitude in 3d', () => {
    const obstacle = makeObstacle({
      altitudeType: 'relative',
      referenceSupport: ReferenceSupport.RIGHT,
      supportUuid: 'sup-1',
      positions: [{ x: 2, y: 3, z: 5 }]
    });
    // Python computes: altitude = 5 + 80 = 85, x = 50 - 2 = 48, y = 40 + 3 = 43
    const params = basePlotParams({
      obstacles: [obstacle],
      litData: makeLitData([{ uuid: 'obs-1', points: [[48, 43, 85]] }]),
      view: '3d'
    });
    const annotations = createObstaclesAnnotations(params);
    expect(annotations).toHaveLength(2);
    const marker = annotations.find((a) => (a as ObstacleAnnotation).text === '◆') as ObstacleAnnotation;
    expect(marker).toMatchObject({ x: 48, y: 43, z: 85 });
  });

  it('should use right support altitude for RIGHT-referenced obstacle with relative altitude in 2d', () => {
    const obstacle = makeObstacle({
      altitudeType: 'relative',
      referenceSupport: ReferenceSupport.RIGHT,
      supportUuid: 'sup-1',
      positions: [{ x: 2, y: 3, z: 5 }]
    });
    // Python computes: altitude = 5 + 80 = 85, x = 50 - 2 = 48.
    // In 2D profile: px = cx = 48, py = cz = 85.
    const params = basePlotParams({
      obstacles: [obstacle],
      litData: makeLitData([{ uuid: 'obs-1', points: [[48, 0, 85]] }]),
      view: '2d',
      side: 'profile'
    });
    const annotations = createObstaclesAnnotations(params);
    expect(annotations).toHaveLength(2);
    const marker = annotations.find((a) => (a as ObstacleAnnotation).text === '◆') as ObstacleAnnotation;
    expect(marker).toMatchObject({ x: 48, y: 85, z: 85 });
  });

  it('should mirror x coordinate from right support in profile view for RIGHT reference', () => {
    const obstacle = makeObstacle({
      altitudeType: 'absolute',
      referenceSupport: ReferenceSupport.RIGHT,
      supportUuid: 'sup-1',
      positions: [{ x: 5, y: 2, z: 10 }]
    });
    // Python computes: x = rightBase.x - position.x = 100 - 5 = 95
    const params = basePlotParams({
      obstacles: [obstacle],
      litData: makeLitData([{ uuid: 'obs-1', points: [[95, 2, 10]] }]),
      view: '3d'
    });
    const annotations = createObstaclesAnnotations(params);
    const marker = annotations.find((a) => (a as ObstacleAnnotation).text === '◆') as ObstacleAnnotation;
    expect(marker.x).toBe(95);
  });

  it('should use right support lateral base in 2d face view for RIGHT reference', () => {
    const obstacle = makeObstacle({
      altitudeType: 'absolute',
      referenceSupport: ReferenceSupport.RIGHT,
      supportUuid: 'sup-1',
      positions: [{ x: 1, y: 2, z: 7 }]
    });
    // Python computes: x = refBase.x + position.y = 50 + 2 = 52, altitude absolute: z = 7.
    // In 2D face: px = cy = 52, py = cz = 7.
    const params = basePlotParams({
      obstacles: [obstacle],
      litData: makeLitData([{ uuid: 'obs-1', points: [[1, 52, 7]] }]),
      view: '2d',
      side: 'face'
    });
    const annotations = createObstaclesAnnotations(params);
    const marker = annotations.find((a) => (a as ObstacleAnnotation).text === '◆') as ObstacleAnnotation;
    expect(marker).toMatchObject({ x: 52, y: 7, z: 7 });
  });

  it('should fall back to left support when RIGHT reference but no right support available', () => {
    const obstacle = makeObstacle({
      altitudeType: 'relative',
      referenceSupport: ReferenceSupport.RIGHT,
      supportUuid: 'sup-1',
      positions: [{ x: 1, y: 2, z: 3 }]
    });
    // Python computes using right support: altitude = 3 + 80 = 83, x = 50 - 1 = 49
    const params = basePlotParams({
      obstacles: [obstacle],
      litData: makeLitData([{ uuid: 'obs-1', points: [[49, 43, 83]] }]),
      view: '3d'
    });
    const annotations = createObstaclesAnnotations(params);
    expect(annotations).toHaveLength(2);
    const marker = annotations.find((a) => (a as ObstacleAnnotation).text === '◆') as ObstacleAnnotation;
    expect(marker).toMatchObject({ x: 49, z: 83 });
  });

  it('should fall back to left support when only one support data object exists', () => {
    // Python computes: rightBase = sup-3 (200, 80, 90), altitude = 10 + 90 = 100, x = 200 - 5 = 195, y = 80 + 3 = 83
    const params = basePlotParams({
      currentObstacleUuid: 'obs-edge',
      supports: [makeSupport('sup-1'), makeSupport('sup-2'), makeSupport('sup-3')],
      endSupport: 2,
      obstacles: [
        makeObstacle({
          uuid: 'obs-edge',
          supportUuid: 'sup-2',
          referenceSupport: ReferenceSupport.RIGHT,
          altitudeType: 'relative',
          positions: [{ x: 5, y: 3, z: 10 }]
        })
      ],
      litData: makeLitData([{ uuid: 'obs-edge', points: [[195, 83, 100]] }]),
      view: '3d'
    });
    const annotations = createObstaclesAnnotations(params);
    expect(annotations).toHaveLength(2);
    const marker = annotations.find((a) => (a as ObstacleAnnotation).text === '◆') as ObstacleAnnotation;
    expect(marker).toMatchObject({ x: 195, y: 83, z: 100 });
  });

  it('should use right support on a middle span with 3+ supports in 3d', () => {
    const obstacle = makeObstacle({
      altitudeType: 'relative',
      referenceSupport: ReferenceSupport.RIGHT,
      supportUuid: 'sup-2',
      positions: [{ x: 3, y: 1, z: 4 }]
    });
    // Python computes: rightBase = sup-3 (200, 40, 80), altitude = 4 + 80 = 84, x = 200 - 3 = 197, y = 40 + 1 = 41
    const params = basePlotParams({
      supports: [makeSupport('sup-1'), makeSupport('sup-2'), makeSupport('sup-3')],
      endSupport: 2,
      obstacles: [obstacle],
      litData: makeLitData([{ uuid: 'obs-1', points: [[197, 41, 84]] }]),
      view: '3d'
    });
    const annotations = createObstaclesAnnotations(params);
    expect(annotations).toHaveLength(2);
    const marker = annotations.find((a) => (a as ObstacleAnnotation).text === '◆') as ObstacleAnnotation;
    expect(marker).toMatchObject({ x: 197, y: 41, z: 84 });
  });

  it('should handle mix of LEFT and RIGHT obstacles in the same plot', () => {
    const leftObstacle = makeObstacle({
      uuid: 'obs-left',
      name: 'Left Obs',
      altitudeType: 'relative',
      referenceSupport: ReferenceSupport.LEFT,
      supportUuid: 'sup-1',
      positions: [{ x: 5, y: 2, z: 10 }]
    });
    const rightObstacle = makeObstacle({
      uuid: 'obs-right',
      name: 'Right Obs',
      altitudeType: 'relative',
      referenceSupport: ReferenceSupport.RIGHT,
      supportUuid: 'sup-1',
      positions: [{ x: 5, y: 2, z: 10 }]
    });
    // Python computes LEFT: x=5, y=2, z=40; RIGHT: x=95, y=2, z=80
    const params = basePlotParams({
      currentObstacleUuid: 'obs-left',
      obstacles: [leftObstacle, rightObstacle],
      litData: makeLitData([
        { uuid: 'obs-left', points: [[5, 2, 40]] },
        { uuid: 'obs-right', points: [[95, 2, 80]] }
      ]),
      view: '3d'
    });
    const annotations = createObstaclesAnnotations(params);
    // Both obstacles are shown: 2 obstacles × 1 position × 2 annotations = 4
    expect(annotations).toHaveLength(4);

    const leftMarker = annotations.find(
      (a: ObstacleAnnotation) => a.text === '◆' && a.data?.obstacleUuid === 'obs-left'
    ) as ObstacleAnnotation;
    const rightMarker = annotations.find(
      (a: ObstacleAnnotation) => a.text === '●' && a.data?.obstacleUuid === 'obs-right'
    ) as ObstacleAnnotation;

    expect(leftMarker).toMatchObject({ x: 5, y: 2, z: 40 });
    expect(leftMarker.font!.color).toBe('red');
    expect(rightMarker).toMatchObject({ x: 95, y: 2, z: 80 });
    expect(rightMarker.font!.color).toBe('black');
  });

  it('should use right support altitude for RIGHT reference with relative altitude in 2d face view', () => {
    const obstacle = makeObstacle({
      altitudeType: 'relative',
      referenceSupport: ReferenceSupport.RIGHT,
      supportUuid: 'sup-1',
      positions: [{ x: 1, y: 2, z: 5 }]
    });
    // Python computes: x = refBase.x + position.y = 50 + 2 = 52, altitude = 5 + 80 = 85.
    // In 2D face: px = cy = 52, py = cz = 85.
    const params = basePlotParams({
      obstacles: [obstacle],
      litData: makeLitData([{ uuid: 'obs-1', points: [[1, 52, 85]] }]),
      view: '2d',
      side: 'face'
    });
    const annotations = createObstaclesAnnotations(params);
    expect(annotations).toHaveLength(2);
    const marker = annotations.find((a) => (a as ObstacleAnnotation).text === '◆') as ObstacleAnnotation;
    expect(marker).toMatchObject({ x: 52, y: 85, z: 85 });
  });

  it('should mirror x from right support in 2d profile view with absolute altitude', () => {
    const obstacle = makeObstacle({
      altitudeType: 'absolute',
      referenceSupport: ReferenceSupport.RIGHT,
      supportUuid: 'sup-1',
      positions: [{ x: 8, y: 2, z: 15 }]
    });
    // Python computes: x = rightBase.x - position.x = 100 - 8 = 92, altitude absolute: z = 15.
    // In 2D profile: px = cx = 92, py = cz = 15.
    const params = basePlotParams({
      obstacles: [obstacle],
      litData: makeLitData([{ uuid: 'obs-1', points: [[92, 0, 15]] }]),
      view: '2d',
      side: 'profile'
    });
    const annotations = createObstaclesAnnotations(params);
    const marker = annotations.find((a) => (a as ObstacleAnnotation).text === '◆') as ObstacleAnnotation;
    expect(marker).toMatchObject({ x: 92, y: 15, z: 15 });
  });

  it('should highlight all RIGHT-referenced obstacle points in red when selected', () => {
    const obstacle = makeObstacle({
      uuid: 'obs-right',
      referenceSupport: ReferenceSupport.RIGHT,
      supportUuid: 'sup-1',
      positions: [
        { x: 1, y: 2, z: 3 },
        { x: 4, y: 5, z: 6 }
      ]
    });
    const params = basePlotParams({
      obstacles: [obstacle],
      litData: makeLitData([
        {
          uuid: 'obs-right',
          points: [
            [99, 0, 0],
            [96, 0, 0]
          ]
        }
      ]),
      currentObstacleUuid: 'obs-right',
      currentObstaclePointIndex: 0
    });
    const annotations = createObstaclesAnnotations(params);
    expect(annotations).toHaveLength(4);
    // point 0 is the active point — diamond
    const marker0 = annotations.find(
      (a: ObstacleAnnotation) => a.text === '◆' && a.data?.obstaclePositionIndex === 0
    ) as ObstacleAnnotation;
    // point 1 is a non-active point of the selected obstacle — open circle
    const marker1 = annotations.find(
      (a: ObstacleAnnotation) => a.text === '○' && a.data?.obstaclePositionIndex === 1
    ) as ObstacleAnnotation;
    // Active point uses active color, non-active uses inactive color
    expect(marker0.font!.color).toBe('red');
    expect(marker1.font!.color).toBe('#922911');
  });

  it('should place obstacle at right support when position.x is 0', () => {
    const obstacle = makeObstacle({
      altitudeType: 'absolute',
      referenceSupport: ReferenceSupport.RIGHT,
      supportUuid: 'sup-1',
      positions: [{ x: 0, y: 0, z: 10 }]
    });
    // Python computes: x = rightBase.x - 0 = 100
    const params = basePlotParams({
      obstacles: [obstacle],
      litData: makeLitData([{ uuid: 'obs-1', points: [[100, 0, 10]] }]),
      view: '3d'
    });
    const annotations = createObstaclesAnnotations(params);
    const marker = annotations.find((a) => (a as ObstacleAnnotation).text === '◆') as ObstacleAnnotation;
    expect(marker.x).toBe(100);
  });

  it('should compute all positions of a RIGHT-referenced obstacle with multiple points', () => {
    const obstacle = makeObstacle({
      altitudeType: 'absolute',
      referenceSupport: ReferenceSupport.RIGHT,
      supportUuid: 'sup-1',
      positions: [
        { x: 10, y: 1, z: 5 },
        { x: 20, y: 2, z: 8 },
        { x: 30, y: 3, z: 12 }
      ]
    });
    // Python computes: x = 200 - position.x for each point
    const params = basePlotParams({
      obstacles: [obstacle],
      litData: makeLitData([
        {
          uuid: 'obs-1',
          points: [
            [190, 1, 5],
            [180, 2, 8],
            [170, 3, 12]
          ]
        }
      ]),
      view: '3d'
    });
    const annotations = createObstaclesAnnotations(params);
    // 3 positions × 2 annotations = 6
    expect(annotations).toHaveLength(6);

    // marker symbols: point 0 is active (○), points 1 and 2 are non-active (◆)
    const markers = annotations.filter((a: ObstacleAnnotation) => a.captureevents) as ObstacleAnnotation[];
    expect(markers[0]).toMatchObject({ x: 190, y: 1, z: 5 });
    expect(markers[1]).toMatchObject({ x: 180, y: 2, z: 8 });
    expect(markers[2]).toMatchObject({ x: 170, y: 3, z: 12 });
  });
});
