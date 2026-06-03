/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

export type SupportManipType = 'crane' | 'rope' | 'shifting';
export type SupportAnchoringType = 'with_chain' | 'without_chain';

/**
 * A single manipulation applied at a support.
 * Both manip1 and manip2 share this shape; irrelevant fields are null.
 *
 * @category Domain Models
 */
export interface CableSupportManipItem {
  type: SupportManipType;
  /** Vertical cable displacement in meters (crane only). */
  vertDisplacement: number | null;
  /** Anchoring type (crane only). */
  anchoring: SupportAnchoringType | null;
  /** Lateral distance in meters (crane only). */
  lateralDistance: number | null;
  /** Rope length in meters (rope only). */
  ropeLength: number | null;
  /** Shifting clamp length in meters (shifting only). */
  shiftingClampLength: number | null;
}

/**
 * Represents a cable support manipulation stored per support and charge case.
 *
 * @remarks
 * Tied to both a support UUID and a charge case UUID so that switching load
 * cases shows only the manipulations that belong to the active case.
 *
 * @category Domain Models
 */
export interface CableSupportManipulation {
  /** Unique identifier (UUID v4) */
  uuid: string;
  /** UUID of the support this manipulation applies to */
  supportUuid: string;
  /** UUID of the charge case this manipulation belongs to */
  chargeUuid: string;
  /** Primary manipulation */
  manip1: CableSupportManipItem;
  /** Optional secondary manipulation (only shifting available in current UI) */
  manip2: CableSupportManipItem | null;
}
