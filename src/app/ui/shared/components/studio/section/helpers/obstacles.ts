import { Obstacle, Position3D } from '@core/domain/models/obstacle.model';
import { CreatePlotParams } from './createPlot';
import { DataObject } from './createPlotDataObject';

export interface ObstacleAnnotationData {
  type: 'obstacle';
  obstacleUuid: string;
  obstaclePositionIndex: number;
}

export interface ObstacleClickPayload {
  obstacle: Obstacle;
  supportIndex: number;
  obstaclePositionIndex: number;
}

/** Parses plotly annotation click data and resolves obstacle + support index. Returns null if invalid. */
export const getObstacleClickPayload = (
  data: ObstacleAnnotationData | undefined,
  obstacles: Obstacle[],
  supports: { uuid: string }[]
): ObstacleClickPayload | null => {
  if (!data || data.type !== 'obstacle' || data.obstacleUuid == null) {
    return null;
  }
  const obstacle = obstacles.find((o) => o.uuid === data.obstacleUuid);
  if (!obstacle) return null;
  const supportIndex = supports.findIndex(
    (s) => s.uuid === obstacle.supportUuid
  );
  if (supportIndex < 0) return null;
  return {
    obstacle,
    supportIndex,
    obstaclePositionIndex: data.obstaclePositionIndex ?? 0
  };
};

const BASE_ANNOTATION: Partial<Plotly.Annotations> = {
  showarrow: true,
  arrowhead: 6,
  arrowwidth: 0,
  standoff: 20,
  font: {
    color: 'black',
    size: 10
  },
  captureevents: true
};

export const appendExistingObstaclesWithFormObstacle = (
  existingObstacles: Obstacle[],
  formObstacle: Obstacle | null
): Obstacle[] => {
  if (!formObstacle?.uuid) {
    return existingObstacles;
  }
  return [
    ...existingObstacles.filter(
      (obstacle) => obstacle.uuid !== formObstacle.uuid
    ),
    formObstacle
  ];
};

interface Coordinates {
  x: number;
  y: number;
  z: number;
}

const getBaseCoordinates = (supportObject: DataObject): Coordinates => {
  const data = supportObject as Record<string, unknown>;
  return {
    x: (data['x'] as number[])?.[0] ?? 0,
    y: (data['y'] as number[])?.[0] ?? 0,
    z: (data['z'] as number[])?.[0] ?? 0
  };
};

const isValidPosition = (position: Position3D): boolean =>
  position.x !== null && position.y !== null && position.z !== null;

const computeAnnotationCoords = (
  base: Coordinates,
  position: Position3D,
  side: string,
  is2d: boolean
): Coordinates => {
  const x = base.x + (position.x ?? 0);
  const z = base.z + (position.z ?? 0);
  const y =
    side === 'face' && is2d
      ? base.z + (position.z ?? 0)
      : base.y + (position.y ?? 0);
  return { x, y, z };
};

const getHighlightColor = (
  obstacleUuid: string,
  positionIndex: number,
  currentObstacleUuid: string | null,
  currentObstaclePointIndex: number
): string =>
  obstacleUuid === currentObstacleUuid &&
  positionIndex === currentObstaclePointIndex
    ? 'red'
    : 'black';

const createPositionAnnotation = (
  obstacle: Obstacle,
  positionIndex: number,
  coords: Coordinates,
  color: string
): Partial<Plotly.Annotations> =>
  // z and data are non-standard Plotly annotation properties used for 3D rendering and event handling
  ({
    ...BASE_ANNOTATION,
    x: coords.x,
    y: coords.y,
    z: coords.z,
    text: obstacle.name,
    font: { ...BASE_ANNOTATION.font, color },
    arrowcolor: color,
    hovertext: `dist. supp. réf: ${coords.x.toFixed(2)}m<br />dist. axe. ligne: ${coords.y.toFixed(2)}m<br />alt. point: ${coords.z.toFixed(2)}m`,
    data: {
      obstacleUuid: obstacle.uuid,
      obstaclePositionIndex: positionIndex,
      type: 'obstacle' as const
    }
  }) as Partial<Plotly.Annotations>;

export const createObstaclesAnnotations = (
  plotParams: CreatePlotParams
): Partial<Plotly.Annotations>[] => {
  const {
    obstacles,
    data: dataObjects,
    view,
    side,
    currentObstacleUuid,
    currentObstaclePointIndex
  } = plotParams;
  const is2d = view === '2d';

  // Exclude the last support — it should not display obstacles
  const supportObjects = dataObjects
    .filter((dataObject) => dataObject.name === 'supports')
    .slice(0, -1);

  const supportByUuid = new Map(supportObjects.map((s) => [s.supportUuid, s]));

  const relevantObstacles = obstacles.filter((o) =>
    supportByUuid.has(o.supportUuid)
  );

  return relevantObstacles.flatMap((obstacle) => {
    const supportObject = supportByUuid.get(obstacle.supportUuid);
    if (!supportObject) return [];

    const base = getBaseCoordinates(supportObject);

    return obstacle.positions
      .map((position, index) => ({ position, index }))
      .filter(({ position }) => isValidPosition(position))
      .map(({ position, index }) => {
        const coords = computeAnnotationCoords(base, position, side, is2d);
        const color = getHighlightColor(
          obstacle.uuid,
          index,
          currentObstacleUuid,
          currentObstaclePointIndex
        );
        return createPositionAnnotation(obstacle, index, coords, color);
      });
  });
};
