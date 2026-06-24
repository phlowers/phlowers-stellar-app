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

/**
 * Support fields derived from a catalog attachment, shared by the supports
 * table (inline attachment-set edit / copy column) and the attachment-set
 * modal. Centralizes the mapping rules — notably truncating the arm length to
 * one decimal — so both call sites stay consistent.
 *
 * Absent values use `null` (not `undefined`) to match the `Support` domain
 * model, since these fields are merged straight into a support and persisted.
 */
export interface DerivedSupportAttachmentFields {
  towerModel: string | null;
  armLength: number | null;
  heightBelowConsole: number | null;
}
