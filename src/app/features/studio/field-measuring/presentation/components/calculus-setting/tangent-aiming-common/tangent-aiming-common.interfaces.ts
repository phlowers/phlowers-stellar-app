/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { FormGroup } from '@angular/forms';
import { FieldMeasure } from '@features/studio/field-measuring/domain/types';
import { Task, TaskInputs } from '@services/worker_python/tasks/types';

/** Kind of numeric input shared by the tangent aiming forms, each kind having its own rule. */
export type TangentAimingRuleField = 'spanLength' | 'hAccDistance' | 'verticalAccAngle' | 'parameter' | 'tangentAngle';

/** Calculation type of the tangent aiming forms offering a parameter / tangent switch. */
export type TangentAimingCalculationType = FieldMeasure['calculationType'];

/** Validation bounds and default of a numeric field. */
export interface TangentAimingFieldRule {
  min: number;
  max: number;
  decimals: number;
  default: number;
}

/** Static display description of a numeric input. */
export interface TangentAimingNumberFieldView {
  id: string;
  labelKey: string;
  /** Transloco key of the unit displayed next to the input. */
  unitKey: string;
  testId: string;
  step: number;
  /** CSS grid area class. */
  area: string;
}

/** Left support seen at the last resolution, with the span it was resolved for. */
export interface LeftSupportSnapshot {
  spanKey: string;
  leftSupport: string | null;
}

/** Left support tracking of a form: last resolution and the left support chosen by the user for each span. */
export interface LeftSupportState {
  previous: LeftSupportSnapshot | null;
  memory: Record<string, string>;
}

/** Per-mode behaviour of a tangent aiming calculation method, looked up by `FieldMeasure['calculationMethod']`. */
export interface TangentAimingMode {
  outputKey: TangentAimingFormConfig['outputKey'];
  isDataValid: (data: FieldMeasure) => boolean;
  applyDefaults: (data: FieldMeasure, defaultLeftSupport: string | null) => FieldMeasure;
  invalidateResult: (data: FieldMeasure) => FieldMeasure;
  /** Resets the numeric input hidden by the calculation type switch. */
  resetNonDisplayedFields: (data: FieldMeasure) => FieldMeasure;
}

/** Per-form differences of the tangent aiming forms, consumed by `TangentAimingFormBase`. */
export interface TangentAimingFormConfig {
  form: FormGroup;
  /** Measure key bound to each form control. */
  modelFields: Record<string, keyof FieldMeasure>;
  leftSupportKey: 'tangentLeftSupport' | 'interiorLeftSupport' | 'exteriorLeftSupport';
  calculationTypeKey: 'calculationType' | 'interiorCalculationType' | 'exteriorCalculationType';
  outputKey: 'tangentAimingSupport' | 'tangentAimingInterior' | 'tangentAimingExterior';
  /** Label of the form in the calculation failure log. */
  logLabel: string;
  /** Transloco key of the calculation failure message, specific to each tangent aiming mode. */
  calculationFailedKey: string;
  getDisplayedInputFields: (calculationType: TangentAimingCalculationType) => readonly string[];
  invalidateResult: (data: FieldMeasure) => FieldMeasure;
  /** Inputs of the `calculateTangentAiming` task run by the calculate button. */
  toTaskInputs: (data: FieldMeasure) => TaskInputs[Task.calculateTangentAiming];
}
