/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { FormControl, FormGroup } from '@angular/forms';
import { FieldMeasure } from '@features/studio/field-measuring/domain/types';

/** Numeric input fields of the tangent aiming (support) form. */
export type TangentAimingSupportNumericField =
  'tangentSpanLength' | 'cableHAccDistance' | 'cableVerticalAccAngle' | 'cableParameter' | 'cableTangentAngle';

/** Every `FieldMeasure` field read by the tangent aiming (support) form. */
export type TangentAimingSupportInputField = 'tangentLeftSupport' | TangentAimingSupportNumericField;

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
