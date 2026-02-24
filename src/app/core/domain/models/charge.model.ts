/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/**
 * Data structure containing climate and span load information.
 *
 * @category Domain Models
 */
export interface ChargeData {
  /** Climate conditions for the charge */
  climate: ClimateCharge;
  /** Array of loads applied on spans */
  spanLoads: SpanLoad[];
}

/**
 * Type of symmetry for climate loading conditions.
 *
 * @category Domain Models
 */
export enum SymmetryType {
  /** Symmetric loading on both sides of the span */
  SYMMETRIC = 'symmetric',
  /** Asymmetric loading with different conditions on each side */
  DIS_SYMMETRIC = 'dis_symmetric'
}

/**
 * Climate conditions for mechanical calculations.
 *
 * @remarks
 * Defines environmental conditions like wind, temperature, and ice
 * that affect cable tension calculations.
 *
 * @category Domain Models
 */
export interface ClimateCharge {
  /** Wind pressure in Pa (Pascal) */
  windPressure: number | null;
  /** Cable temperature in °C */
  cableTemperature: number | null;
  /** Type of symmetry for loading conditions */
  symmetryType: SymmetryType;
  /** Ice thickness in mm (for symmetric loading) */
  iceThickness: number | null;
  /** Support number at frontier (for asymmetric loading) */
  frontierSupportNumber: null;
  /** Ice thickness before frontier support */
  iceThicknessBefore: null;
  /** Ice thickness after frontier support */
  iceThicknessAfter: null;
}

/**
 * Charge domain model - represents load conditions for calculations.
 *
 * @remarks
 * A charge defines a specific load scenario with climate conditions
 * and optional span loads for mechanical analysis.
 *
 * @example
 * ```typescript
 * const charge: Charge = {
 *   uuid: '123e4567-e89b-12d3-a456-426614174000',
 *   name: 'Winter Load',
 *   personnelPresence: false,
 *   description: 'Maximum ice loading scenario',
 *   data: {
 *     climate: { windPressure: 480, cableTemperature: -5, ... },
 *     spanLoads: []
 *   }
 * };
 * ```
 *
 * @category Domain Models
 */
export interface Charge {
  /** Unique identifier (UUID v4) */
  uuid: string;
  /** Display name of the charge scenario */
  name: string;
  /** Whether personnel is present during this load condition */
  personnelPresence: boolean;
  /** Description of the charge scenario */
  description: string;
  /** Charge data containing climate and loads */
  data: ChargeData;
}

/**
 * Type of load applied on a span.
 *
 * @category Domain Models
 */
export enum LoadType {
  /** Point load at a specific position on the span */
  PUNCTUAL = 'punctual',
  /** Marking/signage load such as aircraft warning markers */
  MARKING = 'marking'
}

/**
 * Load applied on a span at a specific position.
 *
 * @remarks
 * Represents additional weight on the cable, such as
 * aircraft warning markers or other equipment.
 *
 * @category Domain Models
 */
export interface SpanLoad {
  /** Position along the span (0-100%) */
  loadPosition: number;
  /** Weight of the load in N (Newtons) */
  loadWeight: number;
  /** Type of load (punctual or marking) */
  type: LoadType;
  /** UUID of the support this load references */
  supportUuid: string;
  /** Which support the position is relative to */
  referenceSupport: 'LEFT' | 'RIGHT';
}
