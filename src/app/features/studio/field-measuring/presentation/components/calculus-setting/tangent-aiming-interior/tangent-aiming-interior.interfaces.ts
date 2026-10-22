/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { FormControl, FormGroup } from '@angular/forms';
import { TangentAimingSupportResult } from '@features/studio/field-measuring/domain/types';

/** Numeric input fields of the tangent aiming (interior) form. */
export type TangentAimingInteriorNumericField =
  'spanLength' | 'hAccDistance' | 'verticalAccAngleLeft' | 'verticalAccAngleRight' | 'parameter';

/** Typed reactive form of the tangent aiming (interior) inputs. */
export type TangentAimingInteriorForm = FormGroup<
  { leftSupport: FormControl<string | null> } & Record<TangentAimingInteriorNumericField, FormControl<number | null>>
>;

/** Result of the tangent aiming (interior) parameter calculation, same shape as the support one. */
export type TangentAimingInteriorResult = TangentAimingSupportResult;
