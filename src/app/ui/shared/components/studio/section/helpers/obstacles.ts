import { Obstacle, Position3D } from '@core/domain/models/obstacle.model';
import { CreatePlotParams } from './createPlot';
import { DataObject } from './createPlotDataObject';

/**
 * Data payload attached to a Plotly obstacle annotation for click event handling.
 * @category Studio
 */
export interface ObstacleAnnotationData {
  /** Discriminator indicating this annotation represents an obstacle. */
  type: 'obstacle';
  /** UUID of the associated obstacle. */
  obstacleUuid: string;
  /** Index of the obstacle position point this annotation represents. */
  obstaclePositionIndex: number;
}

/**
 * Payload returned when a user clicks on an obstacle annotation in the plot.
 * @category Studio
 */
export interface ObstacleClickPayload {
  /** The full obstacle model that was clicked. */
  obstacle: Obstacle;
  /** Zero-based index of the support the obstacle is attached to. */
  supportIndex: number;
  /** Index of the specific obstacle position point that was clicked. */
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
  const supportIndex = supports.findIndex((s) => s.uuid === obstacle.supportUuid);
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

/**
 * Merges a form-edited obstacle into the existing obstacles array.
 * If the obstacle already exists (by UUID), it is replaced; otherwise it is appended.
 * Returns the original array unchanged if `formObstacle` is `null` or has no UUID.
 * @category Studio
 * @param existingObstacles - The current list of obstacles.
 * @param formObstacle - The obstacle from the form to merge, or `null`.
 * @returns A new array with the form obstacle merged in.
 */
export const appendExistingObstaclesWithFormObstacle = (
  existingObstacles: Obstacle[],
  formObstacle: Obstacle | null
): Obstacle[] => {
  if (!formObstacle || !formObstacle.uuid) {
    return existingObstacles;
  }
  const existingIndex = existingObstacles.findIndex((obstacle) => obstacle.uuid === formObstacle.uuid);
  if (existingIndex === -1) {
    return [...existingObstacles, formObstacle];
  }
  const remaining = existingObstacles.filter((obstacle) => obstacle.uuid !== formObstacle.uuid);
  return [...remaining, formObstacle];
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

const computeAnnotationCoords = (base: Coordinates, position: Position3D, side: string, is2d: boolean): Coordinates => {
  const x = base.x + (position.x ?? 0);
  const z = base.z + (position.z ?? 0);
  const y = side === 'face' && is2d ? base.z + (position.z ?? 0) : base.y + (position.y ?? 0);
  return { x, y, z };
};

const getHighlightColor = (
  obstacleUuid: string,
  positionIndex: number,
  currentObstacleUuid: string | null,
  currentObstaclePointIndex: number
): string => (obstacleUuid === currentObstacleUuid && positionIndex === currentObstaclePointIndex ? 'red' : 'black');

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

/**
 * Creates Plotly annotation objects for all valid obstacle positions in the current plot view.
 * Each annotation is positioned relative to its parent support and color-highlighted
 * when it matches the currently selected obstacle point.
 * @category Studio
 * @param plotParams - The plot parameters including obstacles, data objects, view, and selection state.
 * @returns An array of partial Plotly annotation objects representing obstacles.
 */
export const createObstaclesAnnotations = (plotParams: CreatePlotParams): Partial<Plotly.Annotations>[] => {
  const { obstacles, data: dataObjects, view, side, currentObstacleUuid, currentObstaclePointIndex } = plotParams;
  const is2d = view === '2d';

  // Exclude the last support — it should not display obstacles
  const supportObjects = dataObjects.filter((dataObject) => dataObject.name === 'supports').slice(0, -1);

  const supportByUuid = new Map(supportObjects.map((s) => [s.supportUuid, s]));

  const relevantObstacles = obstacles.filter((o) => supportByUuid.has(o.supportUuid));

  return relevantObstacles.flatMap((obstacle) => {
    const supportObject = supportByUuid.get(obstacle.supportUuid);
    if (!supportObject) return [];

    const base = getBaseCoordinates(supportObject);

    return obstacle.positions
      .map((position, index) => ({ position, index }))
      .filter(({ position }) => isValidPosition(position))
      .map(({ position, index }) => {
        const coords = computeAnnotationCoords(base, position, side, is2d);
        const color = getHighlightColor(obstacle.uuid, index, currentObstacleUuid, currentObstaclePointIndex);
        return createPositionAnnotation(obstacle, index, coords, color);
      });
  });
};
