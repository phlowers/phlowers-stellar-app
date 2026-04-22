import { Obstacle } from '@shared/domain/models/obstacle.model';
import { CreatePlotParams } from './createPlot';

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
  if (data?.type !== 'obstacle' || data.obstacleUuid == null) {
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
  if (!formObstacle?.uuid) {
    return existingObstacles;
  }
  const existingIndex = existingObstacles.findIndex((obstacle) => obstacle.uuid === formObstacle.uuid);
  if (existingIndex === -1) {
    return [...existingObstacles, formObstacle];
  }
  const remaining = existingObstacles.filter((obstacle) => obstacle.uuid !== formObstacle.uuid);
  return [...remaining, formObstacle];
};

const OBSTACLE_COLOR_UNSELECTED = 'black';
const OBSTACLE_COLOR_ACTIVE_POINT = 'red';
const OBSTACLE_COLOR_INACTIVE_POINT = '#922911';

const getHighlightColor = (obstacleUuid: string, currentObstacleUuid: string | null): string =>
  obstacleUuid === currentObstacleUuid ? OBSTACLE_COLOR_ACTIVE_POINT : OBSTACLE_COLOR_UNSELECTED;

const getMarkerAppearance = (
  obstacleUuid: string,
  pointIndex: number,
  currentObstacleUuid: string | null,
  currentObstaclePointIndex: number
): { symbol: string; color: string } => {
  if (obstacleUuid !== currentObstacleUuid) {
    return { symbol: '\u25cf', color: OBSTACLE_COLOR_UNSELECTED }; // ● filled circle
  }
  if (pointIndex === currentObstaclePointIndex) {
    return { symbol: '\u25c6', color: OBSTACLE_COLOR_ACTIVE_POINT }; // ◆ diamond
  }
  return { symbol: '\u25cb', color: OBSTACLE_COLOR_INACTIVE_POINT }; // ○ open circle
};

/**
 * Creates Plotly annotation objects for all obstacle points returned by Python (`litData.obstacles`).
 * Coordinates are absolute 3D values mapped directly to the plot axes using the same convention
 * as distance traces: 3D → (x,y,z); 2D profile → (x→x, z→y); 2D face → (y→x, z→y).
 * @category Studio
 * @param plotParams - The plot parameters including litData, obstacles, view, side, and selection state.
 * @returns An array of partial Plotly annotation objects representing obstacles.
 */
export const createObstaclesAnnotations = (plotParams: CreatePlotParams): Partial<Plotly.Annotations>[] => {
  const {
    litData,
    obstacles,
    view,
    side,
    currentObstacleUuid,
    currentObstaclePointIndex,
    supports,
    startSupport,
    endSupport
  } = plotParams;
  const is2d = view === '2d';

  if (!litData?.obstacles?.length) {
    return [];
  }

  // Only render obstacles whose support is within the visible span window.
  // An obstacle attached to a support starts a span to the right, so the
  // endSupport itself belongs to the *next* span and must be excluded.
  const visibleSupportUuids = new Set((supports ?? []).slice(startSupport, endSupport).map((s) => s.uuid));
  const visibleObstacleUuids = new Set(
    litData.obstacles
      .filter((lo) => !obstacles.some((o) => o.uuid === lo.uuid))
      .map((lo) => lo.uuid)
      .concat(obstacles.filter((o) => visibleSupportUuids.has(o.supportUuid)).map((o) => o.uuid))
  );

  return litData.obstacles.flatMap((litObstacle) => {
    if (!visibleObstacleUuids.has(litObstacle.uuid)) {
      return [];
    }

    // Resolve display name from the domain obstacle matching by UUID
    const obstacleUuid = litObstacle.uuid;
    const formObstacle = obstacles.find((o) => o.uuid === litObstacle.uuid);
    const obstacleName = formObstacle?.name ?? litObstacle.uuid;

    return litObstacle.points.flatMap(([cx, cy, cz], pointIndex) => {
      // Map absolute Python coords [x, y, z] to Plotly axes
      const px = is2d && side === 'face' ? cy : cx;
      const py = is2d ? cz : cy;
      const pz = cz;

      const color = getHighlightColor(obstacleUuid, currentObstacleUuid);
      const { symbol, color: markerColor } = getMarkerAppearance(
        obstacleUuid,
        pointIndex,
        currentObstacleUuid,
        currentObstaclePointIndex
      );
      const annotationData = {
        obstacleUuid,
        obstaclePositionIndex: pointIndex,
        type: 'obstacle' as const
      };
      const hovertext = `x: ${cx.toFixed(2)}, y: ${cy.toFixed(2)}, alt.: ${cz.toFixed(2)}m`;

      // Dot marker — z and data are non-standard Plotly properties for 3D and click handling
      const marker = {
        ...BASE_ANNOTATION,
        x: px,
        y: py,
        z: pz,
        text: symbol,
        font: { ...BASE_ANNOTATION.font, color: markerColor, size: 14 },
        hovertext,
        data: annotationData
      } as Partial<Plotly.Annotations>;

      // Label just above the point
      const label = {
        ...BASE_ANNOTATION,
        x: px,
        y: py,
        z: pz,
        text: obstacleName,
        yshift: 12,
        font: { ...BASE_ANNOTATION.font, color },
        captureevents: false,
        data: annotationData
      } as Partial<Plotly.Annotations>;

      return [marker, label];
    });
  });
};
