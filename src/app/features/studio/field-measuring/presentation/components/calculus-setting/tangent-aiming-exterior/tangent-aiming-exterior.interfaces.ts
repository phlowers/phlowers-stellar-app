/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { FormControl, FormGroup } from '@angular/forms';
import { FieldMeasure } from '@features/studio/field-measuring/domain/types';

/** Numeric input fields of the tangent aiming (exterior) form. */
export type TangentAimingExteriorNumericField =
  'spanLength' | 'hAccDistance' | 'verticalAccAngleLeft' | 'verticalAccAngleRight' | 'parameter' | 'tangentAngle';

/** Every input field of the tangent aiming (exterior) form. */
export type TangentAimingExteriorInputField = 'leftSupport' | TangentAimingExteriorNumericField;

/** Typed reactive form of the tangent aiming (exterior) inputs. */
export type TangentAimingExteriorForm = FormGroup<
  { leftSupport: FormControl<string | null> } & Record<TangentAimingExteriorNumericField, FormControl<number | null>>
>;

/** Calculation type of the tangent aiming (exterior) form. */
export type TangentAimingExteriorCalculationType = FieldMeasure['exteriorCalculationType'];

/** Inputs sent to the tangent aiming (exterior) calculation. */
export interface TangentAimingExteriorInputs {
  leftSupport: string | null;
  spanLength: number | null;
  hAccDistance: number | null;
  verticalAccAngleLeft: number | null;
  verticalAccAngleRight: number | null;
  calculationType: TangentAimingExteriorCalculationType;
  parameter: number | null;
  tangentAngle: number | null;
}
