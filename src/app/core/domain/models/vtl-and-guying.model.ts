/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/**
 * VTL and Guying input parameters
 */
export interface VtlAndGuyingInputs {
  selectedSpan: {
    index: number;
    uuid: string;
  } | null;
  selectedSupport: 'LEFT' | 'RIGHT' | null;
  altitude: number | null;
  horizontalDistance: number | null;
  hasPulley: boolean;
}

/**
 * VTL and Guying calculation outputs
 */
export interface VtlAndGuyingOutputs {
  tensionInGuy: number | null;
  guyAngle: number | null;
  chargeVUnderConsole: number | null;
  chargeHUnderConsole: number | null;
  chargeLIfPulley: number | null;
}

/**
 * VTL and Guying domain model - represents guying calculations
 */
export interface VtlAndGuying {
  inputs: VtlAndGuyingInputs;
  outputs: VtlAndGuyingOutputs | null;
  comment: string;
}
