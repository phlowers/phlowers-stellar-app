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
});
