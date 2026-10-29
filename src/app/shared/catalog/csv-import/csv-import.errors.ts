/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/**
 * The downloaded catalog does not match its expected SHA-256 hash.
 *
 * @remarks
 * Only this error means the downloaded (possibly cached) copy is corrupted, so downloading it again can help.
 * Every other import failure (worker crash, parsing, IndexedDB quota, ...) is unrelated to the downloaded bytes.
 * It crosses the worker boundary as `CsvImportErrorMessage.code === 'integrity'`.
 */
export class CatalogIntegrityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CatalogIntegrityError';
  }
}
