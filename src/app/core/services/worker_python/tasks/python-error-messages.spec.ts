/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { TestBed } from '@angular/core/testing';
import { TranslocoService, TranslocoTestingModule } from '@jsverse/transloco';
import { formatPythonError } from './python-error-messages';
import { PythonErrorCode } from './types';

describe('formatPythonError', () => {
  let translocoService: TranslocoService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [
        TranslocoTestingModule.forRoot({
          langs: {
            en: {
              'shared.python-errors.solver-error': 'A solver error occurred.',
              'shared.python-errors.suspected-chain-reversal':
                'The insulator chain is suspected to have reversed (above horizontal position).',
              'shared.python-errors.convergence-error': 'The solver failed to converge.',
              'shared.python-errors.shape-error': 'A shape mismatch was detected in arrays.',
              'shared.python-errors.data-warning': 'A data-related warning was raised.',
              'shared.python-errors.balance-engine-warning': 'A balance engine warning was raised.',
              'shared.python-errors.rts-data-not-available':
                'RTS catalog data (rts_cable, rts_layer_*) is missing or contains NaN values.',
              'shared.python-errors.no-intersection-plane-warning':
                'The object position imposes a distance plane that does not intersect the cable.',
              'shared.python-errors.no-intersection-plane-for-distance-error':
                'No intersection plane was found for the distance calculation.',
              'shared.python-errors.measurement-data-not-available': 'Measurement data is not available.',
              'shared.python-errors.uncertainty-not-available': 'Uncertainty data is not available.',
              'shared.python-errors.invalid-manipulation-index': 'The manipulation index provided is invalid.',
              'shared.python-errors.invalid-manipulation-keys': 'The manipulation keys provided are invalid.',
              'shared.python-errors.invalid-manipulation-range': 'The manipulation range provided is invalid.',
              'shared.python-errors.support-out-of-range-error': 'The support is out of the valid range.',
              'shared.python-errors.generated-points-none-error': 'No generated points were found after computation.'
            }
          },
          translocoConfig: {
            availableLangs: ['en'],
            defaultLang: 'en'
          },
          preloadLangs: true
        })
      ]
    });
    translocoService = TestBed.inject(TranslocoService);
    translocoService.setActiveLang('en');
  });

  it('should return null when code is null', () => {
    expect(formatPythonError(null, translocoService)).toBeNull();
  });

  it('should return the localized message for a known code', () => {
    expect(formatPythonError(PythonErrorCode.SolverError, translocoService)).toBe('A solver error occurred.');
  });

  it.each(Object.values(PythonErrorCode))('should format code %s to a non-null, non-empty message', (code) => {
    const message = formatPythonError(code, translocoService);
    expect(message).not.toBeNull();
    expect(typeof message).toBe('string');
    expect(message?.length).toBeGreaterThan(0);
  });
});
