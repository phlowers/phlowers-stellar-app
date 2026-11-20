/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/**
 * A forest trenches calculation failure.
 *
 * @remarks
 * `message` is the technical cause, meant for the log. `displayMessage` is its localized counterpart, shown to the user.
 */
export class ForestTrenchesError extends Error {
  constructor(
    message: string,
    readonly displayMessage: string
  ) {
    super(message);
    this.name = 'ForestTrenchesError';
  }
}
