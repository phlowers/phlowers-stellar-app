/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { PythonErrorCode } from './types';

/** Map of Python exception class names to their localized display messages. */
const PYTHON_ERROR_MESSAGES: Record<PythonErrorCode, string> = {
  [PythonErrorCode.SolverError]: $localize`A solver error occurred.`,
  [PythonErrorCode.SuspectedChainReversal]: $localize`The insulator chain is suspected to have reversed (above horizontal position).`,
  [PythonErrorCode.ConvergenceError]: $localize`The solver failed to converge.`,
  [PythonErrorCode.ShapeError]: $localize`A shape mismatch was detected in arrays.`,
  [PythonErrorCode.DataWarning]: $localize`A data-related warning was raised.`,
  [PythonErrorCode.BalanceEngineWarning]: $localize`A balance engine warning was raised.`,
  [PythonErrorCode.RtsDataNotAvailable]: $localize`RTS catalog data (rts_cable, rts_layer_*) is missing or contains NaN values.`,
  [PythonErrorCode.UserWarning]: $localize`The object position imposes a distance plane that does not intersect the cable.`,
  [PythonErrorCode.NoIntersectionPlaneForDistanceError]: $localize`No intersection plane was found for the distance calculation.`,
  [PythonErrorCode.MeasurementDataNotAvailable]: $localize`Measurement data is not available.`,
  [PythonErrorCode.UncertaintyNotAvailable]: $localize`Uncertainty data is not available.`,
  [PythonErrorCode.InvalidManipulationIndex]: $localize`The manipulation index provided is invalid.`,
  [PythonErrorCode.InvalidManipulationKeys]: $localize`The manipulation keys provided are invalid.`,
  [PythonErrorCode.InvalidManipulationRange]: $localize`The manipulation range provided is invalid.`,
  [PythonErrorCode.SupportOutOfRangeError]: $localize`The support is out of the valid range.`,
  [PythonErrorCode.GeneratedPointsNoneError]: $localize`No generated points were found after computation.`
};

/**
 * Formats a `PythonErrorCode` into a localized human-readable string.
 * Returns `null` when the code is `null` or unrecognized, allowing the caller to apply its own fallback.
 *
 * @param code - The Python exception class name, or `null`
 * @returns The localized message, or `null` if no mapping exists
 */
export const formatPythonError = (code: PythonErrorCode | null): string | null => {
  if (code === null) {
    return null;
  }
  return PYTHON_ERROR_MESSAGES[code] ?? null;
};
