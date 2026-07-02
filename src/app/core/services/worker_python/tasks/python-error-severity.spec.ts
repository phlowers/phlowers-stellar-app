/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { PYTHON_ERROR_SEVERITY } from './python-error-severity';
import { PythonErrorCode } from './types';

describe('PYTHON_ERROR_SEVERITY', () => {
  it('should have a severity mapping for every PythonErrorCode value', () => {
    Object.values(PythonErrorCode).forEach((code) => {
      expect(PYTHON_ERROR_SEVERITY[code]).toBeDefined();
    });
  });

  it('should classify exception-like codes as error', () => {
    expect(PYTHON_ERROR_SEVERITY[PythonErrorCode.SolverError]).toBe('error');
    expect(PYTHON_ERROR_SEVERITY[PythonErrorCode.SuspectedChainReversal]).toBe('error');
    expect(PYTHON_ERROR_SEVERITY[PythonErrorCode.ConvergenceError]).toBe('error');
    expect(PYTHON_ERROR_SEVERITY[PythonErrorCode.ShapeError]).toBe('error');
    expect(PYTHON_ERROR_SEVERITY[PythonErrorCode.RtsDataNotAvailable]).toBe('error');
  });

  it('should classify warning-like codes as warning', () => {
    expect(PYTHON_ERROR_SEVERITY[PythonErrorCode.DataWarning]).toBe('warning');
    expect(PYTHON_ERROR_SEVERITY[PythonErrorCode.BalanceEngineWarning]).toBe('warning');
    expect(PYTHON_ERROR_SEVERITY[PythonErrorCode.UserWarning]).toBe('warning');
  });
});
