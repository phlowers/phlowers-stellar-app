/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/**
 * Catalog line domain model
 */
export interface CatalogLine {
  uuid: string;
  link_idr: string;
  link_adr: string;
  lit_idr: string;
  lit_adr: string;
  branch_id: string;
  branch_idr: string;
  branch_adr: string;
  voltage_idr: string;
  voltage_adr: string;
}
