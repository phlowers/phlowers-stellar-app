/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { Obstacle } from '@shared/domain/models/obstacle.model';
import {
  EstimateEffortInputs,
  EstimateMinimumDistanceWindInputs,
  EstimateTemperatureInputs
} from '@services/worker_python/tasks/types';
import {
  CONFORMITY_TEMPERATURE_BOUNDS,
  MINIMUM_DISTANCE_WIND_PRESSURE_BOUNDS
} from '@features/studio/estimations/domain/estimations.constantes';
import {
  EffortEstimationFormValue,
  EstimationObstacleFormValue,
  EstimationObstacleOption,
  EstimationObstaclePointInputs,
  EstimationPointOption,
  TemperatureEstimationFormValue,
  WindPressureEstimationFormValue
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
 * Maps the chosen obstacle point to the engine inputs, or null while it is missing. The engine resolves the
 * point from the obstacle registered in the study, in the section frame.
 */
export function toObstaclePointInputs(
  value: EstimationObstacleFormValue,
  obstacle: Obstacle | null
): EstimationObstaclePointInputs | null {
  const { obstacleUuid, pointIndex } = value;
  if (obstacle?.uuid !== obstacleUuid || pointIndex === null) {
    return null;
  }
  return { spanIndex: obstacle.supportIndex, obstacleUuid, pointIndex };
}

/** Maps the temperature estimation form value to the engine inputs, or null while a value is missing. */
export function toTemperatureEstimationInputs(
  value: TemperatureEstimationFormValue,
  obstacle: Obstacle | null
): EstimateTemperatureInputs | null {
  const point = toObstaclePointInputs(value, obstacle);
  if (!point || value.targetDistance === null) {
    return null;
  }
  return { ...point, targetDistance: value.targetDistance, bounds: [...CONFORMITY_TEMPERATURE_BOUNDS] };
}

/** Maps the wind pressure estimation form value to the engine inputs, or null while a value is missing. */
export function toWindPressureEstimationInputs(
  value: WindPressureEstimationFormValue,
  obstacle: Obstacle | null
): EstimateMinimumDistanceWindInputs | null {
  const point = toObstaclePointInputs(value, obstacle);
  if (!point || value.temperature === null) {
    return null;
  }
  return { ...point, temperature: value.temperature, bounds: [...MINIMUM_DISTANCE_WIND_PRESSURE_BOUNDS] };
}

/**
 * Maps the effort estimation form value to the engine inputs, or null while a value or the span length is missing.
 * The engine measures the load position from the left support and the displacement upward.
 */
export function toEffortEstimationInputs(
  value: EffortEstimationFormValue,
  spanLength: number | null
): EstimateEffortInputs | null {
  const { span, referenceSupport, distanceToReferenceSupport, temperature, direction, targetDisplacement } = value;
  if (
    span === null ||
    spanLength === null ||
    referenceSupport === null ||
    distanceToReferenceSupport === null ||
    temperature === null ||
    targetDisplacement === null
  ) {
    return null;
  }
  return {
    spanIndex: span.index,
    loadPositionDistance:
      referenceSupport === 'LEFT' ? distanceToReferenceSupport : spanLength - distanceToReferenceSupport,
    temperature,
    targetVerticalDisplacement: direction === 'UP' ? targetDisplacement : -targetDisplacement
  };
}

/** Rounds a result to the 2 displayed decimals; adding 0 turns a rounded -0 into 0. */
export function roundEffortResult(value: number): number {
  return Math.round(value * 100) / 100 + 0;
}

/** Text copied to the clipboard for a displayed result: the value as shown, without unit nor group separator. */
export function formatEffortForClipboard(value: number, locale: string): string {
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    useGrouping: false
  }).format(roundEffortResult(value));
}

/**
 * Validator rejecting values above a length known from the control itself (e.g. the length of the span chosen in the
 * same form). It reports the same `max` error as `Validators.max` and does nothing while the length is unknown.
 */
export function maxLengthValidator(getLength: (control: AbstractControl) => number | null): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const max = getLength(control);
    if (max === null || control.value === null || control.value === undefined || control.value === '') {
      return null;
    }
    return control.value > max ? { max: { max, actual: control.value } } : null;
  };
}
