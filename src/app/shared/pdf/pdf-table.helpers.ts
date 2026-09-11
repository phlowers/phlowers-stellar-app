/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import jsPDF from 'jspdf';

import { LANDSCAPE_PAGE, FONT_SIZES, LINE_WIDTH_THIN, PAGE_MARGIN } from '@shared/pdf/pdf-layout.constantes';
import { drawHeader, drawSectionTitle, formatValue } from '@shared/pdf/pdf-primitives.helpers';

import {
  MAX_COLS_PER_TABLE,
  MAX_TABLES_PER_PAGE,
  TABLE_CELL_PADDING_X,
  TABLE_ROW_HEIGHT,
  TABLE_TEXT_BASELINE_OFFSET,
  TABLE_VERTICAL_GAP
} from './pdf-table.constantes';
import { MetricDescriptor, PdfTableModel } from './pdf-table.interfaces';

/** Maximum number of wrapped lines rendered inside a single table cell. */
const MAX_CELL_LINES = 2;

/** Formats a single metric cell: raw string for the identifier row, otherwise value + unit. */
export function formatCell<T>(row: T, metric: MetricDescriptor<T>): string {
  const raw = row[metric.field];
  if (metric.unit === null) {
    return typeof raw === 'string' && raw !== '' ? raw : '-';
  }
  return formatValue(raw as number | null, metric.unit, metric.decimals);
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
export function drawTable(
  doc: jsPDF,
  table: PdfTableModel,
  startY: number,
  pageWidth: number,
  labelColWidth: number
): number {
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
