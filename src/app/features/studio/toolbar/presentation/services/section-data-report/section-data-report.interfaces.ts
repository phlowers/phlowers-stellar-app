/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { BaseReportLabels } from '@shared/pdf/pdf-report.interfaces';

/** One row of per-support input data for the canton data report tables (page 2+). */
export interface CantonSupportRow {
  /** Support number identifier (raw string). */
  supportNumber: string;
  /** Cable attachment height (m). */
  attachmentHeight: number | null;
  /** Span angle (gr). */
  spanAngle: number | null;
  /** Insulator chain name. */
  chainName: string;
  /** Insulator chain length (m). */
  chainLength: number | null;
  /** Insulator chain weight (kg). */
  chainWeight: number | null;
  /** Support display name. */
  supportName: string;
  /** Attachment set identifier. */
  attachmentSet: string;
  /** Arm/crossarm length (m). */
  armLength: number | null;
  /** Whether the chain is V-shaped (localized "Yes"/"No"). */
  chainV: string;
  /** Counter weight (kg). */
  counterWeight: number | null;
  /** Altitude at the support foot (m). */
  supportFootAltitude: number | null;
  /** Attachment position identifier. */
  attachmentPosition: string;
  /** Tower model/file name. */
  towerModel: string;
}

/** Initial condition values for the canton data report (page 1, section C). */
export interface CantonReportInitialCondition {
  /** Base sag parameter (m). */
  baseParameter: number | null;
  /** Reference temperature (°C). */
  baseTemperature: number | null;
  /** Cable pretension (%CRA). */
  cablePretension: number | null;
  /** Minimum temperature (°C). */
  minTemperature: number | null;
  /** Maximum wind pressure (Pa). */
  maxWindPressure: number | null;
  /** Maximum frost/ice width (cm). */
  maxFrostWidth: number | null;
}

/** Data required to generate the canton data PDF report. */
export interface CantonReportData {
  /** Report generation date/time (localized string, used for header and filename). */
  date: string;

  // Section A — study & canton
  author: string;
  studyTitle: string;
  studyDescription: string;
  cantonName: string;
  comment: string;
  icName: string;
  chargeName: string;
  chargeDescription: string;

  // Section B — canton
  type: string;
  cableName: string;
  /** Maintenance center label (CM). */
  maintenanceCenter: string;
  litName: string;
  supportsCount: number;
  supportsDescription: string;
  /** Whether the section type is "phase" (drives the electric phase number display). */
  isPhase: boolean;
  phaseNumber: number | null;
  cablesAmount: number | null;
  /** Maintenance team label (EEL). */
  maintenanceTeam: string;
  branchName: string;

  // Section C — initial condition (omitted when no IC is selected)
  initialCondition: CantonReportInitialCondition | null;
  /** Whether the cable is non-linear (polynomial), enabling extra IC rows. */
  isNonLinear: boolean;

  // Pages 2+ — supports list
  supports: CantonSupportRow[];
}

/** Translated canton data report labels, resolved at report-generation time via TranslocoService. */
export interface CantonReportLabels extends BaseReportLabels {
  studyCantonTitle: string;
  cantonTitle: string;
  initialConditionTitle: string;
  supportsTitle: string;

  // Section A
  canton: string;
  comment: string;
  initialCondition: string;

  // Section B
  type: string;
  cableName: string;
  maintenanceCenter: string;
  lit: string;
  supportsCount: string;
  supportsDescription: string;
  phaseNumber: string;
  cablesAmount: string;
  maintenanceTeam: string;
  branch: string;

  // Section C
  baseParameter: string;
  cablePretension: string;
  maxWindPressure: string;
  baseTemperature: string;
  minTemperature: string;
  maxFrostWidth: string;
}

/** A single bullet item (label + value) drawn on page 1. */
export interface CantonBullet {
  label: string;
  value: string;
}
