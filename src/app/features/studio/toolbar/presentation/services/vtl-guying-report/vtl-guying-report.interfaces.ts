/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/** Data required to generate the VHL & Guying PDF report. */
export interface VtlGuyingReportData {
  /** Study author email or name. */
  author: string;
  /** Report generation date (formatted string). */
  date: string;
  /** Study title. */
  studyTitle: string;
  /** Study description. */
  studyDescription: string;
  /** Section (canton) name. */
  sectionName: string;
  /** Section (canton) comment. */
  sectionComment: string;
  /** Selected charge name. */
  chargeName: string;
  /** Selected charge description. */
  chargeDescription: string;

  /** Guying span label (e.g. "42 - 43"). */
  guyingSpan: string;
  /** Reference support label. */
  referenceSupport: string;
  /** Support type (e.g. "Suspension", "Arrêt"). */
  supportType: string;
  /** Altitude of the anchor point in meters. */
  altitude: number | null;
  /** Horizontal distance to the anchor point in meters. */
  horizontalDistance: number | null;
  /** Whether a pulley is used. */
  hasPulley: boolean;

  /** VTL without guying — Charge V (daN). */
  vtlChargeV: number | null;
  /** VTL without guying — Charge H (daN). */
  vtlChargeH: number | null;
  /** VTL without guying — Charge L (daN). */
  vtlChargeL: number | null;
  /** VTL without guying — Resultant (daN). */
  vtlResultant: number | null;

  /** VTL with guying — Tension in the guy wire (daN). */
  tensionInGuy: number | null;
  /** VTL with guying — Angle guy wire / horizon (°). */
  guyAngle: number | null;
  /** VTL with guying — Charge V under console (daN). */
  chargeVUnderConsole: number | null;
  /** VTL with guying — Charge H under console (daN). */
  chargeHUnderConsole: number | null;
  /** VTL with guying — Charge L if pulley (daN). */
  chargeLIfPulley: number | null;

  /** User comment. */
  comment: string;

  /** Diagram image as base64 data URL. */
  diagramImageBase64: string;
}

/** Translated PDF report labels, resolved at report-generation time via TranslocoService. */
export interface PdfLabels {
  reportTitle: string;
  studySectionTitle: string;
  author: string;
  date: string;
  study: string;
  section: string;
  studyDescription: string;
  sectionComment: string;
  chargeName: string;
  chargeDescription: string;
  vtlWithoutGuyingTitle: string;
  chargeV: string;
  chargeH: string;
  chargeL: string;
  resultant: string;
  guyingTitle: string;
  guyingSpan: string;
  referenceSupport: string;
  supportType: string;
  altitude: string;
  horizontalDistance: string;
  hasPulley: string;
  yes: string;
  no: string;
  vtlWithGuyingTitle: string;
  tensionInGuy: string;
  guyAngle: string;
  chargeVUnderConsole: string;
  chargeHUnderConsole: string;
  chargeLIfPulley: string;
  comment: string;
  vtlWithGuyingExplanation1: string;
  vtlWithGuyingExplanation2: string;
  pageLabel: string;
}
