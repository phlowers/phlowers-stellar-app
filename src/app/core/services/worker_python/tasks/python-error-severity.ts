/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { DiagnosticSeverity } from './python-diagnostic.interfaces';
import { PythonErrorCode } from './types';

/**
 * Map of each `PythonErrorCode` to the severity it should be surfaced with (error vs warning toast).
 *
 * @remarks
 * This file must stay free of `$localize`/i18n usage: it is imported by `handle-task.ts`,
 * which runs inside the Pyodide Web Worker bundle. That bundle does not load the
 * `@angular/localize/init` polyfill (only the main "browser" build does), so evaluating
 * a `$localize` tagged template at module load time there throws `ReferenceError: $localize is not defined`
 * and crashes the worker before Pyodide can even start. Localized messages belong in
 * `python-error-messages.ts`, which must only be imported from main-thread code.
 */
export const PYTHON_ERROR_SEVERITY: Record<PythonErrorCode, DiagnosticSeverity> = {
  [PythonErrorCode.SolverError]: 'error',
  [PythonErrorCode.SuspectedChainReversal]: 'error',
  [PythonErrorCode.ConvergenceError]: 'error',
  [PythonErrorCode.ShapeError]: 'error',
  [PythonErrorCode.DataWarning]: 'warning',
  [PythonErrorCode.BalanceEngineWarning]: 'warning',
  [PythonErrorCode.RtsDataNotAvailable]: 'error',
  [PythonErrorCode.UserWarning]: 'warning'
};
