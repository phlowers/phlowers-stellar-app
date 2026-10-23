/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

// ─── PDF LAYOUT OVERVIEW ─────────────────────────────────────────────────────
//  Page 1 (A4 portrait): header and study & canton cartouche
//  Following pages (A4 landscape, compact header): the obstacle points as transposed tables of at most 5 points each
//  (@shared/pdf/pdf-table.helpers)
// ─────────────────────────────────────────────────────────────────────────────

import type jsPDF from 'jspdf';

import { sanitizeFilenamePart } from '@shared/helpers/filename.helpers';
import { drawHeader, drawStudyCartoucheSection } from '@shared/pdf/pdf-primitives.helpers';

import { ObstaclesTableReportData, ObstaclesTableReportLabels } from './obstacles-table-report.interfaces';

// Builds "<report title>_<canton>_<load case>_<date> <time>.pdf", each part stripped of illegal characters
export function buildObstaclesReportFilename(reportTitle: string, data: ObstaclesTableReportData): string {
  const generatedAt = `${sanitizeFilenamePart(data.date)} ${sanitizeFilenamePart(data.time)}`;
  return `${[reportTitle, data.cantonName, data.chargeName].map(sanitizeFilenamePart).join('_')}_${generatedAt}.pdf`;
}

// Draws the study & canton metadata section (page 1, portrait, 1 column). Returns the next Y
export function drawStudyAndCantonSection(
  doc: jsPDF,
  data: ObstaclesTableReportData,
  labels: ObstaclesTableReportLabels,
  startY: number
): number {
  return drawStudyCartoucheSection(
    doc,
    labels.cartoucheTitle,
    { ...labels, comment: labels.cantonComment },
    { ...data, comment: data.cantonComment },
    startY
  );
}

// Draws the obstacles table report's first page (portrait): header with report title and date,
// then the study & canton cartouche. The obstacle tables follow on landscape pages.
export function drawObstaclesReportPage1(
  doc: jsPDF,
  data: ObstaclesTableReportData,
  labels: ObstaclesTableReportLabels
): void {
  const y = drawHeader(doc, data.date || '-', labels.reportTitle);
  drawStudyAndCantonSection(doc, data, labels, y);
}
