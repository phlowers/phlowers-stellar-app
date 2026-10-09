/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import type jsPDF from 'jspdf';

import { SymmetryType } from '@shared/domain/models/charge.model';
import { PDF_UNITS } from '@shared/pdf/pdf-layout.constantes';
import { PdfBulletItem } from '@shared/pdf/pdf-report.interfaces';
import {
  drawHeader,
  drawStudyCartoucheSection,
  drawTitledBulletSection,
  formatValue
} from '@shared/pdf/pdf-primitives.helpers';

import { LoadsReportData, LoadsReportLabels } from './loads-data-report.interfaces';

/** Draws the study & canton metadata section (page 1, portrait, 1 column). Returns the next Y. */
export function drawStudyAndCantonSection(
  doc: jsPDF,
  data: LoadsReportData,
  labels: LoadsReportLabels,
  startY: number
): number {
  return drawStudyCartoucheSection(
    doc,
    labels.cartoucheTitle,
    { ...labels, comment: labels.cantonComment },
    { ...data, cantonName: data.sectionName, comment: data.cantonComment },
    startY
  );
}

/** Draws the climate conditions section (always exactly one row) + personnel presence. Returns the next Y. */
export function drawClimateSection(
  doc: jsPDF,
  data: LoadsReportData,
  labels: LoadsReportLabels,
  startY: number
): number {
  const climate = data.climate;
  const isDisSymmetric = climate.symmetryType === SymmetryType.DIS_SYMMETRIC;

  const items: PdfBulletItem[] = [
    { label: labels.windPressure, value: formatValue(climate.windPressure, PDF_UNITS.pascal, 0) },
    { label: labels.cableTemperature, value: formatValue(climate.cableTemperature, PDF_UNITS.celsius, 0) },
    { label: labels.personnelPresence, value: data.personnelPresence ? labels.yes : labels.no },
    {
      label: labels.iceIndicator,
      value: climate.symmetryType === SymmetryType.DIS_SYMMETRIC ? labels.disSymmetric : labels.symmetric
    },
    ...(isDisSymmetric
      ? [
          { label: labels.frontierSupport, value: data.frontierSupportLabel ?? '-' },
          {
            label: labels.iceThicknessBefore,
            value: formatValue(climate.iceThicknessBefore, PDF_UNITS.centimeters, 0)
          },
          { label: labels.iceThicknessAfter, value: formatValue(climate.iceThicknessAfter, PDF_UNITS.centimeters, 0) }
        ]
      : [{ label: labels.iceThickness, value: formatValue(climate.iceThickness, PDF_UNITS.centimeters, 0) }])
  ];
  return drawTitledBulletSection(doc, labels.climateTitle, items, startY);
}

/**
 * Draws the loads table report's first page (portrait):
 * - Header with report title
 * - Study & canton cartouche
 * - Climate conditions + personnel presence
 *
 * Result tables (loads, cable modifications, support/span manipulations) are drawn on
 * subsequent landscape pages by the service via `shared/pdf/pdf-table.helpers.ts`.
 *
 * @param doc — jsPDF document instance
 * @param data — loads report data
 * @param labels — localized report labels
 */
export function drawLoadsReportPage1(doc: jsPDF, data: LoadsReportData, labels: LoadsReportLabels): void {
  const date = data.date || '-';
  let y = drawHeader(doc, date, labels.reportTitle);
  y = drawStudyAndCantonSection(doc, data, labels, y);
  drawClimateSection(doc, data, labels, y);
}
