/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

// ─── PDF LAYOUT OVERVIEW ─────────────────────────────────────────────────────
//  Single A4 portrait page: header, study & canton cartouche, hanging calculation context (2 columns),
//  then the hanging results as one transposed table row set (@shared/pdf/pdf-table.helpers)
// ─────────────────────────────────────────────────────────────────────────────

import type jsPDF from 'jspdf';

import { PoseResults } from '@shared/domain/models/section.model';
import { PDF_UNITS } from '@shared/pdf/pdf-layout.constantes';
import {
  drawHeader,
  drawTitledBulletSection,
  drawTwoColumnBulletSection,
  formatValue
} from '@shared/pdf/pdf-primitives.helpers';
import { PdfBulletItem } from '@shared/pdf/pdf-report.interfaces';

import {
  HangingTableReportData,
  HangingTableReportLabels,
  HangingTableResultRow
} from './hanging-table-report.interfaces';

/** Formats a temperature as entered/computed, without rounding (mirrors the hanging table UI). */
export function formatTemperature(value: number): string {
  return `${value} ${PDF_UNITS.celsius}`;
}

/** Builds one result row per computed temperature, pairing it with its hanging parameter and tension. */
export function buildHangingTableRows(results: PoseResults): HangingTableResultRow[] {
  return results.temperatures.map((temperature, index) => ({
    temperature: formatTemperature(temperature),
    hangingParam: results.poseParams[index] ?? null,
    horizontalTension: results.horizontalTensions[index] ?? null
  }));
}

/** Maps the active Transloco language to the locale used for the report date. */
export function getReportDateLocale(activeLang: string): string {
  return activeLang === 'en' ? 'en-US' : 'fr-FR';
}

/** Draws the study & canton metadata section (page 1, portrait, 1 column). Returns the next Y. */
export function drawStudyAndCantonSection(
  doc: jsPDF,
  data: HangingTableReportData,
  labels: HangingTableReportLabels,
  startY: number
): number {
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
  return drawTitledBulletSection(doc, labels.cartoucheTitle, items, startY);
}

/** Draws the hanging calculation context section (page 1, portrait, 2 columns). Returns the next Y. */
export function drawHangingCalculationSection(
  doc: jsPDF,
  data: HangingTableReportData,
  labels: HangingTableReportLabels,
  startY: number
): number {
  const left: PdfBulletItem[] = [
    { label: labels.baseParameter, value: formatValue(data.baseParameter, PDF_UNITS.meters, 2) },
    { label: labels.baseTemperature, value: formatValue(data.baseTemperature, PDF_UNITS.celsius, 1) },
    { label: labels.equivalentSpan, value: formatValue(data.equivalentSpan, PDF_UNITS.meters, 1) }
  ];
  const right: PdfBulletItem[] = [
    { label: labels.lowestTemperature, value: formatTemperature(data.lowestTemp) },
    { label: labels.computingStep, value: formatTemperature(data.computingStep) }
  ];
  return drawTwoColumnBulletSection(doc, labels.hangingCalculationTitle, left, right, startY);
}

/** Draws the report's context sections (portrait). Returns the Y where the results can start. */
export function drawHangingTableReportPage1(
  doc: jsPDF,
  data: HangingTableReportData,
  labels: HangingTableReportLabels
): number {
  let y = drawHeader(doc, data.date || '-', labels.reportTitle);
  y = drawStudyAndCantonSection(doc, data, labels, y);
  return drawHangingCalculationSection(doc, data, labels, y);
}
