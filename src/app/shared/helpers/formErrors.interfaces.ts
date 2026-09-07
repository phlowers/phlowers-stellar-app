/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/** Transloco key and interpolation params to display for a number input's active error. */
export interface NumberInputErrorParams {
  key: string;
  params: Record<string, number>;
}
