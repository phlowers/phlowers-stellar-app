/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { EstimateTemperatureInputs } from '@services/worker_python/tasks/types';
import { Obstacle } from '@shared/domain/models/obstacle.model';
import {
  TemperatureEstimationFormValue,
  TemperatureEstimationOption
} from '@features/studio/estimations/domain/temperature-estimation.interfaces';

/** One option per obstacle, labelled with its name. */
export function toObstacleOptions(obstacles: Obstacle[]): TemperatureEstimationOption<string>[] {
  return obstacles.map((obstacle) => ({ label: obstacle.name, value: obstacle.uuid }));
}

/** One option per point of the obstacle, in order; empty without obstacle. */
export function toPointOptions(
  obstacle: Obstacle | undefined,
  getLabel: (pointNumber: number) => string
): TemperatureEstimationOption<number>[] {
  return (obstacle?.positions ?? []).map((_, index) => ({ label: getLabel(index + 1), value: index }));
}

/** Maps the form value to the engine inputs, or null while a required value is missing or the obstacle is unknown. */
export function toEstimateTemperatureInputs(
  value: TemperatureEstimationFormValue,
  obstacles: Obstacle[]
): EstimateTemperatureInputs | null {
  const { obstacleUuid, pointIndex, targetDistance } = value;
  const obstacle = obstacles.find((candidate) => candidate.uuid === obstacleUuid);
  if (!obstacle || pointIndex === null || targetDistance === null) {
    return null;
  }
  return {
    spanIndex: obstacle.supportIndex,
    obstacleUuid: obstacle.uuid,
    pointIndex,
    targetDistance
  };
}
