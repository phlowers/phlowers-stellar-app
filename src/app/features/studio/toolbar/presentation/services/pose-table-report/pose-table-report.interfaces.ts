/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { PoseResults } from '@shared/domain/models/section.model';
import { BaseReportLabels } from '@shared/pdf/pdf-report.interfaces';

/** One column of the pose table result tables (one per computed temperature). */
export interface PoseTableResultRow {
  /** Formatted temperature (e.g. "-10 °C"), used as the column identifier. */
  temperature: string;
  /** Pose parameter (m). */
  poseParam: number | null;
  /** Horizontal tension T0 (daN). */
  horizontalTension: number | null;
}

/** Data required to generate the pose table PDF report. */
export interface PoseTableReportData {
  /** Report generation date (localized string, used for header and filename). */
  date: string;

  // Study & canton cartouche
  author: string;
  studyTitle: string;
  studyDescription: string;
  cantonName: string;
  cantonComment: string;
  icName: string;
  chargeName: string;
  chargeDescription: string;

  // Pose calculation context
  baseParameter: number | null;
  baseTemperature: number | null;
  equivalentSpan: number | null;
  lowestTemp: number;
  computingStep: number;

  /** Computed pose table results, in the order returned by the engine. */
  results: PoseResults;
}

/** Translated pose table report labels, resolved at report-generation time via TranslocoService. */
export interface PoseTableReportLabels extends BaseReportLabels {
  cartoucheTitle: string;
  canton: string;
  cantonComment: string;
  initialCondition: string;

  poseCalculationTitle: string;
  baseParameter: string;
  baseTemperature: string;
  equivalentSpan: string;
  lowestTemperature: string;
  computingStep: string;

  resultsTitle: string;
}
