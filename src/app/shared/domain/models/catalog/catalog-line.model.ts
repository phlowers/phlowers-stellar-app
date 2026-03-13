/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/**
 * Catalog line domain model - represents power line metadata.
 *
 * @remarks
 * Contains identification information for power lines including
 * link, LIT, branch, and voltage references.
 *
 * @category Catalog Models
 */
export interface CatalogLine {
  /** Unique identifier (UUID v4) */
  uuid: string;
  /** Link IDR reference */
  link_idr: string;
  /** Link ADR reference */
  link_adr: string;
  /** LIT IDR reference */
  lit_idr: string;
  /** LIT ADR reference */
  lit_adr: string;
  /** Branch ID */
  branch_id: string;
  /** Branch IDR reference */
  branch_idr: string;
  /** Branch ADR reference */
  branch_adr: string;
  /** Voltage IDR reference */
  voltage_idr: string;
  /** Voltage ADR reference */
  voltage_adr: string;
}
