/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { formatPythonError } from './python-error-messages';
import { PythonErrorCode } from './types';

describe('formatPythonError', () => {
  it('should return null when code is null', () => {
    expect(formatPythonError(null)).toBeNull();
  });

  it('should return the localized message for a known code', () => {
    expect(formatPythonError(PythonErrorCode.SolverError)).toBe('A solver error occurred.');
  });
});
