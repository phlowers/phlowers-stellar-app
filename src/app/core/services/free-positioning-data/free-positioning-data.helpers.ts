/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { DISTANCE_POINT_KEY, FLOOR_POINT_KEY, LOAD_ICON, MARKING_ICON, MARKING_LOAD_KEY, PUNCTUAL_LOAD_KEY } from './free-positioning-data.constantes';
import { AggregatePointsParams, FreePositioningPoint } from './free-positioning-data.interfaces';
import { GetSectionOutput } from '@core/services/worker_python/tasks/types';

/**
 * Resolves the altitude (NGF) of a support from litData coords.
 */
export const getSupportAltitudeNgf = (litData: GetSectionOutput | null | undefined, supportIndex: number): number => {
  const supportPoints = litData?.coords?.supports?.[supportIndex];
  const firstPoint = supportPoints?.[0];
  const altitude = Array.isArray(firstPoint) ? firstPoint[2] : undefined;
  return typeof altitude === 'number' && !Number.isNaN(altitude) ? altitude : 0;
};

/**
 * Builds obstacle points for the given frozen span.
 */
export const buildObstaclePoints = (params: AggregatePointsParams): FreePositioningPoint[] => {
  const points: FreePositioningPoint[] = [];
  const currentSupport = params.supports[params.frozenSpan];
  const supportUuid = currentSupport?.uuid;

  // Active obstacle being edited in the form
  const isEditingObstacle =
    params.editableCategory === 'obstacle' &&
    !!params.activeObstaclePositions &&
    params.activeObstaclePositions.length > 0 &&
    (!params.activeObstacleSupportUuid || params.activeObstacleSupportUuid === supportUuid);

  if (isEditingObstacle && params.activeObstaclePositions) {
    const refAltitude = params.referenceSupportAltitudeNgf ?? 0;
    params.activeObstaclePositions.forEach((pos, idx) => {
      if (pos.x !== null && pos.z !== null && !Number.isNaN(pos.x) && !Number.isNaN(pos.z)) {
        const altitude = params.isAbsoluteAltitude ? pos.z : pos.z + refAltitude;
        points.push({
          id: `obstacle-form-${idx}`,
          category: 'obstacle',
          alongSpan: pos.x,
          lateral: pos.y,
          altitude,
          editable: idx === params.activeObstacleIndex,
          name: `#${idx + 1}`
        });
      }
    });
  }

  // Other obstacles already saved on the span (from litData / section).
  // Skip the obstacle currently being edited to avoid duplicating its form points.
  const sectionObstacles = params.section?.obstacles ?? [];
  const litObstacles = params.litData?.obstacles ?? [];

  for (const litObs of litObstacles) {
    if (isEditingObstacle && litObs.uuid === params.activeObstacleUuid) continue;

    const domainObs = sectionObstacles.find((o) => o.uuid === litObs.uuid);
    if (!domainObs) continue;

    const matchesSpan =
      domainObs.supportUuid === supportUuid ||
      domainObs.supportIndex === params.frozenSpan;

    if (matchesSpan) {
      litObs.points.forEach(([cx, cy, cz], ptIdx) => {
        points.push({
          id: `obstacle-${litObs.uuid}-${ptIdx}`,
          category: 'obstacle',
          alongSpan: cx,
          lateral: cy,
          altitude: cz,
          editable: false,
          name: domainObs.name
        });
      });
    }
  }

  return points;
};

/**
 * Builds floor points for the given frozen span.
 */
export const buildFloorPoints = (params: AggregatePointsParams): FreePositioningPoint[] => {
  const points: FreePositioningPoint[] = [];
  const currentSupport = params.supports[params.frozenSpan];
  const supportUuid = currentSupport?.uuid;

  // Active floor being edited in the form
  if (
    params.editableCategory === 'floor' &&
    params.activeFloorPoints &&
    params.activeFloorPoints.length > 0
  ) {
    params.activeFloorPoints.forEach((pt, idx) => {
      if (
        pt.distanceToRefSupport !== null &&
        pt.altitude !== null &&
        !Number.isNaN(pt.distanceToRefSupport) &&
        !Number.isNaN(pt.altitude)
      ) {
        points.push({
          id: `floor-form-${idx}`,
          category: 'floor',
          alongSpan: pt.distanceToRefSupport,
          lateral: null,
          altitude: pt.altitude,
          editable: idx === params.activeFloorIndex && (pt.removable ?? true),
          nameKey: FLOOR_POINT_KEY,
          nameParams: { index: idx + 1 }
        });
      }
    });
    return points;
  }

  // Saved floor from section
  const floors = params.section?.floors ?? [];
  const matchingFloor = floors.find((f) => f.supportUuid === supportUuid);
  if (matchingFloor) {
    matchingFloor.points.forEach((pt, idx) => {
      if (
        pt.distanceToRefSupport !== null &&
        pt.altitude !== null &&
        !Number.isNaN(pt.distanceToRefSupport) &&
        !Number.isNaN(pt.altitude)
      ) {
        points.push({
          id: `floor-${matchingFloor.uuid}-${idx}`,
          category: 'floor',
          alongSpan: pt.distanceToRefSupport,
          lateral: null,
          altitude: pt.altitude,
          editable: false,
          nameKey: FLOOR_POINT_KEY,
          nameParams: { index: idx + 1 }
        });
      }
    });
  }

  return points;
};

/**
 * Builds distance-measuring points for the given frozen span.
 */
export const buildDistancePoints = (params: AggregatePointsParams): FreePositioningPoint[] => {
  const points: FreePositioningPoint[] = [];
  const currentSupport = params.supports[params.frozenSpan];
  const supportUuid = currentSupport?.uuid;

  const matchesSpan =
    !params.distanceSupportUuid || params.distanceSupportUuid === supportUuid;

  if (matchesSpan && params.distancePositions) {
    params.distancePositions.forEach((pos, idx) => {
      if (pos.x !== null && pos.z !== null && !Number.isNaN(pos.x) && !Number.isNaN(pos.z)) {
        points.push({
          id: `distance-form-${idx}`,
          category: 'distance',
          alongSpan: pos.x,
          lateral: pos.y,
          altitude: pos.z,
          editable: params.editableCategory === 'distance' && idx === params.distanceActiveIndex,
          nameKey: DISTANCE_POINT_KEY,
          nameParams: { index: idx + 1 }
        });
      }
    });
  }

  return points;
};

/**
 * Builds load points for the given frozen span.
 */
export const buildLoadPoints = (params: AggregatePointsParams): FreePositioningPoint[] => {
  const points: FreePositioningPoint[] = [];
  const selectedChargeUuid = params.section?.selected_charge_uuid;
  const charge = params.section?.charges?.find((c) => c.uuid === selectedChargeUuid);
  const spanLoad = charge?.data?.spanLoads?.[params.frozenSpan];

  const loadsCoords = params.litData?.output_parameters?.loads_coords;
  const coord = loadsCoords?.[params.frozenSpan];

  if (coord && Array.isArray(coord) && coord.length >= 3) {
    const isPunctual = spanLoad?.type === 'punctual' || params.loadType === 'punctual';
    points.push({
      id: `load-${params.frozenSpan}`,
      category: 'loads',
      alongSpan: coord[0],
      lateral: coord[1],
      altitude: coord[2],
      editable: params.editableCategory === 'loads',
      icon: isPunctual ? LOAD_ICON : MARKING_ICON,
      nameKey: isPunctual ? PUNCTUAL_LOAD_KEY : MARKING_LOAD_KEY
    });
  } else if (
    params.editableCategory === 'loads' &&
    params.loadPosition !== null &&
    params.loadPosition !== undefined &&
    !Number.isNaN(params.loadPosition)
  ) {
    const isPunctual = params.loadType === 'punctual';
    // No cable coordinate yet (load not placed): approximate altitude with the span's support level rather than 0.
    points.push({
      id: `load-active-${params.frozenSpan}`,
      category: 'loads',
      alongSpan: params.loadPosition,
      lateral: 0,
      altitude: getSupportAltitudeNgf(params.litData, params.frozenSpan),
      editable: true,
      icon: isPunctual ? LOAD_ICON : MARKING_ICON,
      nameKey: isPunctual ? PUNCTUAL_LOAD_KEY : MARKING_LOAD_KEY
    });
  }

  return points;
};

/**
 * Aggregates all category points filtered for the frozen span.
 */
export const aggregateFreePositioningPoints = (params: AggregatePointsParams): FreePositioningPoint[] => [
  ...buildObstaclePoints(params),
  ...buildFloorPoints(params),
  ...buildDistancePoints(params),
  ...buildLoadPoints(params)
];
