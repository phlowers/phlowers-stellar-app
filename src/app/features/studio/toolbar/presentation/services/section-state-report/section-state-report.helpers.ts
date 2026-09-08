/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

// ─── PDF LAYOUT OVERVIEW ─────────────────────────────────────────────────────
//  Page 1 — A4 portrait (210 × 297 mm):
//    drawHeader()               → report title + date + separator   (shared primitive)
//    drawCartoucheSection()     → study & section metadata bullets
//    drawSectionStateSection()   → max parameter + max stress rate
//  Following pages — A4 landscape (297 × 210 mm):
//    drawResultTablesSection()  → transposed result tables (@shared/pdf/pdf-table.helpers)
// ─────────────────────────────────────────────────────────────────────────────

import type jsPDF from 'jspdf';

import { CONTENT_WIDTH, LINE_HEIGHT, PAGE_MARGIN, PARAGRAPH_INDENT, PDF_UNITS } from '@shared/pdf/pdf-layout.constantes';
import { drawBulletItem, drawBulletList, drawSectionTitle, drawSeparator, formatValue } from '@shared/pdf/pdf-primitives.helpers';
import { PdfBulletItem } from '@shared/pdf/pdf-report.interfaces';
import { formatSupportNumber } from '@shared/helpers/formatSupportNumber';
import { SectionOutputParameters } from '@core/services/worker_python/tasks/types';
import { Support } from '@shared/domain';

import { SectionReportLabels, SectionStateReportData, SpanReportRow, SupportReportRow } from './section-state-report.interfaces';

/** Reads a numeric array value at the given index, returning null when absent. */
function at(values: number[] | undefined, index: number): number | null {
  return values?.[index] ?? null;
}

/** Returns the maximum finite value of an array, or null when empty/absent. */
export function maxOf(values: number[] | undefined): number | null {
  if (!values || values.length === 0) return null;
  const max = Math.max(...values);
  return Number.isFinite(max) ? max : null;
}

/**
 * Builds per-span result rows for the contiguous support range [startSupport, endSupport].
 * Span `i` sits between supports `i` and `i + 1`, so span rows cover indices [start, end - 1].
 */
export function buildSpanRows(
  params: SectionOutputParameters,
  supports: Support[],
  startSupport: number,
  endSupport: number
): SpanReportRow[] {
  const rows: SpanReportRow[] = [];
  for (let i = startSupport; i < endSupport; i += 1) {
    rows.push({
      spanNumber: `${formatSupportNumber(supports[i]?.number ?? null)} - ${formatSupportNumber(
        supports[i + 1]?.number ?? null
      )}`,
      spanLength: at(params.span_length, i),
      elevation: at(params.elevation, i),
      parameter: at(params.parameter, i),
      horizontalTension: at(params.T_h, i),
      tensionSup: at(params.tension_sup, i),
      tensionInf: at(params.tension_inf, i),
      sagF1: at(params.sag, i),
      sagF2: at(params.sag_s2, i),
      horizontalDistance: at(params.horizontal_distance, i),
      naturalLength: at(params.L0, i),
      arcLength: at(params.arc_length, i),
      slopeLeft: at(params.slope_left, i),
      slopeRight: at(params.slope_right, i),
      utilizationRate: at(params.utilization_rate, i)
    });
  }
  return rows;
}

/** Builds per-support result rows for the contiguous support range [startSupport, endSupport]. */
export function buildSupportRows(
  params: SectionOutputParameters,
  supports: Support[],
  startSupport: number,
  endSupport: number
): SupportReportRow[] {
  const rows: SupportReportRow[] = [];
  for (let j = startSupport; j <= endSupport; j += 1) {
    // vtl_under_chain / vtl_under_console are axis-major: [V[], H[], L[]] with one value per
    // support — not support-major. The R component is a separate flat per-support array.
    // displacement is also axis-major: [X[], Y[], Z[]] with one value per support.
    const chain = params.vtl_under_chain;
    const consoleVtl = params.vtl_under_console;
    const disp = params.displacement;
    rows.push({
      supportNumber: supports[j]?.number ?? '-',
      vChain: at(chain?.[0], j),
      hChain: at(chain?.[1], j),
      lChain: at(chain?.[2], j),
      rChain: at(params.r_under_chain, j),
      lineAngle: at(params.line_angle, j),
      vConsole: at(consoleVtl?.[0], j),
      hConsole: at(consoleVtl?.[1], j),
      lConsole: at(consoleVtl?.[2], j),
      rConsole: at(params.r_under_console, j),
      footAltitude: at(params.ground_altitude, j),
      displacementX: at(disp?.[0], j),
      displacementY: at(disp?.[1], j),
      displacementZ: at(disp?.[2], j),
      loadAngle: at(params.load_angle, j)
    });
  }
  return rows;
}

/** Draws the study & section metadata section (page 1, portrait). Returns the next Y position. */
export function drawCartoucheSection(
  doc: jsPDF,
  data: SectionStateReportData,
  labels: SectionReportLabels,
  startY: number
): number {
  let y = drawSectionTitle(doc, labels.cartoucheTitle, startY);
  const leftX = PAGE_MARGIN.left + PARAGRAPH_INDENT;
  const wrapWidth = CONTENT_WIDTH - PARAGRAPH_INDENT;

  const items: PdfBulletItem[] = [
    { label: labels.author, value: data.author || '-' },
    { label: labels.study, value: data.studyTitle || '-', wrap: true },
    { label: labels.studyDescription, value: data.studyDescription || '-', wrap: true },
    { label: labels.section, value: data.sectionName || '-' },
    { label: labels.sectionComment, value: data.sectionComment || '-', wrap: true },
    { label: labels.initialCondition, value: data.icName || '-' },
    { label: labels.chargeName, value: data.chargeName || '-' },
    { label: labels.chargeDescription, value: data.chargeDescription || '-', wrap: true }
  ];
  y = drawBulletList(doc, items, y, leftX, wrapWidth);

  return drawSeparator(doc, y);
}

/** Draws the section state section (page 1, portrait): max parameter + max stress rate. */
export function drawSectionStateSection(
  doc: jsPDF,
  data: SectionStateReportData,
  labels: SectionReportLabels,
  startY: number
): number {
  let y = drawSectionTitle(doc, labels.sectionStateTitle, startY);
  const leftX = PAGE_MARGIN.left + PARAGRAPH_INDENT;
  const rightX = PAGE_MARGIN.left + PARAGRAPH_INDENT + CONTENT_WIDTH / 2;

  drawBulletItem(doc, labels.maxParameter, formatValue(data.maxParameter, PDF_UNITS.meters, 0), leftX, y, false);
  drawBulletItem(doc, labels.maxStressRate, formatValue(data.maxStressRate, PDF_UNITS.percent, 1), rightX, y, false);
  y += LINE_HEIGHT;

  return y;
}
