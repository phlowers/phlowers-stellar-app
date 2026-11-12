/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { Obstacle } from '@shared/domain/models/obstacle.model';
import { EstimateTemperatureInputs } from '@services/worker_python/tasks/types';
import { CONFORMITY_TEMPERATURE_BOUNDS } from '@features/studio/estimations/domain/estimations.constantes';
import {
  EstimationObstacleOption,
  EstimationPointOption,
  TemperatureEstimationFormValue
} from '@features/studio/estimations/domain/estimations.interfaces';

/** Obstacles of the section holding at least one point, in the section order. */
export function getEstimableObstacles(obstacles: readonly Obstacle[] | null | undefined): Obstacle[] {
  return (obstacles ?? []).filter((obstacle) => obstacle.positions.length > 0);
}

/** Obstacle select options: the obstacle names, valued by their uuid. */
export function toObstacleOptions(obstacles: readonly Obstacle[]): EstimationObstacleOption[] {
  return obstacles.map((obstacle) => ({ label: obstacle.name, value: obstacle.uuid }));
}

/** Point select options of an obstacle, labelled from their 0-based index. */
export function toPointOptions(
  obstacle: Obstacle | null,
  pointLabel: (index: number) => string
): EstimationPointOption[] {
  return (obstacle?.positions ?? []).map((_, index) => ({ label: pointLabel(index), value: index }));
}

/** Point selected by default for an obstacle: its first point, or null without obstacle or point. */
export function getDefaultPointIndex(obstacle: Obstacle | null): number | null {
  return obstacle?.positions.length ? 0 : null;
}

/**
 * Obstacle preselected from the Studio selection: its uuid when it is an estimable obstacle, otherwise null
 * (no selection, a floor, or an obstacle without point).
 */
export function getPreselectedObstacleUuid(
  obstacles: readonly Obstacle[],
  studioSelectedUuid: string | null
): string | null {
  return obstacles.some((obstacle) => obstacle.uuid === studioSelectedUuid) ? studioSelectedUuid : null;
}

/**
 * Maps the form value to the engine inputs, or null while a value is missing. The engine resolves the
 * point from the obstacle registered in the study, in the section frame.
 */
export function toTemperatureEstimationInputs(
  value: TemperatureEstimationFormValue,
  obstacle: Obstacle | null
): EstimateTemperatureInputs | null {
  const { obstacleUuid, pointIndex, targetDistance } = value;
  if (!obstacle || obstacle.uuid !== obstacleUuid || pointIndex === null || targetDistance === null) {
    return null;
  }
  return {
    spanIndex: obstacle.supportIndex,
    obstacleUuid,
    pointIndex,
    targetDistance,
    bounds: [...CONFORMITY_TEMPERATURE_BOUNDS]
  };
}
