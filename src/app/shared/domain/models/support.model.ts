/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/**
 * Support domain model - represents a power line support structure (tower/pole).
 *
 * @remarks
 * A support is a structure that holds the power line cables. It contains
 * all geometric and mechanical properties needed for sag-tension calculations.
 *
 * @example
 * ```typescript
 * const support: Support = {
 *   uuid: '123e4567-e89b-12d3-a456-426614174000',
 *   number: '42',
 *   name: 'Support 42',
 *   spanLength: 350,
 *   attachmentHeight: 25,
 *   // ... other properties
 * };
 * ```
 *
 * @category Domain Models
 */
export interface Support {
  /** Unique identifier (UUID v4) */
  uuid: string;
  /** Support number/identifier on the line */
  number: string | null;
  /** Display name of the support */
  name: string | null;
  /** Length of the span to the next support (meters) */
  spanLength: number | null;
  /** Angle of the span (gradients) */
  spanAngle: number | null;
  /** Attachment set number */
  attachmentSet: number | null;
  /** Height of cable attachment point (meters) */
  attachmentHeight: number | null;
  /** Height below the console (meters) */
  heightBelowConsole: number | null;
  /** Tower model/type identifier */
  towerModel: string | null;
  /** Type of cable attached */
  cableType: string | null;
  /** Length of the arm/crossarm (meters) */
  armLength: number | null;
  /** Name of the insulator chain */
  chainName: string | null;
  /** Length of the insulator chain (meters) */
  chainLength: number | null;
  /** Weight of the insulator chain (kg) */
  chainWeight: number | null;
  /** Whether the chain is V-shaped */
  chainV: boolean | null;
  /** Counter weight value (kg) */
  counterWeight: number | null;
  /** Altitude at the support foot (meters) */
  supportFootAltitude: number | null;
  /** Position of the attachment (e.g., 'left', 'right', 'center') */
  attachmentPosition: string | null;
  /** Surface area of the insulator chain (m²) */
  chainSurface: number | null;
  /** Azimut of the span (degrees) */
  spanAzimut: number | null;
  /** X coordinate of the support foot in Lambert 93 projection */
  xFootLambert93: number | null;
  /** Y coordinate of the support foot in Lambert 93 projection */
  yFootLambert93: number | null;
}
