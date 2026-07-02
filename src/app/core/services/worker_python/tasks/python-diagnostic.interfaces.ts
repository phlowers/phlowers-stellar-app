/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { PythonErrorCode } from './types';

/** Whether a diagnostic should be surfaced as a blocking error or a non-blocking warning. */
export type DiagnosticSeverity = 'error' | 'warning';

/** Origin of a diagnostic: a thrown Python exception, or a captured `warnings.warn()` call. */
export type PythonDiagnosticOrigin = 'exception' | 'warning';

/** A single classified piece of feedback raised by the Python engine during a task. */
export interface PythonDiagnostic {
  /** The matched Python error/warning code. */
  code: PythonErrorCode;
  /** Whether this diagnostic should be shown as an error or a warning toast. */
  severity: DiagnosticSeverity;
  /** Whether this diagnostic came from a thrown exception or a captured warning. */
  origin: PythonDiagnosticOrigin;
  /** The raw Python text (traceback excerpt or warning message) the code was matched from. */
  rawText: string;
}
