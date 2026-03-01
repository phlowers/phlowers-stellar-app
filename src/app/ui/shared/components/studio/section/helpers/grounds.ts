import { Ground, GroundPosition } from '@core/domain/models/ground.model';
import { CreatePlotParams } from './createPlot';
import { DataObject } from './createPlotDataObject';

export interface GroundAnnotationData {
  type: 'ground';
  groundUuid: string;
  groundPositionIndex: number;
}

export interface GroundClickPayload {
  ground: Ground;
  supportIndex: number;
  groundPositionIndex: number;
}

export const getGroundClickPayload = (
  data: GroundAnnotationData | undefined,
  grounds: Ground[],
  supports: { uuid: string }[]
): GroundClickPayload | null => {
  if (!data || data.type !== 'ground' || data.groundUuid == null) {
    return null;
  }
  const ground = grounds.find((g) => g.uuid === data.groundUuid);
  if (!ground) return null;
  const supportIndex = supports.findIndex((s) => s.uuid === ground.supportUuid);
  if (supportIndex < 0) return null;
  return {
    ground,
    supportIndex,
    groundPositionIndex: data.groundPositionIndex ?? 0
  };
};

const GROUND_COLOR = 'gold';
const GROUND_ACTIVE_COLOR = 'red';

const BASE_ANNOTATION: Partial<Plotly.Annotations> = {
  showarrow: true,
  arrowhead: 6,
  arrowwidth: 0,
  standoff: 20,
  font: {
    color: GROUND_COLOR,
    size: 10
  },
  captureevents: true
};

export const appendExistingGroundsWithFormGround = (existingGrounds: Ground[], formGround: Ground | null): Ground[] => {
  if (!formGround || !formGround.uuid) {
    return existingGrounds;
  }
  const existingIndex = existingGrounds.findIndex((g) => g.uuid === formGround.uuid);
  if (existingIndex === -1) {
    return [...existingGrounds, formGround];
  }
  const remaining = existingGrounds.filter((g) => g.uuid !== formGround.uuid);
  return [...remaining, formGround];
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

const isValidPosition = (position: GroundPosition): boolean => position.x !== null && position.z !== null;

const computeAnnotationCoords = (
  base: Coordinates,
  position: GroundPosition,
  side: string,
  is2d: boolean
): Coordinates => {
  const x = base.x + (position.x ?? 0);
  const z = base.z + (position.z ?? 0);
  const y = side === 'face' && is2d ? base.z + (position.z ?? 0) : base.y;
  return { x, y, z };
};

const getHighlightColor = (
  groundUuid: string,
  positionIndex: number,
  currentGroundUuid: string | null,
  currentGroundPointIndex: number
): string =>
  groundUuid === currentGroundUuid && positionIndex === currentGroundPointIndex ? GROUND_ACTIVE_COLOR : GROUND_COLOR;

const createPositionAnnotation = (
  ground: Ground,
  positionIndex: number,
  coords: Coordinates,
  color: string
): Partial<Plotly.Annotations> =>
  ({
    ...BASE_ANNOTATION,
    x: coords.x,
    y: coords.y,
    z: coords.z,
    text: $localize`Ground`,
    font: { ...BASE_ANNOTATION.font, color },
    arrowcolor: color,
    hovertext: `dist. supp. réf: ${coords.x.toFixed(2)}m<br />alt. point: ${coords.z.toFixed(2)}m`,
    data: {
      groundUuid: ground.uuid,
      groundPositionIndex: positionIndex,
      type: 'ground' as const
    }
  }) as Partial<Plotly.Annotations>;

export const createGroundAnnotations = (plotParams: CreatePlotParams): Partial<Plotly.Annotations>[] => {
  const { grounds, data: dataObjects, view, side, currentGroundUuid, currentGroundPointIndex } = plotParams;
  if (!grounds || grounds.length === 0) return [];

  const is2d = view === '2d';
  const supportObjects = dataObjects.filter((dataObject) => dataObject.name === 'supports').slice(0, -1);
  const supportByUuid = new Map(supportObjects.map((s) => [s.supportUuid, s]));
  const relevantGrounds = grounds.filter((g) => supportByUuid.has(g.supportUuid));

  return relevantGrounds.flatMap((ground) => {
    const supportObject = supportByUuid.get(ground.supportUuid);
    if (!supportObject) return [];

    const base = getBaseCoordinates(supportObject);

    return ground.positions
      .map((position, index) => ({ position, index }))
      .filter(({ position }) => isValidPosition(position))
      .map(({ position, index }) => {
        const coords = computeAnnotationCoords(base, position, side, is2d);
        const color = getHighlightColor(ground.uuid, index, currentGroundUuid, currentGroundPointIndex);
        return createPositionAnnotation(ground, index, coords, color);
      });
  });
};

/**
 * Creates Plotly line traces for ground profiles.
 * Each trace connects: left support base → ground points (sorted by x) → right support base.
 */
export const createGroundTraces = (plotParams: CreatePlotParams): DataObject[] => {
  const { grounds, data: dataObjects, view, side } = plotParams;
  if (!grounds || grounds.length === 0) return [];

  const is2d = view === '2d';
  const allSupportObjects = dataObjects.filter((dataObject) => dataObject.name === 'supports');
  const supportByUuid = new Map(allSupportObjects.map((s) => [s.supportUuid, s]));

  const orderedSupportUuids = allSupportObjects.map((s) => s.supportUuid);

  return grounds.flatMap((ground) => {
    const leftSupportObject = supportByUuid.get(ground.supportUuid);
    if (!leftSupportObject) return [];

    const leftIndex = orderedSupportUuids.indexOf(ground.supportUuid);
    if (leftIndex < 0 || leftIndex >= allSupportObjects.length - 1) return [];

    const rightSupportObject = allSupportObjects[leftIndex + 1];
    if (!rightSupportObject) return [];

    const leftBase = getBaseCoordinates(leftSupportObject);
    const rightBase = getBaseCoordinates(rightSupportObject);

    const validPositions = ground.positions.filter(isValidPosition);

    const groundCoords: Coordinates[] = validPositions.map((pos) => computeAnnotationCoords(leftBase, pos, side, is2d));

    const allPoints: Coordinates[] = [
      { x: leftBase.x, y: side === 'face' && is2d ? leftBase.z : leftBase.y, z: leftBase.z },
      ...groundCoords,
      { x: rightBase.x, y: side === 'face' && is2d ? rightBase.z : rightBase.y, z: rightBase.z }
    ];

    allPoints.sort((a, b) => a.x - b.x);

    const trace: DataObject = {
      x: allPoints.map((p) => p.x),
      y: is2d ? allPoints.map((p) => p.y) : allPoints.map((p) => p.y),
      z: is2d ? undefined : allPoints.map((p) => p.z),
      type: is2d ? 'scatter' : 'scatter3d',
      mode: 'lines+markers',
      line: { color: GROUND_COLOR, dash: 'solid', width: is2d ? 3 : 5 },
      marker: { size: is2d ? 6 : 4, color: GROUND_COLOR },
      name: 'ground',
      hoverinfo: 'skip',
      supportUuid: undefined
    } as DataObject;

    return [trace];
  });
};
