/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/**
 * Bridge interface for passing support name data to AttachmentService
 * without creating a circular dependency between `@shared` and `@features`.
 */
export interface SupportNameEntry {
  /** Short display name of the support (from SUPPORT_IDR or SUPPORT_ADR) */
  supportName: string;
  /** Tower model/type identifier */
  supportTower: string | null;
}
