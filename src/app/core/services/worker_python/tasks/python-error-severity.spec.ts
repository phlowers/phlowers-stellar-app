/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { TestBed } from '@angular/core/testing';
import { TranslocoService, TranslocoTestingModule } from '@jsverse/transloco';
import { PYTHON_ERROR_SEVERITY } from './python-error-severity';
import { formatPythonError } from './python-error-messages';
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
    expect(PYTHON_ERROR_SEVERITY[PythonErrorCode.NoIntersectionPlaneWarning]).toBe('warning');
  });

  it('should have both a severity and a localized message defined for every PythonErrorCode, keeping the two catalogs in sync', () => {
    TestBed.configureTestingModule({
      imports: [TranslocoTestingModule.forRoot({ langs: { en: {} } })]
    });
    const translocoService = TestBed.inject(TranslocoService);

    Object.values(PythonErrorCode).forEach((code) => {
      const severity = PYTHON_ERROR_SEVERITY[code];
      const message = formatPythonError(code, translocoService);

      expect(severity, `missing severity for ${code}`).toBeDefined();
      expect(['error', 'warning']).toContain(severity);
      expect(message, `missing localized message for ${code}`).not.toBeNull();
      expect(message?.length).toBeGreaterThan(0);
    });
  });

  it('should not have any severity entry without a matching PythonErrorCode enum value (no stale keys)', () => {
    const enumValues = new Set(Object.values(PythonErrorCode));
    Object.keys(PYTHON_ERROR_SEVERITY).forEach((key) => {
      expect(enumValues.has(key as PythonErrorCode)).toBe(true);
    });
  });
});
