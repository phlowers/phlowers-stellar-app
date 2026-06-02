/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/**
 * Dexie schema for the grouped catalog attachments table.
 * Primary key is `support_name` (one row per support).
 */
export const CATALOG_SUPPORT_ATTACHMENT_SCHEMA = {
  catSupportAttachments: `&support_name, support_tower`
};
