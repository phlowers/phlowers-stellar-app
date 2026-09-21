/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { BaseReportLabels } from '@shared/pdf/pdf-report.interfaces';

/** Climate condition row for the charges report. */
export interface ClimateReportRow {
  /** Wind pressure (Pa) */
  windPressure: number | null;
  /** Cable temperature (°C) */
  cableTemperature: number | null;
  /** Symmetry type ('Symmetric' or 'Dis-Symmetric') */
  symmetryType: string;
  /** Ice thickness in cm (symmetric case) */
  iceThickness: number | null;
  /** Frontier support number (dis-symmetric case) */
  frontierSupportNumber: number | null;
  /** Ice thickness before frontier support (dis-symmetric case, cm) */
  iceThicknessBefore: number | null;
  /** Ice thickness after frontier support (dis-symmetric case, cm) */
  iceThicknessAfter: number | null;
}

/** Span load row for the charges report. */
export interface SpanLoadReportRow {
  /** Span label (e.g. 'S1 - S2') */
  spanLabel: string;
  /** Reference support label */
  referenceSupport: string;
  /** Load type ('Punctual' or 'Marking') */
  type: string;
  /** Load weight (daN) or marking value */
  loadWeight: number;
  /** Load position (m) */
  loadPosition: number;
}

/** Cable modification row for the charges report. */
export interface CableModifReportRow {
  /** Span label (e.g. 'S1 - S2') */
  spanLabel: string;
  /** Reference support label */
  referenceSupport: string;
  /** Modification type ('Lengthening' or 'Shortening') */
  modificationType: string;
  /** Modified cable length (m) */
  modifiedLengthCable: number;
  /** Distance to reference support (m) */
  distanceSupportRef: number;
}

/** Support manipulation row for the charges report. */
export interface SupportManipReportRow {
  /** Display index (1-based, null for second line if exists) */
  displayIndex: number | null;
  /** Support label (e.g. 'S1') */
  supportLabel: string;
  /** Manipulation type (Crane, Rope, Shifting) */
  type: string;
  /** Shifting clamp length (m, shifting only) */
  shiftingClampLength: number | null;
  /** Vertical displacement (m, crane only) */
  vertDisplacement: number | null;
  /** Anchoring type (crane only) */
  anchoring: string | null;
  /** Lateral distance (m, crane only) */
  lateralDistance: number | null;
  /** Rope length (m, rope only) */
  ropeLength: number | null;
  /** Chain name (with_chain anchor) */
  chainName: string | null;
  /** Chain length (m, with_chain anchor) */
  chainLength: number | null;
  /** Chain weight (kg, with_chain anchor) */
  chainWeight: number | null;
  /** Chain surface (m², with_chain anchor) */
  chainSurface: number | null;
  /** Counter weight (kg, with_chain anchor) */
  counterWeight: number | null;
}

/** Span manipulation row for the charges report. */
export interface SpanManipReportRow {
  /** Span label (e.g. 'S1 - S2') */
  spanLabel: string;
  /** Reference support label */
  referenceSupport: string;
  /** Distance to reference support (m) */
  distanceToRefSupport: number;
  /** Cable manipulation type (With a crane, Temporary support) */
  cableManipType: string;
  /** Cable manipulation method (Clamp, Pulley) */
  cableManipMethod: string;
  /** Longitudinal distance (m, with_a_crane only) */
  longitudinalDistance: number | null;
  /** Lateral distance (m) */
  lateralDistance: number;
  /** Altitude (m) */
  altitude: number;
  /** Anchoring type (With sling, With chain) */
  anchoring: string;
  /** Sling length (m, with_sling only) */
  slingLength: number | null;
  /** Chain name (with_chain only) */
  chainName: string | null;
  /** Chain length (m, with_chain only) */
  chainLength: number | null;
  /** Chain weight (kg, with_chain only) */
  chainWeight: number | null;
  /** Chain surface (m², with_chain only) */
  chainSurface: number | null;
  /** Counter weight (kg, with_chain only) */
  counterWeight: number | null;
}

/** Data required to generate the charges table PDF report. */
export interface ChargesReportData {
  /** Report generation date/time (localized string, used for header and filename) */
  date: string;

  // Charge case metadata
  chargeName: string;
  chargeDescription: string;
  personnelPresence: boolean;

  // Climate (always 1 row)
  climate: ClimateReportRow;

  // Loads and markings (0+ rows)
  spanLoads: SpanLoadReportRow[];

  // Cable length modifications (0+ rows)
  cableModifications: CableModifReportRow[];

  // Support manipulations (0+ rows, may have 2 lines per entry)
  supportManipulations: SupportManipReportRow[];

  // Span manipulations (0+ rows)
  spanManipulations: SpanManipReportRow[];
}

/** Translation labels for the charges report. */
export interface ChargesReportLabels extends BaseReportLabels {
  reportTitle: string;
  chargeTitle: string;
  climateTitle: string;
  loadsTitle: string;
  cableModifTitle: string;
  supportManipTitle: string;
  spanManipTitle: string;
  pageLabel: string;

  chargeName: string;
  chargeDescription: string;
  personnelPresence: string;
}
