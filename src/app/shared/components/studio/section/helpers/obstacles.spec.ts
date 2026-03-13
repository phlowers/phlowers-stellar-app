import { LateralDistanceType, Obstacle, ReferenceSupport } from '@core/domain/models/obstacle.model';
import {
  ObstacleAnnotationData,
  getObstacleClickPayload,
  appendExistingObstaclesWithFormObstacle,
  createObstaclesAnnotations
} from './obstacles';
import { CreatePlotParams } from './createPlot';
import { DataObject } from './createPlotDataObject';

const makeObstacle = (overrides: Partial<Obstacle> = {}): Obstacle => ({
  uuid: 'obs-1',
  supportUuid: 'sup-1',
  name: 'Obstacle 1',
  type: 'tree',
  altitudeType: 'absolute',
  referenceSupport: ReferenceSupport.LEFT,
  lateralDistanceType: LateralDistanceType.SPAN_AXIS,
  positions: [{ x: 1, y: 2, z: 3 }],
  ...overrides
});

const makeSupport = (uuid: string) => ({ uuid });

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
    currentObstacleUuid: null,
    currentObstaclePointIndex: 0,
    ...overrides
  });

  it('should return empty array when there are no obstacles', () => {
    const params = basePlotParams({
      data: [makeSupportDataObject('sup-1', 0, 0, 0), makeSupportDataObject('sup-2', 10, 0, 0)]
    });
    expect(createObstaclesAnnotations(params)).toEqual([]);
  });

  it('should return empty array when obstacle support is the last support (excluded)', () => {
    const obstacle = makeObstacle({ supportUuid: 'sup-2' });
    const params = basePlotParams({
      data: [makeSupportDataObject('sup-1', 0, 0, 0), makeSupportDataObject('sup-2', 10, 0, 0)],
      obstacles: [obstacle]
    });
    // sup-2 is the last support and should be sliced off
    expect(createObstaclesAnnotations(params)).toEqual([]);
  });

  it('should create annotation for obstacle with valid position in 3d', () => {
    const obstacle = makeObstacle({
      supportUuid: 'sup-1',
      positions: [{ x: 1, y: 2, z: 3 }]
    });
    const params = basePlotParams({
      data: [makeSupportDataObject('sup-1', 10, 20, 30), makeSupportDataObject('sup-2', 50, 50, 50)],
      obstacles: [obstacle],
      view: '3d'
    });
    const annotations = createObstaclesAnnotations(params);
    expect(annotations).toHaveLength(2);
    const marker = annotations.find((a) => (a as any).text === '●') as any;
    const label = annotations.find((a) => (a as any).text === 'Obstacle 1') as any;
    expect(marker).toMatchObject({ x: 11, y: 22, z: 3 });
    expect(label).toMatchObject({ x: 11, y: 22, z: 3, text: 'Obstacle 1' });
  });

  it('should add support altitude to z when altitudeType is relative', () => {
    const obstacle = makeObstacle({
      altitudeType: 'relative',
      supportUuid: 'sup-1',
      positions: [{ x: 1, y: 2, z: 3 }]
    });
    const params = basePlotParams({
      data: [makeSupportDataObject('sup-1', 10, 20, 30), makeSupportDataObject('sup-2', 50, 50, 50)],
      obstacles: [obstacle],
      view: '3d'
    });
    const annotations = createObstaclesAnnotations(params);
    expect(annotations).toHaveLength(2);
    const marker = annotations.find((a) => (a as any).text === '●') as any;
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
    const params = basePlotParams({
      data: [makeSupportDataObject('sup-1', 0, 0, 0), makeSupportDataObject('sup-2', 10, 0, 0)],
      obstacles: [obstacle]
    });
    const annotations = createObstaclesAnnotations(params);
    expect(annotations).toHaveLength(2);
  });

  it('should highlight current obstacle position in red', () => {
    const obstacle = makeObstacle({
      supportUuid: 'sup-1',
      positions: [
        { x: 1, y: 2, z: 3 },
        { x: 4, y: 5, z: 6 }
      ]
    });
    const params = basePlotParams({
      data: [makeSupportDataObject('sup-1', 0, 0, 0), makeSupportDataObject('sup-2', 10, 0, 0)],
      obstacles: [obstacle],
      currentObstacleUuid: 'obs-1',
      currentObstaclePointIndex: 1
    });
    const annotations = createObstaclesAnnotations(params);
    // 2 points => 4 annotations (marker + label for each)
    expect(annotations).toHaveLength(4);
    const marker0 = annotations.find((a: any) => a.text === '●' && a.data?.obstaclePositionIndex === 0) as any;
    const marker1 = annotations.find((a: any) => a.text === '●' && a.data?.obstaclePositionIndex === 1) as any;
    expect(marker0.font.color).toBe('black');
    expect(marker1.font.color).toBe('red');
  });

  it('should use z-based y coordinate in 2d face view', () => {
    const obstacle = makeObstacle({
      supportUuid: 'sup-1',
      positions: [{ x: 1, y: 2, z: 3 }]
    });
    const params = basePlotParams({
      // In 2D plots, support altitude (NGF) is stored in the DataObject's y coordinate
      data: [makeSupportDataObject('sup-1', 10, 30, 0), makeSupportDataObject('sup-2', 50, 50, 0)],
      obstacles: [obstacle],
      view: '2d',
      side: 'face'
    });
    const annotations = createObstaclesAnnotations(params);
    expect(annotations).toHaveLength(2);
    // In 2d face view, y is the vertical axis (altitude). In absolute mode, it's the raw NGF altitude.
    const marker = annotations.find((a) => (a as any).text === '●') as any;
    expect(marker).toMatchObject({ x: 12, y: 3, z: 3 });
  });

  it('should add support altitude in 2d when altitudeType is relative', () => {
    const obstacle = makeObstacle({
      altitudeType: 'relative',
      supportUuid: 'sup-1',
      positions: [{ x: 1, y: 2, z: 3 }]
    });
    const params = basePlotParams({
      data: [makeSupportDataObject('sup-1', 10, 30, 0), makeSupportDataObject('sup-2', 50, 50, 0)],
      obstacles: [obstacle],
      view: '2d',
      side: 'face'
    });
    const annotations = createObstaclesAnnotations(params);
    expect(annotations).toHaveLength(2);
    // In 2D, support altitude is carried by base.y (not base.z)
    const marker = annotations.find((a) => (a as any).text === '●') as any;
    expect(marker).toMatchObject({ x: 12, y: 33, z: 33 });
  });

  it('should include annotation data for event handling', () => {
    const obstacle = makeObstacle({
      supportUuid: 'sup-1',
      positions: [{ x: 1, y: 2, z: 3 }]
    });
    const params = basePlotParams({
      data: [makeSupportDataObject('sup-1', 0, 0, 0), makeSupportDataObject('sup-2', 10, 0, 0)],
      obstacles: [obstacle]
    });
    const annotations = createObstaclesAnnotations(params);
    const marker = annotations.find((a) => (a as any).text === '●') as any;
    const label = annotations.find((a) => (a as any).text === 'Obstacle 1') as any;
    expect(marker.data).toEqual({ obstacleUuid: 'obs-1', obstaclePositionIndex: 0, type: 'obstacle' });
    expect(label.data).toEqual({ obstacleUuid: 'obs-1', obstaclePositionIndex: 0, type: 'obstacle' });
  });

  it('should show tooltip only on marker (not on label)', () => {
    const obstacle = makeObstacle({
      supportUuid: 'sup-1',
      positions: [{ x: 1, y: 2, z: 3 }]
    });
    const params = basePlotParams({
      data: [makeSupportDataObject('sup-1', 10, 20, 30), makeSupportDataObject('sup-2', 50, 50, 50)],
      obstacles: [obstacle],
      view: '3d'
    });

    const annotations = createObstaclesAnnotations(params) as any[];
    const marker = annotations.find((a) => a.text === '●');
    const label = annotations.find((a) => a.text === 'Obstacle 1');

    expect(marker.captureevents).toBe(true);
    expect(typeof marker.hovertext).toBe('string');

    expect(label.captureevents).toBe(false);
    expect(label.hovertext).toBeUndefined();
    expect(label.yshift).toBe(12);
  });

  it('should use right support altitude for RIGHT-referenced obstacle with relative altitude in 3d', () => {
    const obstacle = makeObstacle({
      altitudeType: 'relative',
      referenceSupport: ReferenceSupport.RIGHT,
      supportUuid: 'sup-1',
      positions: [{ x: 2, y: 3, z: 5 }]
    });
    const params = basePlotParams({
      data: [makeSupportDataObject('sup-1', 10, 20, 30), makeSupportDataObject('sup-2', 50, 40, 80)],
      obstacles: [obstacle],
      view: '3d'
    });
    const annotations = createObstaclesAnnotations(params);
    expect(annotations).toHaveLength(2);
    const marker = annotations.find((a) => (a as any).text === '●') as any;
    // altitude = position.z + rightBase.z = 5 + 80 = 85
    // x = rightBase.x - position.x = 50 - 2 = 48
    // y = rightBase.y + position.y = 40 + 3 = 43
    expect(marker).toMatchObject({ x: 48, y: 43, z: 85 });
  });

  it('should use right support altitude for RIGHT-referenced obstacle with relative altitude in 2d', () => {
    const obstacle = makeObstacle({
      altitudeType: 'relative',
      referenceSupport: ReferenceSupport.RIGHT,
      supportUuid: 'sup-1',
      positions: [{ x: 2, y: 3, z: 5 }]
    });
    const params = basePlotParams({
      data: [makeSupportDataObject('sup-1', 10, 30, 0), makeSupportDataObject('sup-2', 50, 80, 0)],
      obstacles: [obstacle],
      view: '2d',
      side: 'profile'
    });
    const annotations = createObstaclesAnnotations(params);
    expect(annotations).toHaveLength(2);
    const marker = annotations.find((a) => (a as any).text === '●') as any;
    // altitude = position.z + rightBase.y (2D) = 5 + 80 = 85
    // x = rightBase.x - position.x = 50 - 2 = 48
    expect(marker).toMatchObject({ x: 48, y: 85, z: 85 });
  });

  it('should mirror x coordinate from right support in profile view for RIGHT reference', () => {
    const obstacle = makeObstacle({
      altitudeType: 'absolute',
      referenceSupport: ReferenceSupport.RIGHT,
      supportUuid: 'sup-1',
      positions: [{ x: 5, y: 2, z: 10 }]
    });
    const params = basePlotParams({
      data: [makeSupportDataObject('sup-1', 0, 0, 0), makeSupportDataObject('sup-2', 100, 0, 0)],
      obstacles: [obstacle],
      view: '3d'
    });
    const annotations = createObstaclesAnnotations(params);
    const marker = annotations.find((a) => (a as any).text === '●') as any;
    // x = rightBase.x - position.x = 100 - 5 = 95
    expect(marker.x).toBe(95);
  });

  it('should use right support lateral base in 2d face view for RIGHT reference', () => {
    const obstacle = makeObstacle({
      altitudeType: 'absolute',
      referenceSupport: ReferenceSupport.RIGHT,
      supportUuid: 'sup-1',
      positions: [{ x: 1, y: 2, z: 7 }]
    });
    const params = basePlotParams({
      data: [makeSupportDataObject('sup-1', 10, 30, 0), makeSupportDataObject('sup-2', 50, 80, 0)],
      obstacles: [obstacle],
      view: '2d',
      side: 'face'
    });
    const annotations = createObstaclesAnnotations(params);
    const marker = annotations.find((a) => (a as any).text === '●') as any;
    // face view: x = refBase.x + position.y = 50 + 2 = 52
    // altitude absolute: y = z = 7
    expect(marker).toMatchObject({ x: 52, y: 7, z: 7 });
  });

  it('should fall back to left support when RIGHT reference but no right support available', () => {
    const obstacle = makeObstacle({
      altitudeType: 'relative',
      referenceSupport: ReferenceSupport.RIGHT,
      supportUuid: 'sup-1',
      positions: [{ x: 1, y: 2, z: 3 }]
    });
    // Only two supports: sup-1 is the left support of the last span.
    // Since slice(0, -1) removes the last support, only sup-1 is left.
    // The right support (sup-2) is the last one, so it's still in allSupportObjects.
    const params = basePlotParams({
      data: [makeSupportDataObject('sup-1', 10, 20, 30), makeSupportDataObject('sup-2', 50, 40, 80)],
      obstacles: [obstacle],
      view: '3d'
    });
    const annotations = createObstaclesAnnotations(params);
    expect(annotations).toHaveLength(2);
    const marker = annotations.find((a) => (a as any).text === '●') as any;
    // Right support IS available (sup-2 is in allSupportObjects even though excluded from left-support list)
    // altitude = position.z + rightBase.z = 3 + 80 = 83
    // x = rightBase.x - position.x = 50 - 1 = 49
    expect(marker).toMatchObject({ x: 49, z: 83 });
  });

  it('should fall back to left support when only one support data object exists', () => {
    // Two supports but sup-1 is at index 0 and no next support exists beyond it.
    // We need at least 2 supports for sup-1 to not be sliced off.
    // With only one non-terminal support, the right support cannot be resolved
    // from allSupportObjects beyond leftIndex.
    // Actually, with 2 supports, sup-2 at index 1 IS the right support.
    // To truly have no right support, we need 3 supports and test the second span.
    const params = basePlotParams({
      data: [
        makeSupportDataObject('sup-1', 0, 0, 0),
        makeSupportDataObject('sup-2', 100, 50, 60),
        makeSupportDataObject('sup-3', 200, 80, 90)
      ],
      // sup-2 is the left support of the last span (sup-2 → sup-3)
      // sup-3 is the right support of that span — it IS in allSupportObjects
      obstacles: [
        makeObstacle({
          uuid: 'obs-edge',
          supportUuid: 'sup-2',
          referenceSupport: ReferenceSupport.RIGHT,
          altitudeType: 'relative',
          positions: [{ x: 5, y: 3, z: 10 }]
        })
      ],
      view: '3d'
    });
    const annotations = createObstaclesAnnotations(params);
    expect(annotations).toHaveLength(2);
    const marker = annotations.find((a) => (a as any).text === '●') as any;
    // rightBase = sup-3: (200, 80, 90)
    // altitude = 10 + 90 = 100, x = 200 - 5 = 195, y = 80 + 3 = 83
    expect(marker).toMatchObject({ x: 195, y: 83, z: 100 });
  });

  it('should use right support on a middle span with 3+ supports in 3d', () => {
    const obstacle = makeObstacle({
      altitudeType: 'relative',
      referenceSupport: ReferenceSupport.RIGHT,
      supportUuid: 'sup-2',
      positions: [{ x: 3, y: 1, z: 4 }]
    });
    const params = basePlotParams({
      data: [
        makeSupportDataObject('sup-1', 0, 0, 10),
        makeSupportDataObject('sup-2', 100, 20, 50),
        makeSupportDataObject('sup-3', 200, 40, 80),
        makeSupportDataObject('sup-4', 300, 60, 120)
      ],
      obstacles: [obstacle],
      view: '3d'
    });
    const annotations = createObstaclesAnnotations(params);
    expect(annotations).toHaveLength(2);
    const marker = annotations.find((a) => (a as any).text === '●') as any;
    // rightBase = sup-3: (200, 40, 80)
    // altitude = 4 + 80 = 84, x = 200 - 3 = 197, y = 40 + 1 = 41
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
    const params = basePlotParams({
      data: [makeSupportDataObject('sup-1', 0, 0, 30), makeSupportDataObject('sup-2', 100, 0, 70)],
      obstacles: [leftObstacle, rightObstacle],
      view: '3d'
    });
    const annotations = createObstaclesAnnotations(params);
    // 2 obstacles × 1 position × 2 annotations each = 4
    expect(annotations).toHaveLength(4);

    const leftMarker = annotations.find((a: any) => a.text === '●' && a.data?.obstacleUuid === 'obs-left') as any;
    const rightMarker = annotations.find((a: any) => a.text === '●' && a.data?.obstacleUuid === 'obs-right') as any;

    // LEFT: x = 0 + 5 = 5, y = 0 + 2 = 2, z = 10 + 30 = 40
    expect(leftMarker).toMatchObject({ x: 5, y: 2, z: 40 });
    // RIGHT: x = 100 - 5 = 95, y = 0 + 2 = 2, z = 10 + 70 = 80
    expect(rightMarker).toMatchObject({ x: 95, y: 2, z: 80 });
  });

  it('should use right support altitude for RIGHT reference with relative altitude in 2d face view', () => {
    const obstacle = makeObstacle({
      altitudeType: 'relative',
      referenceSupport: ReferenceSupport.RIGHT,
      supportUuid: 'sup-1',
      positions: [{ x: 1, y: 2, z: 5 }]
    });
    const params = basePlotParams({
      data: [makeSupportDataObject('sup-1', 10, 30, 0), makeSupportDataObject('sup-2', 50, 80, 0)],
      obstacles: [obstacle],
      view: '2d',
      side: 'face'
    });
    const annotations = createObstaclesAnnotations(params);
    expect(annotations).toHaveLength(2);
    const marker = annotations.find((a) => (a as any).text === '●') as any;
    // face + RIGHT: x = refBase.x + position.y = 50 + 2 = 52
    // altitude relative 2D: supportAltitudeNgf = refBase.y = 80, altitude = 5 + 80 = 85
    expect(marker).toMatchObject({ x: 52, y: 85, z: 85 });
  });

  it('should mirror x from right support in 2d profile view with absolute altitude', () => {
    const obstacle = makeObstacle({
      altitudeType: 'absolute',
      referenceSupport: ReferenceSupport.RIGHT,
      supportUuid: 'sup-1',
      positions: [{ x: 8, y: 2, z: 15 }]
    });
    const params = basePlotParams({
      data: [makeSupportDataObject('sup-1', 0, 30, 0), makeSupportDataObject('sup-2', 100, 80, 0)],
      obstacles: [obstacle],
      view: '2d',
      side: 'profile'
    });
    const annotations = createObstaclesAnnotations(params);
    const marker = annotations.find((a) => (a as any).text === '●') as any;
    // profile + RIGHT: x = rightBase.x - position.x = 100 - 8 = 92
    // altitude absolute 2D: y = z = 15
    expect(marker).toMatchObject({ x: 92, y: 15, z: 15 });
  });

  it('should highlight RIGHT-referenced obstacle position in red when selected', () => {
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
      data: [makeSupportDataObject('sup-1', 0, 0, 0), makeSupportDataObject('sup-2', 100, 0, 0)],
      obstacles: [obstacle],
      currentObstacleUuid: 'obs-right',
      currentObstaclePointIndex: 0
    });
    const annotations = createObstaclesAnnotations(params);
    expect(annotations).toHaveLength(4);
    const marker0 = annotations.find((a: any) => a.text === '●' && a.data?.obstaclePositionIndex === 0) as any;
    const marker1 = annotations.find((a: any) => a.text === '●' && a.data?.obstaclePositionIndex === 1) as any;
    expect(marker0.font.color).toBe('red');
    expect(marker1.font.color).toBe('black');
  });

  it('should place obstacle at right support when position.x is 0', () => {
    const obstacle = makeObstacle({
      altitudeType: 'absolute',
      referenceSupport: ReferenceSupport.RIGHT,
      supportUuid: 'sup-1',
      positions: [{ x: 0, y: 0, z: 10 }]
    });
    const params = basePlotParams({
      data: [makeSupportDataObject('sup-1', 0, 0, 0), makeSupportDataObject('sup-2', 100, 50, 60)],
      obstacles: [obstacle],
      view: '3d'
    });
    const annotations = createObstaclesAnnotations(params);
    const marker = annotations.find((a) => (a as any).text === '●') as any;
    // x = rightBase.x - 0 = 100
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
    const params = basePlotParams({
      data: [makeSupportDataObject('sup-1', 0, 0, 0), makeSupportDataObject('sup-2', 200, 0, 0)],
      obstacles: [obstacle],
      view: '3d'
    });
    const annotations = createObstaclesAnnotations(params);
    // 3 positions × 2 annotations = 6
    expect(annotations).toHaveLength(6);

    const markers = annotations.filter((a: any) => a.text === '●') as any[];
    // x = 200 - position.x for each
    expect(markers[0]).toMatchObject({ x: 190, y: 1, z: 5 });
    expect(markers[1]).toMatchObject({ x: 180, y: 2, z: 8 });
    expect(markers[2]).toMatchObject({ x: 170, y: 3, z: 12 });
  });
});
