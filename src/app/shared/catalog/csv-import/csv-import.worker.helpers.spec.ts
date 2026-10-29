/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { describe, expect, it } from 'vitest';
import { CatalogIntegrityError } from './csv-import.errors';
import { fromWorkerErrorMessage, toWorkerErrorMessage } from './csv-import.worker.helpers';

describe('csv-import worker error helpers', () => {
  it('tags integrity errors with the integrity code', () => {
    expect(toWorkerErrorMessage('cables', new CatalogIntegrityError('bad'))).toEqual({
      type: 'error',
      csvKey: 'cables',
      message: 'bad',
      code: 'integrity'
    });
  });

  it('leaves other errors and non-Error values untagged', () => {
    expect(toWorkerErrorMessage('cables', new Error('quota'))).toEqual({
      type: 'error',
      csvKey: 'cables',
      message: 'quota'
    });
    expect(toWorkerErrorMessage('cables', 'oops').message).toBe('oops');
  });

  it('rebuilds a distinguishable error from the message', () => {
    expect(fromWorkerErrorMessage({ type: 'error', csvKey: 'cables', message: 'm', code: 'integrity' })).toBeInstanceOf(
      CatalogIntegrityError
    );
    expect(fromWorkerErrorMessage({ type: 'error', csvKey: 'cables', message: 'm' })).not.toBeInstanceOf(
      CatalogIntegrityError
    );
  });
});
