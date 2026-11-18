/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import type { FormControl, FormGroup } from '@angular/forms';
import type { Section } from '@shared/domain';

/** Tabs of the estimations dialog. */
export type EstimationTabValue = 'temperature' | 'wind-pressure' | 'vertical-effort';

/** Display metadata of an estimations dialog tab. */
export interface EstimationTab {
  value: EstimationTabValue;
  labelKey: string;
  /** Tabs specified by another user story are shown but not usable yet. */
  disabled: boolean;
  testId: string;
}

/** Option of the obstacle select: the obstacle name, valued by its uuid. */
export interface EstimationObstacleOption {
  label: string;
  value: string;
}

/** Option of the obstacle point select, valued by the point index. */
export interface EstimationPointOption {
  label: string;
  value: number;
}

/** Obstacle point chosen in an estimation form. */
export interface EstimationObstacleFormValue {
  obstacleUuid: string | null;
  pointIndex: number | null;
}

/** Raw value of an estimation form: the obstacle point and the numeric values specific to the estimation. */
export type EstimationFormValue<TValueKey extends string> = EstimationObstacleFormValue &
  Record<TValueKey, number | null>;

/** Raw value of the temperature estimation form. */
export interface TemperatureEstimationFormValue extends EstimationObstacleFormValue {
  targetDistance: number | null;
}

/** Raw value of the minimum distance wind pressure estimation form. */
export interface WindPressureEstimationFormValue extends EstimationObstacleFormValue {
  /** Cable temperature (°C). */
  temperature: number | null;
}

/** Span selected in the effort estimation form. */
export interface EstimationSpan {
  index: number;
  uuid: string;
}

/** Side of the selected span the distance is measured from. */
export type EstimationSupportSide = 'LEFT' | 'RIGHT';

/** Direction of the targeted vertical displacement of the cable. */
export type EffortDirection = 'UP' | 'DOWN';

/** Option of the displacement direction switch. */
export interface EffortDirectionOption {
  labelKey: string;
  value: EffortDirection;
}

/** Raw value of the effort estimation form (disabled controls included). */
export interface EffortEstimationFormValue {
  span: EstimationSpan | null;
  referenceSupport: EstimationSupportSide | null;
  /** Distance (m) from the reference support to the point where the effort is applied. */
  distanceToReferenceSupport: number | null;
  /** Cable temperature (°C). */
  temperature: number | null;
  direction: EffortDirection;
  /** Target vertical displacement (m), in absolute value. */
  targetDisplacement: number | null;
}

/** Form of the effort estimation. */
export type EffortEstimationForm = FormGroup<{
  span: FormControl<EstimationSpan | null>;
  referenceSupport: FormControl<EstimationSupportSide | null>;
  distanceToReferenceSupport: FormControl<number | null>;
  temperature: FormControl<number | null>;
  direction: FormControl<EffortDirection>;
  targetDisplacement: FormControl<number | null>;
}>;

/** Obstacle point of the engine inputs of an estimation. */
export interface EstimationObstaclePointInputs {
  spanIndex: number;
  obstacleUuid: string;
  pointIndex: number;
}

/** Engine result of an estimation, with the section and engine revision it was calculated on. */
export interface EstimationOutcome<TResult> {
  result: TResult;
  section: Section | null;
  engineRevision: string;
}
