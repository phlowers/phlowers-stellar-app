/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { FormControl, FormGroup } from '@angular/forms';
import { FieldMeasure } from '@features/studio/field-measuring/domain/types';

/** Numeric input fields of the tangent aiming (interior) form. */
export type TangentAimingInteriorNumericField =
  'spanLength' | 'hAccDistance' | 'verticalAccAngleLeft' | 'verticalAccAngleRight' | 'parameter' | 'tangentAngle';

/** Every input field of the tangent aiming (interior) form. */
export type TangentAimingInteriorInputField = 'leftSupport' | TangentAimingInteriorNumericField;

/** Typed reactive form of the tangent aiming (interior) inputs. */
export type TangentAimingInteriorForm = FormGroup<
  { leftSupport: FormControl<string | null> } & Record<TangentAimingInteriorNumericField, FormControl<number | null>>
>;

/** Calculation type of the tangent aiming (interior) form. */
export type TangentAimingInteriorCalculationType = FieldMeasure['interiorCalculationType'];

/** Inputs sent to the tangent aiming (interior) calculation. */
export interface TangentAimingInteriorInputs {
  leftSupport: string | null;
  spanLength: number | null;
  hAccDistance: number | null;
  verticalAccAngleLeft: number | null;
  verticalAccAngleRight: number | null;
  calculationType: TangentAimingInteriorCalculationType;
  parameter: number | null;
  tangentAngle: number | null;
}
