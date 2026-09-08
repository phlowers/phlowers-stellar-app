/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

// ─── PDF LAYOUT OVERVIEW ─────────────────────────────────────────────────────
//  Page 1 — A4 portrait (210 × 297 mm):
//    drawHeader()                    → report title + date + separator (shared primitive)
//    drawStudyAndCantonSection()     → study & canton metadata bullets (1 column)
//    drawCantonSection()             → canton properties (2 columns)
//    drawInitialConditionSection()   → initial condition values (2 columns, optional)
//  Following pages — A4 landscape (297 × 210 mm):
//    drawResultTablesSection()       → transposed supports tables (shared with section-state-report)
// ─────────────────────────────────────────────────────────────────────────────

import jsPDF from 'jspdf';

import { Support } from '@shared/domain';
import { CONTENT_WIDTH, LINE_HEIGHT, PAGE_MARGIN, PARAGRAPH_INDENT, PDF_UNITS } from '@shared/pdf/pdf-layout.constantes';
import { PdfBulletItem } from '@shared/pdf/pdf-report.interfaces';
import {
  drawBulletItem,
  drawBulletList,
  drawHeader,
  drawSectionTitle,
  drawSeparator,
  formatValue
} from '@shared/pdf/pdf-primitives.helpers';

import { CantonBullet, CantonReportData, CantonReportLabels, CantonSupportRow } from './section-data-report.interfaces';

/** Builds the per-support input rows for the supports list tables. */
export function buildSupportRows(supports: Support[], chainVYes: string, chainVNo: string): CantonSupportRow[] {
  const formatChainV = (chainV: boolean | null): string => {
    if (chainV === null) return '-';
    return chainV ? chainVYes : chainVNo;
  };
  return supports.map((support) => ({
    supportNumber: support.number ?? '-',
    attachmentHeight: support.attachmentHeight,
    spanAngle: support.spanAngle,
    chainName: support.chainName ?? '-',
    chainLength: support.chainLength,
    chainWeight: support.chainWeight,
    supportName: support.name ?? '-',
    attachmentSet: support.attachmentSet != null ? String(support.attachmentSet) : '-',
    armLength: support.armLength,
    chainV: formatChainV(support.chainV),
    counterWeight: support.counterWeight,
    supportFootAltitude: support.supportFootAltitude,
    attachmentPosition: support.attachmentPosition ?? '-',
    towerModel: support.towerModel ?? '-'
  }));
}

/**
 * Draws two columns of bullet items side by side, each column advancing independently.
 * Returns the Y position below the taller column.
 */
function drawTwoColumnBullets(doc: jsPDF, left: CantonBullet[], right: CantonBullet[], startY: number): number {
  const leftX = PAGE_MARGIN.left + PARAGRAPH_INDENT;
  const rightX = PAGE_MARGIN.left + PARAGRAPH_INDENT + CONTENT_WIDTH / 2;

  let leftY = startY;
  left.forEach((item) => {
    if (item.label) {
      drawBulletItem(doc, item.label, item.value, leftX, leftY);
    }
    leftY += LINE_HEIGHT;
  });

  let rightY = startY;
  right.forEach((item) => {
    if (item.label) {
      drawBulletItem(doc, item.label, item.value, rightX, rightY);
    }
    rightY += LINE_HEIGHT;
  });

  return Math.max(leftY, rightY);
}

/** Draws the study & canton metadata section (page 1, portrait, 1 column). Returns the next Y. */
export function drawStudyAndCantonSection(
  doc: jsPDF,
  data: CantonReportData,
  labels: CantonReportLabels,
  startY: number
): number {
  let y = drawSectionTitle(doc, labels.studyCantonTitle, startY);
  const leftX = PAGE_MARGIN.left + PARAGRAPH_INDENT;
  const wrapWidth = CONTENT_WIDTH - PARAGRAPH_INDENT;

  const items: PdfBulletItem[] = [
    { label: labels.author, value: data.author || '-', wrap: true },
    { label: labels.study, value: data.studyTitle || '-', wrap: true },
    { label: labels.studyDescription, value: data.studyDescription || '-', wrap: true },
    { label: labels.canton, value: data.cantonName || '-', wrap: true },
    { label: labels.comment, value: data.comment || '-', wrap: true },
    { label: labels.initialCondition, value: data.icName || '-', wrap: true },
    { label: labels.chargeName, value: data.chargeName || '-', wrap: true },
    { label: labels.chargeDescription, value: data.chargeDescription || '-', wrap: true }
  ];
  y = drawBulletList(doc, items, y, leftX, wrapWidth);

  return drawSeparator(doc, y);
}

/** Draws the canton properties section (page 1, portrait, 2 columns). Returns the next Y. */
export function drawCantonSection(
  doc: jsPDF,
  data: CantonReportData,
  labels: CantonReportLabels,
  startY: number
): number {
  const y = drawSectionTitle(doc, labels.cantonTitle, startY);

  const left: CantonBullet[] = [
    { label: labels.type, value: data.type || '-' },
    { label: labels.cableName, value: data.cableName || '-' },
    { label: labels.maintenanceCenter, value: data.maintenanceCenter || '-' },
    { label: labels.lit, value: data.litName || '-' },
    { label: labels.supportsCount, value: String(data.supportsCount) },
    { label: labels.supportsDescription, value: data.supportsDescription || '-' }
  ];

  const phaseNumberValue = data.phaseNumber != null ? String(data.phaseNumber) : '-';
  const right: CantonBullet[] = [
    { label: data.isPhase ? labels.phaseNumber : '', value: data.isPhase ? phaseNumberValue : '' },
    { label: labels.cablesAmount, value: data.cablesAmount != null ? String(data.cablesAmount) : '-' },
    { label: labels.maintenanceTeam, value: data.maintenanceTeam || '-' },
    { label: labels.branch, value: data.branchName || '-' }
  ];

  return drawSeparator(doc, drawTwoColumnBullets(doc, left, right, y));
}

/** Draws the initial condition section (page 1, portrait, 2 columns). Returns the next Y. */
export function drawInitialConditionSection(
  doc: jsPDF,
  data: CantonReportData,
  labels: CantonReportLabels,
  startY: number
): number {
  const ic = data.initialCondition;
  if (!ic) {
    return startY;
  }
  const y = drawSectionTitle(doc, labels.initialConditionTitle, startY);

  const left: CantonBullet[] = [
    { label: labels.baseParameter, value: formatValue(ic.baseParameter, PDF_UNITS.meters, 0) },
    ...(data.isNonLinear
      ? [
          { label: labels.cablePretension, value: formatValue(ic.cablePretension, PDF_UNITS.cra, 0) },
          { label: labels.maxWindPressure, value: formatValue(ic.maxWindPressure, PDF_UNITS.pascal, 0) }
        ]
      : [])
  ];

  const right: CantonBullet[] = [
    { label: labels.baseTemperature, value: formatValue(ic.baseTemperature, PDF_UNITS.celsius, 0) },
    ...(data.isNonLinear
      ? [
          { label: labels.minTemperature, value: formatValue(ic.minTemperature, PDF_UNITS.celsius, 0) },
          { label: labels.maxFrostWidth, value: formatValue(ic.maxFrostWidth, PDF_UNITS.centimeters, 0) }
        ]
      : [])
  ];

  return drawTwoColumnBullets(doc, left, right, y);
}

/** Draws the full page 1 (portrait): header + study/canton + canton + initial condition sections. */
export function drawCantonReportPage1(doc: jsPDF, data: CantonReportData, labels: CantonReportLabels): void {
  let y = drawHeader(doc, data.date || '-', labels.reportTitle);
  y = drawStudyAndCantonSection(doc, data, labels, y);
  y = drawCantonSection(doc, data, labels, y);
  drawInitialConditionSection(doc, data, labels, y);
}
