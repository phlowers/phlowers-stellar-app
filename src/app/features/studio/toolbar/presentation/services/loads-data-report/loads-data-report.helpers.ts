/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import type jsPDF from 'jspdf';

import { CableSupportManipulation, SupportAnchoringType, SupportManipType } from '@shared/domain/models/cable-support-manipulation.model';
import { SymmetryType } from '@shared/domain/models/charge.model';
import { CONTENT_WIDTH, PAGE_MARGIN, PARAGRAPH_INDENT, PDF_UNITS } from '@shared/pdf/pdf-layout.constantes';
import { PdfBulletItem } from '@shared/pdf/pdf-report.interfaces';
import { drawBulletList, drawHeader, drawSectionTitle, drawSeparator, formatValue } from '@shared/pdf/pdf-primitives.helpers';

import { LoadsReportData, LoadsReportLabels, SupportManipReportRow } from './loads-data-report.interfaces';

/**
 * Flattens support manipulations (`manip1` + optional `manip2`) into one column per instance for
 * the transposed support manipulation table. The display index (N°) is only shown on the first
 * instance of a given support manipulation.
 */
export function flattenSupportManipulations(
  manipulations: CableSupportManipulation[],
  resolveSupportLabel: (supportUuid: string) => string,
  resolveTypeLabel: (type: SupportManipType) => string,
  resolveAnchoringLabel: (anchoring: SupportAnchoringType | null) => string | null
): SupportManipReportRow[] {
  const rows: SupportManipReportRow[] = [];

  manipulations.forEach((manip, index) => {
    const supportLabel = resolveSupportLabel(manip.supportUuid);

    rows.push({
      displayIndex: String(index + 1),
      supportLabel,
      ...manip.manip1,
      type: resolveTypeLabel(manip.manip1.type),
      anchoring: resolveAnchoringLabel(manip.manip1.anchoring)
    });

    if (manip.manip2) {
      rows.push({
        displayIndex: '',
        supportLabel,
        ...manip.manip2,
        type: resolveTypeLabel(manip.manip2.type),
        anchoring: resolveAnchoringLabel(manip.manip2.anchoring)
      });
    }
  });

  return rows;
}

/** Draws the study & canton metadata section (page 1, portrait, 1 column). Returns the next Y. */
export function drawStudyAndCantonSection(
  doc: jsPDF,
  data: LoadsReportData,
  labels: LoadsReportLabels,
  startY: number
): number {
  let y = drawSectionTitle(doc, labels.cartoucheTitle, startY);
  const leftX = PAGE_MARGIN.left + PARAGRAPH_INDENT;
  const wrapWidth = CONTENT_WIDTH - PARAGRAPH_INDENT;

  const items: PdfBulletItem[] = [
    { label: labels.author, value: data.author || '-', wrap: true },
    { label: labels.study, value: data.studyTitle || '-', wrap: true },
    { label: labels.studyDescription, value: data.studyDescription || '-', wrap: true },
    { label: labels.canton, value: data.cantonName || '-', wrap: true },
    { label: labels.cantonComment, value: data.cantonComment || '-', wrap: true },
    { label: labels.initialCondition, value: data.icName || '-', wrap: true },
    { label: labels.chargeName, value: data.chargeName || '-', wrap: true },
    { label: labels.chargeDescription, value: data.chargeDescription || '-', wrap: true }
  ];
  y = drawBulletList(doc, items, y, leftX, wrapWidth);

  return drawSeparator(doc, y);
}

/** Draws the climate conditions section (always exactly one row) + personnel presence. Returns the next Y. */
export function drawClimateSection(
  doc: jsPDF,
  data: LoadsReportData,
  labels: LoadsReportLabels,
  startY: number
): number {
  let y = drawSectionTitle(doc, labels.climateTitle, startY);
  const leftX = PAGE_MARGIN.left + PARAGRAPH_INDENT;
  const climate = data.climate;
  const isDisSymmetric = climate.symmetryType === SymmetryType.DIS_SYMMETRIC;

  const items: PdfBulletItem[] = [
    { label: labels.windPressure, value: formatValue(climate.windPressure, PDF_UNITS.pascal, 0) },
    { label: labels.cableTemperature, value: formatValue(climate.cableTemperature, PDF_UNITS.celsius, 0) },
    {
      label: labels.iceIndicator,
      value: climate.symmetryType === SymmetryType.DIS_SYMMETRIC ? labels.disSymmetric : labels.symmetric
    },
    ...(isDisSymmetric
      ? [
          { label: labels.frontierSupport, value: String(climate.frontierSupportNumber) },
          {
            label: labels.iceThicknessBefore,
            value: formatValue(climate.iceThicknessBefore, PDF_UNITS.centimeters, 0)
          },
          { label: labels.iceThicknessAfter, value: formatValue(climate.iceThicknessAfter, PDF_UNITS.centimeters, 0) }
        ]
      : [{ label: labels.iceThickness, value: formatValue(climate.iceThickness, PDF_UNITS.centimeters, 0) }]),
    { label: labels.personnelPresence, value: data.personnelPresence ? labels.yes : labels.no }
  ];
  y = drawBulletList(doc, items, y, leftX, CONTENT_WIDTH - PARAGRAPH_INDENT);

  return drawSeparator(doc, y);
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

