/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { FieldMeasure } from '@features/studio/field-measuring/domain/types';
import {
  BaseReportLabels,
  PdfBulletItem,
  StudyCartoucheData,
  StudyCartoucheLabels
} from '@shared/pdf/pdf-report.interfaces';

/** One row of a two-column report section: left and right items, `null` leaving the cell empty. */
export type FieldMeasureReportRow = readonly [PdfBulletItem | null, PdfBulletItem | null];

/** A titled paragraph of the field measure report — one per tab of the field measuring form. */
export interface FieldMeasureReportSection {
  title: string;
  rows: FieldMeasureReportRow[];
}

/** Data required to generate the field measure PDF report, already formatted for display. */
export interface FieldMeasureReportData {
  /** Generation date shown in the header (localized, date only). */
  date: string;
  /** Generation date, hours and minutes, used in the file name. */
  fileDate: string;
  measureName: string;
  sectionName: string;
  cartouche: StudyCartoucheData;
  sections: FieldMeasureReportSection[];
}

/** Translated fixed labels of the field measure report, resolved at generation time via Transloco. */
export interface FieldMeasureReportLabels
  extends StudyCartoucheLabels, Pick<BaseReportLabels, 'reportTitle' | 'pageLabel'> {
  studyCantonTitle: string;
}

/** Fields of a `FieldMeasure` read for one tangent aiming sub-method (support, exterior or interior). */
export interface TangentAimingReportConfig {
  leftSupport: keyof FieldMeasure;
  spanLength: keyof FieldMeasure;
  /** Distance from the device to the left cable attachment, and the label key saying whether it is vertical or horizontal. */
  distance: keyof FieldMeasure;
  distanceLabelKey: string;
  /** Vertical angle at the left cable attachment; the support sub-method does not have one. */
  verticalAngleLeft: keyof FieldMeasure | null;
  verticalAngleRight: keyof FieldMeasure;
  calculationType: keyof FieldMeasure;
  parameter: keyof FieldMeasure;
  tangentAngle: keyof FieldMeasure;
  output: 'tangentAimingSupport' | 'tangentAimingExterior' | 'tangentAimingInterior';
}
