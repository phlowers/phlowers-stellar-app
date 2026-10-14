/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { FormControl, FormGroup } from '@angular/forms';
import { FieldMeasure, TangentAimingSupportResult } from '@features/studio/field-measuring/domain/types';

/** Numeric input fields of the tangent aiming (support) form. */
export type TangentAimingSupportNumericField =
  'tangentSpanLength' | 'cableHAccDistance' | 'cableVerticalAccAngle' | 'cableParameter' | 'cableTangentAngle';

/** Every `FieldMeasure` field read by the tangent aiming (support) form. */
export type TangentAimingSupportInputField = 'tangentLeftSupport' | TangentAimingSupportNumericField;

/** Validation bounds and default of a numeric field. */
export interface TangentAimingSupportFieldRule {
  min: number;
  max: number;
  decimals: number;
  default: number;
}

/** Static display description of a numeric input. */
export interface TangentAimingSupportNumberFieldView {
  id: string;
  labelKey: string;
  unit: string;
  testId: string;
  step: number;
  /** CSS grid area class. */
  area: string;
}

/** Typed reactive form of the tangent aiming (support) inputs. */
export type TangentAimingSupportForm = FormGroup<
  { tangentLeftSupport: FormControl<string | null> } & Record<
    TangentAimingSupportNumericField,
    FormControl<number | null>
  >
>;

/** Inputs sent to the tangent aiming (support) calculation. */
export interface TangentAimingSupportInputs {
  leftSupport: string | null;
  spanLength: number | null;
  hAccDistance: number | null;
  verticalAccAngle: number | null;
  calculationType: FieldMeasure['calculationType'];
  parameter: number | null;
  tangentAngle: number | null;
}

/** Outcome of the tangent aiming (support) calculation, same shape as a worker task response. */
export interface TangentAimingSupportCalculation {
  result: TangentAimingSupportResult | null;
  error: string | null;
}
