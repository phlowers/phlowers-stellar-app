/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { TestBed } from '@angular/core/testing';
import { TranslocoService, TranslocoTestingModule } from '@jsverse/transloco';
import { formatPythonError, formatPythonWarnings } from './python-error-messages';
import { PythonDiagnostic } from './python-diagnostic.interfaces';
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
              'shared.python-errors.generated-points-none-error': 'No generated points were found after computation.',
              'shared.python-errors.obstacle-not-found-error':
                'The obstacle is not registered in the calculation engine.',
              'shared.python-errors.estimate-on-split-support-error':
                'Estimation is not possible on a span split by a virtual support.',
              'shared.python-errors.estimation-input-error': 'The estimation inputs are missing or invalid.',
              'shared.python-errors.estimation-not-converged-error':
                'The target cannot be reached within the estimation bounds.',
              'shared.python-errors.estimation-warning': 'The existing load on the estimated span was ignored.'
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

  it.each([
    [PythonErrorCode.EstimateOnSplitSupportError, 'Estimation is not possible on a span split by a virtual support.'],
    [PythonErrorCode.EstimationInputError, 'The estimation inputs are missing or invalid.'],
    [PythonErrorCode.EstimationNotConvergedError, 'The target cannot be reached within the estimation bounds.'],
    [PythonErrorCode.EstimationWarning, 'The existing load on the estimated span was ignored.'],
    [PythonErrorCode.ObstacleNotFoundError, 'The obstacle is not registered in the calculation engine.']
  ])('should return the localized estimation message for %s', (code, expected) => {
    expect(formatPythonError(code, translocoService)).toBe(expected);
  });

  it.each(Object.values(PythonErrorCode))('should format code %s to a non-null, non-empty message', (code) => {
    const message = formatPythonError(code, translocoService);
    expect(message).not.toBeNull();
    expect(typeof message).toBe('string');
    expect(message?.length).toBeGreaterThan(0);
  });

  describe('formatPythonWarnings', () => {
    const diagnostic = (code: PythonErrorCode, origin: PythonDiagnostic['origin']): PythonDiagnostic => ({
      code,
      severity: 'warning',
      origin,
      rawText: `${code}: raw`
    });

    it('returns one message per captured warning code, in order', () => {
      const messages = formatPythonWarnings(
        [
          diagnostic(PythonErrorCode.BalanceEngineWarning, 'warning'),
          diagnostic(PythonErrorCode.EstimationWarning, 'warning'),
          diagnostic(PythonErrorCode.BalanceEngineWarning, 'warning')
        ],
        translocoService
      );

      expect(messages).toEqual([
        'A balance engine warning was raised.',
        'The existing load on the estimated span was ignored.'
      ]);
    });

    it('ignores exception diagnostics', () => {
      expect(
        formatPythonWarnings([diagnostic(PythonErrorCode.ConvergenceError, 'exception')], translocoService)
      ).toEqual([]);
    });
  });
});
