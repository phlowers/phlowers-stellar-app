/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { TranslocoService } from '@jsverse/transloco';
import { PythonErrorCode } from './types';

/** Map of Python exception class names to their i18n translation keys. */
const PYTHON_ERROR_KEYS: Record<PythonErrorCode, string> = {
  [PythonErrorCode.SolverError]: 'shared.python-errors.solver-error',
  [PythonErrorCode.SuspectedChainReversal]: 'shared.python-errors.suspected-chain-reversal',
  [PythonErrorCode.ConvergenceError]: 'shared.python-errors.convergence-error',
  [PythonErrorCode.ShapeError]: 'shared.python-errors.shape-error',
  [PythonErrorCode.DataWarning]: 'shared.python-errors.data-warning',
  [PythonErrorCode.BalanceEngineWarning]: 'shared.python-errors.balance-engine-warning',
  [PythonErrorCode.RtsDataNotAvailable]: 'shared.python-errors.rts-data-not-available',
  [PythonErrorCode.NoIntersectionPlaneWarning]: 'shared.python-errors.no-intersection-plane-warning',
  [PythonErrorCode.NoIntersectionPlaneForDistanceError]:
    'shared.python-errors.no-intersection-plane-for-distance-error',
  [PythonErrorCode.MeasurementDataNotAvailable]: 'shared.python-errors.measurement-data-not-available',
  [PythonErrorCode.UncertaintyNotAvailable]: 'shared.python-errors.uncertainty-not-available',
  [PythonErrorCode.InvalidManipulationIndex]: 'shared.python-errors.invalid-manipulation-index',
  [PythonErrorCode.InvalidManipulationKeys]: 'shared.python-errors.invalid-manipulation-keys',
  [PythonErrorCode.InvalidManipulationRange]: 'shared.python-errors.invalid-manipulation-range',
  [PythonErrorCode.SupportOutOfRangeError]: 'shared.python-errors.support-out-of-range-error',
  [PythonErrorCode.GeneratedPointsNoneError]: 'shared.python-errors.generated-points-none-error',
  [PythonErrorCode.NightTimeError]: 'shared.python-errors.night-time-error',
  [PythonErrorCode.CutStrandsExceedsLayerError]: 'shared.python-errors.cut-strands-exceeds-layer-error',
  [PythonErrorCode.RtsCableNotAvailable]: 'shared.python-errors.rts-cable-not-available',
  [PythonErrorCode.RtsLayerNotAvailable]: 'shared.python-errors.rts-layer-not-available'
};

// Translation params read from the raw Python message, for messages with dynamic values.
// Each regex must follow the message built in stellar_engine/entities/errors.py.
const PYTHON_ERROR_PARAMS: Partial<Record<PythonErrorCode, (rawText: string) => Record<string, string> | null>> = {
  [PythonErrorCode.CutStrandsExceedsLayerError]: (rawText) => {
    const match = /\((\d+)\) exceeds number of strands \((\d+)\) in layer (\d+)/.exec(rawText);
    return match ? { cutCount: match[1], layerTotal: match[2], layer: match[3] } : null;
  }
};

/**
 * Formats a `PythonErrorCode` into a localized human-readable string.
 * Returns `null` when the code is `null` or unrecognized, or when the dynamic values of its message
 * cannot be read from `rawText`, allowing the caller to apply its own fallback.
 *
 * @param code - The Python exception class name, or `null`
 * @param translocoService - The translation service (injected by caller)
 * @param rawText - The raw Python message, needed by codes whose message has dynamic values
 * @returns The localized message, or `null` if no mapping exists
 */
export const formatPythonError = (
  code: PythonErrorCode | null,
  translocoService: TranslocoService,
  rawText = ''
): string | null => {
  if (code === null) {
    return null;
  }
  const key = PYTHON_ERROR_KEYS[code];
  const getParams = PYTHON_ERROR_PARAMS[code];
  const params = getParams ? getParams(rawText) : {};
  return key && params ? translocoService.translate(key, params) : null;
};
