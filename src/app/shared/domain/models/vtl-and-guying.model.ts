/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/**
 * Input parameters for VTL (Vertical Tension Load) and guying calculations.
 *
 * @remarks
 * These inputs define the geometric configuration for calculating
 * guy wire tensions and support loads.
 *
 * @category Domain Models
 */
export interface VtlAndGuyingInputs {
  /** Selected span information */
  selectedSpan: {
    /** Index of the span in the section */
    index: number;
    /** UUID of the span */
    uuid: string;
  } | null;
  /** Which support to use as reference (LEFT or RIGHT) */
  selectedSupport: 'LEFT' | 'RIGHT' | null;
  /** Altitude of the anchor point in meters */
  altitude: number | null;
  /** Horizontal distance to the anchor point in meters */
  horizontalDistance: number | null;
  /** Whether a pulley is used in the guying system */
  hasPulley: boolean;
}

/**
 * Output results from VTL and guying calculations.
 *
 * @remarks
 * Contains the calculated forces and angles for guy wire design.
 *
 * @category Domain Models
 */
export interface VtlAndGuyingOutputs {
  /** Tension force in the guy wire (kN) */
  tensionInGuy: number | null;
  /** Angle of the guy wire (gradient) */
  guyAngle: number | null;
  /** Vertical load under the console (kN) */
  chargeVUnderConsole: number | null;
  /** Horizontal load under the console (kN) */
  chargeHUnderConsole: number | null;
  /** Longitudinal load if pulley is used (kN) */
  chargeLIfPulley: number | null;
}

/**
 * VTL and Guying domain model - represents guying calculation data.
 *
 * @remarks
 * This model stores both input parameters and calculation results
 * for guy wire tension analysis on power line supports.
 *
 * @example
 * ```typescript
 * const vtlAndGuying: VtlAndGuying = {
 *   inputs: {
 *     selectedSpan: { index: 0, uuid: '...' },
 *     selectedSupport: 'LEFT',
 *     altitude: 150,
 *     horizontalDistance: 25,
 *     hasPulley: false
 *   },
 *   outputs: null,
 *   comment: 'Guying for span 1'
 * };
 * ```
 *
 * @category Domain Models
 */
export interface VtlAndGuying {
  /** Input parameters for the calculation */
  inputs: VtlAndGuyingInputs;
  /** Calculation results (null before calculation) */
  outputs: VtlAndGuyingOutputs | null;
  /** User comment about the guying configuration */
  comment: string;
}
