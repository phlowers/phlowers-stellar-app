import { Obstacle, Position3D, ReferenceSupport } from '@shared/domain/models/obstacle.model';
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
  showarrow: false,
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

const computeAnnotationCoords = (
  base: Coordinates,
  obstacle: Obstacle,
  position: Position3D,
  side: string,
  is2d: boolean,
  rightBase?: Coordinates
): Coordinates => {
  // Z meaning depends on altitudeType:
  // - 'relative': position.z is a delta from the reference support altitude
  // - 'absolute': position.z is an NGF altitude (referenced to 0)
  const isAbsoluteAltitude = obstacle.altitudeType === 'absolute';
  const isRightReference = obstacle.referenceSupport === ReferenceSupport.RIGHT;

  // Choose which support base to use for altitude and lateral positioning.
  // When the obstacle references the RIGHT support and its coordinates are
  // available, use the right support; otherwise fall back to the left (base).
  const refBase = isRightReference && rightBase ? rightBase : base;

  // In 2D plots, Plotly's vertical axis is `y` and represents altitude (NGF).
  // The support altitude in plot-coordinates is stored in `refBase.y`.
  // In 3D plots, altitude is `z` and stored in `refBase.z`.
  const supportAltitudeNgf = is2d ? refBase.y : refBase.z;
  const altitudeNgf = (position.z ?? 0) + (isAbsoluteAltitude ? 0 : supportAltitudeNgf);

  // Compute X coordinate based on view/side and reference support direction.
  // In profile view, position.x = distance along span from the reference support.
  // In face view, position.y = lateral distance from the line axis.
  let x: number;
  if (is2d && side === 'face') {
    x = refBase.x + (position.y ?? 0);
  } else if (isRightReference && rightBase) {
    // Distance is measured from the right support; subtract to get plot position.
    x = rightBase.x - (position.x ?? 0);
  } else {
    x = base.x + (position.x ?? 0);
  }

  const y = is2d ? altitudeNgf : refBase.y + (position.y ?? 0);
  const z = altitudeNgf;
  return { x, y, z };
};

const getHighlightColor = (
  obstacleUuid: string,
  positionIndex: number,
  currentObstacleUuid: string | null,
  currentObstaclePointIndex: number
): string => (obstacleUuid === currentObstacleUuid && positionIndex === currentObstaclePointIndex ? 'red' : 'black');

const createPositionAnnotations = (
  obstacle: Obstacle,
  positionIndex: number,
  position: Position3D,
  coords: Coordinates,
  color: string
): Partial<Plotly.Annotations>[] => {
  const hovertext = `ref. support dist.: ${(position.x ?? 0).toFixed(2)}m<br />line axis dist.: ${(position.y ?? 0).toFixed(2)}m<br />point alt.: ${coords.z.toFixed(2)}m`;
  const data = {
    obstacleUuid: obstacle.uuid,
    obstaclePositionIndex: positionIndex,
    type: 'obstacle' as const
  };

  // Dot marker at the exact coordinates
  const marker =
    // z and data are non-standard Plotly annotation properties used for 3D rendering and event handling
    {
      ...BASE_ANNOTATION,
      x: coords.x,
      y: coords.y,
      z: coords.z,
      text: '●',
      font: { ...BASE_ANNOTATION.font, color, size: 14 },
      hovertext,
      data
    } as Partial<Plotly.Annotations>;

  // Label just above the point (no arrow)
  const label = {
    ...BASE_ANNOTATION,
    x: coords.x,
    y: coords.y,
    z: coords.z,
    text: obstacle.name,
    yshift: 12,
    font: { ...BASE_ANNOTATION.font, color },
    captureevents: false,
    data
  } as Partial<Plotly.Annotations>;

  return [marker, label];
};

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

  // Get all support objects (including the last one, needed as right-side reference)
  const allSupportObjects = dataObjects.filter((dataObject) => dataObject.name === 'supports');
  // Exclude the last support — it should not own obstacles (left-support list)
  const leftSupportObjects = allSupportObjects.slice(0, -1);

  const supportByUuid = new Map(leftSupportObjects.map((s) => [s.supportUuid, s]));

  const relevantObstacles = obstacles.filter((o) => supportByUuid.has(o.supportUuid));

  return relevantObstacles.flatMap((obstacle) => {
    const supportObject = supportByUuid.get(obstacle.supportUuid);
    if (!supportObject) return [];

    const base = getBaseCoordinates(supportObject);

    // Resolve the right (next) support of this span so RIGHT-referenced
    // obstacles can use its altitude and position as the reference point.
    const leftIndex = allSupportObjects.indexOf(supportObject);
    const rightSupportObject =
      leftIndex >= 0 && leftIndex + 1 < allSupportObjects.length ? allSupportObjects[leftIndex + 1] : undefined;
    const rightBase = rightSupportObject ? getBaseCoordinates(rightSupportObject) : undefined;

    return obstacle.positions.flatMap((position, index) => {
      if (!isValidPosition(position)) return [];
      const coords = computeAnnotationCoords(base, obstacle, position, side, is2d, rightBase);
      const color = getHighlightColor(obstacle.uuid, index, currentObstacleUuid, currentObstaclePointIndex);
      return createPositionAnnotations(obstacle, index, position, coords, color);
    });
  });
};
