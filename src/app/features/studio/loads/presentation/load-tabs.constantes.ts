/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

// Values of the Loads panel tabs, as read and written through `LoadFormsService.activeLoadTab`
export const LOAD_TAB = {
  SPAN_LOAD: '1',
  CABLE_MODIFICATION: '2',
  CABLE_SUPPORT_MANIP: '3'
} as const;
