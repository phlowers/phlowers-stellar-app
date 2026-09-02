/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/** One row of per-span computed results for the section state report tables. */
export interface SpanReportRow {
  /** Span label built from the two bounding support numbers (e.g. "42 - 43"). */
  spanNumber: string;
  spanLength: number | null;
  elevation: number | null;
  parameter: number | null;
  horizontalTension: number | null;
  tensionSup: number | null;
  tensionInf: number | null;
  sagF1: number | null;
  sagF2: number | null;
  horizontalDistance: number | null;
  naturalLength: number | null;
  arcLength: number | null;
  slopeLeft: number | null;
  slopeRight: number | null;
  utilizationRate: number | null;
}

/** One row of per-support computed results for the section state report tables. */
export interface SupportReportRow {
  /** Original support number (not truncated). */
  supportNumber: string;
  vChain: number | null;
  hChain: number | null;
  lChain: number | null;
  rChain: number | null;
  lineAngle: number | null;
  vConsole: number | null;
  hConsole: number | null;
  lConsole: number | null;
  rConsole: number | null;
  footAltitude: number | null;
  displacementX: number | null;
  displacementY: number | null;
  displacementZ: number | null;
  loadAngle: number | null;
}

/** Data required to generate the section state PDF report. */
export interface SectionStateReportData {
  /** Study author email or name. */
  author: string;
  /** Report generation date (formatted string). */
  date: string;
  /** Study title. */
  studyTitle: string;
  /** Study description. */
  studyDescription: string;
  /** Section name. */
  sectionName: string;
  /** Section comment. */
  sectionComment: string;
  /** Selected initial condition name. */
  icName: string;
  /** Selected charge name. */
  chargeName: string;
  /** Selected charge description. */
  chargeDescription: string;

  /** Maximum cable sag parameter over the selected section (m). */
  maxParameter: number | null;
  /** Maximum utilization (stress) rate over the selected section (%). */
  maxStressRate: number | null;

  /** Per-span result rows for the selected span range. */
  spans: SpanReportRow[];
  /** Per-support result rows for the selected support range. */
  supports: SupportReportRow[];
}

/** A single table row: a metric label plus one formatted value per column (span/support). */
export interface PdfTableRow {
  label: string;
  values: string[];
}

/** A rendered table model (a chunk of up to MAX_COLS_PER_TABLE columns). */
export interface PdfTableModel {
  rows: PdfTableRow[];
}

/** Translated PDF report labels, resolved at report-generation time via TranslocoService. */
export interface SectionReportLabels {
  reportTitle: string;
  cartoucheTitle: string;
  author: string;
  study: string;
  studyDescription: string;
  section: string;
  sectionComment: string;
  initialCondition: string;
  chargeName: string;
  chargeDescription: string;
  sectionStateTitle: string;
  maxParameter: string;
  maxStressRate: string;
  spansTitle: string;
  supportsTitle: string;
  pageLabel: string;
}
