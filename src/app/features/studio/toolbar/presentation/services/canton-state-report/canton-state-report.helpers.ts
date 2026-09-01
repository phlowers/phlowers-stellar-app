/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

// ─── PDF LAYOUT OVERVIEW ─────────────────────────────────────────────────────
//  Page 1 — A4 portrait (210 × 297 mm):
//    drawHeader()               → report title + date + separator   (shared primitive)
//    drawCartoucheSection()     → study & canton metadata bullets
//    drawCantonStateSection()   → max parameter + max stress rate
//  Following pages — A4 landscape (297 × 210 mm):
//    drawResultTablesSection()  → transposed result tables (≤ 5 columns each, 2 tables / page)
// ─────────────────────────────────────────────────────────────────────────────

import jsPDF from 'jspdf';

import {
  CONTENT_WIDTH,
  FONT_SIZES,
  LINE_HEIGHT,
  LINE_WIDTH_THIN,
  PAGE_MARGIN,
  PARAGRAPH_INDENT
} from '@shared/pdf/pdf-layout.constantes';
import { drawBulletItem, drawHeader, drawWrappingBulletItem, formatValue } from '@shared/pdf/pdf-primitives.helpers';
import { formatSupportNumber } from '@shared/helpers/formatSupportNumber';
import { SectionOutputParameters } from '@core/services/worker_python/tasks/types';
import { Support } from '@shared/domain';

import {
  LANDSCAPE_PAGE,
  MAX_COLS_PER_TABLE,
  MAX_TABLES_PER_PAGE,
  MetricDescriptor,
  TABLE_CELL_PADDING_X,
  TABLE_ROW_HEIGHT,
  TABLE_TEXT_BASELINE_OFFSET,
  TABLE_VERTICAL_GAP,
  UNITS
} from './canton-state-report.constantes';
import {
  CantonReportLabels,
  CantonStateReportData,
  PdfTableModel,
  SpanReportRow,
  SupportReportRow
} from './canton-state-report.interfaces';

/** Maximum number of wrapped lines rendered inside a single table cell. */
const MAX_CELL_LINES = 2;

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
    const chain = params.vtl_under_chain?.[j] ?? [];
    const consoleVtl = params.vtl_under_console?.[j] ?? [];
    const displacement = params.displacement?.[j] ?? [];
    rows.push({
      supportNumber: supports[j]?.number ?? '-',
      vChain: chain[0] ?? null,
      hChain: chain[1] ?? null,
      lChain: chain[2] ?? null,
      rChain: chain[3] ?? null,
      lineAngle: at(params.line_angle, j),
      vConsole: consoleVtl[0] ?? null,
      hConsole: consoleVtl[1] ?? null,
      lConsole: consoleVtl[2] ?? null,
      rConsole: consoleVtl[3] ?? null,
      footAltitude: at(params.ground_altitude, j),
      displacementX: displacement[0] ?? null,
      displacementY: displacement[1] ?? null,
      displacementZ: displacement[2] ?? null,
      loadAngle: at(params.load_angle, j)
    });
  }
  return rows;
}

/** Formats a single metric cell: raw string for the identifier row, otherwise value + unit. */
export function formatCell<T>(row: T, metric: MetricDescriptor<T>): string {
  const raw = row[metric.field];
  if (metric.unit === null) {
    return typeof raw === 'string' && raw !== '' ? raw : '-';
  }
  return formatValue(raw as number | null, metric.unit);
}

/** Splits an array into chunks of at most `size` items. */
export function chunk<T>(items: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    result.push(items.slice(i, i + size));
  }
  return result;
}

/**
 * Builds the transposed table models for a set of result rows.
 * Columns are chunked into groups of MAX_COLS_PER_TABLE; each metric becomes a table row.
 */
export function buildTables<T>(
  rows: T[],
  metrics: MetricDescriptor<T>[],
  resolveLabel: (key: string) => string
): PdfTableModel[] {
  return chunk(rows, MAX_COLS_PER_TABLE).map((columns) => ({
    rows: metrics.map((metric) => ({
      label: resolveLabel(metric.labelKey),
      values: columns.map((column) => formatCell(column, metric))
    }))
  }));
}

/** Draws an underlined section title at the page margin. Returns the next Y position. */
function drawSectionTitle(doc: jsPDF, title: string, startY: number): number {
  doc.setFont('Nunito', 'bold');
  doc.setFontSize(FONT_SIZES.sectionTitle);
  doc.text(title, PAGE_MARGIN.left, startY);
  const titleWidth = doc.getTextWidth(title);
  doc.setLineWidth(LINE_WIDTH_THIN);
  doc.line(PAGE_MARGIN.left, startY + 1, PAGE_MARGIN.left + titleWidth, startY + 1);
  return startY + LINE_HEIGHT + 2;
}

/** Draws the study & canton metadata section (page 1, portrait). Returns the next Y position. */
export function drawCartoucheSection(
  doc: jsPDF,
  data: CantonStateReportData,
  labels: CantonReportLabels,
  startY: number
): number {
  let y = drawSectionTitle(doc, labels.cartoucheTitle, startY);
  const leftX = PAGE_MARGIN.left + PARAGRAPH_INDENT;
  const wrapWidth = CONTENT_WIDTH - PARAGRAPH_INDENT;

  drawBulletItem(doc, labels.author, data.author || '-', leftX, y);
  y += LINE_HEIGHT;
  y += drawWrappingBulletItem(doc, labels.study, data.studyTitle || '-', leftX, y, wrapWidth);
  y += drawWrappingBulletItem(doc, labels.studyDescription, data.studyDescription || '-', leftX, y, wrapWidth);
  drawBulletItem(doc, labels.canton, data.cantonName || '-', leftX, y);
  y += LINE_HEIGHT;
  y += drawWrappingBulletItem(doc, labels.cantonComment, data.cantonComment || '-', leftX, y, wrapWidth);
  drawBulletItem(doc, labels.initialCondition, data.icName || '-', leftX, y);
  y += LINE_HEIGHT;
  drawBulletItem(doc, labels.chargeName, data.chargeName || '-', leftX, y);
  y += LINE_HEIGHT;
  y += drawWrappingBulletItem(doc, labels.chargeDescription, data.chargeDescription || '-', leftX, y, wrapWidth);

  doc.setLineWidth(LINE_WIDTH_THIN);
  doc.line(PAGE_MARGIN.left, y, PAGE_MARGIN.left + CONTENT_WIDTH, y);
  return y + LINE_HEIGHT;
}

/** Draws the canton state section (page 1, portrait): max parameter + max stress rate. */
export function drawCantonStateSection(
  doc: jsPDF,
  data: CantonStateReportData,
  labels: CantonReportLabels,
  startY: number
): number {
  let y = drawSectionTitle(doc, labels.cantonStateTitle, startY);
  const leftX = PAGE_MARGIN.left + PARAGRAPH_INDENT;
  const rightX = PAGE_MARGIN.left + PARAGRAPH_INDENT + CONTENT_WIDTH / 2;

  drawBulletItem(doc, labels.maxParameter, formatValue(data.maxParameter, UNITS.meters), leftX, y, true);
  drawBulletItem(doc, labels.maxStressRate, formatValue(data.maxStressRate, UNITS.percent), rightX, y, true);
  y += LINE_HEIGHT;

  return y;
}

/** Draws a single table cell (border + wrapped text). */
function drawCell(
  doc: jsPDF,
  x: number,
  y: number,
  width: number,
  height: number,
  lines: string[],
  bold: boolean
): void {
  doc.setLineWidth(LINE_WIDTH_THIN);
  doc.rect(x, y, width, height);
  doc.setFont('Nunito', bold ? 'bold' : 'normal');
  doc.setFontSize(bold ? FONT_SIZES.label : FONT_SIZES.value);
  lines.forEach((line, index) => {
    doc.text(line, x + TABLE_CELL_PADDING_X, y + TABLE_TEXT_BASELINE_OFFSET + index * TABLE_ROW_HEIGHT);
  });
}

/** Splits a cell string into at most MAX_CELL_LINES wrapped lines for the given width. */
function wrapCell(doc: jsPDF, text: string, width: number): string[] {
  const lines = doc.splitTextToSize(text, width - 2 * TABLE_CELL_PADDING_X) as string[];
  return lines.slice(0, MAX_CELL_LINES);
}

/**
 * Computes a label column width tight enough to fit the widest row label across the given
 * tables (e.g. spans + supports combined), so both result sections share the same width.
 */
export function computeLabelColWidth(doc: jsPDF, tables: PdfTableModel[]): number {
  doc.setFont('Nunito', 'bold');
  doc.setFontSize(FONT_SIZES.label);
  const maxLabelWidth = tables.reduce(
    (max, table) => table.rows.reduce((rowMax, row) => Math.max(rowMax, doc.getTextWidth(row.label)), max),
    0
  );
  return maxLabelWidth + 2 * TABLE_CELL_PADDING_X;
}

/** Draws one transposed result table (metric rows × up to 5 value columns). Returns the next Y. */
export function drawTable(doc: jsPDF, table: PdfTableModel, startY: number, pageWidth: number, labelColWidth: number): number {
  const contentWidth = pageWidth - PAGE_MARGIN.left - PAGE_MARGIN.right;
  const valueColWidth = (contentWidth - labelColWidth) / MAX_COLS_PER_TABLE;
  const numCols = table.rows[0]?.values.length ?? 0;
  let y = startY;

  for (const row of table.rows) {
    const labelLines = wrapCell(doc, row.label, labelColWidth);
    const valueLines = row.values.map((value) => wrapCell(doc, value, valueColWidth));
    const maxLines = Math.max(labelLines.length, ...valueLines.map((lines) => lines.length), 1);
    const rowHeight = maxLines * TABLE_ROW_HEIGHT;

    drawCell(doc, PAGE_MARGIN.left, y, labelColWidth, rowHeight, labelLines, true);
    for (let col = 0; col < numCols; col += 1) {
      const x = PAGE_MARGIN.left + labelColWidth + col * valueColWidth;
      drawCell(doc, x, y, valueColWidth, rowHeight, valueLines[col], false);
    }
    y += rowHeight;
  }

  return y;
}

/**
 * Renders a set of result tables across one or more landscape pages
 * (MAX_TABLES_PER_PAGE tables per page), each page carrying its own header and section title.
 */
export function drawResultTablesSection(
  doc: jsPDF,
  date: string,
  reportTitle: string,
  sectionTitle: string,
  tables: PdfTableModel[],
  labelColWidth: number
): void {
  let y = 0;
  tables.forEach((table, index) => {
    if (index % MAX_TABLES_PER_PAGE === 0) {
      doc.addPage('a4', 'landscape');
      y = drawHeader(doc, date, reportTitle, LANDSCAPE_PAGE.width);
      y = drawSectionTitle(doc, sectionTitle, y);
    } else {
      y += TABLE_VERTICAL_GAP;
    }
    y = drawTable(doc, table, y, LANDSCAPE_PAGE.width, labelColWidth);
  });
}
