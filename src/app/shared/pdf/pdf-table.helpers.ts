/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import jsPDF from 'jspdf';

import {
  LANDSCAPE_PAGE,
  FONT_SIZES,
  LINE_WIDTH_THIN,
  PAGE_MARGIN,
  SECTION_TITLE_HEIGHT,
  SEPARATOR_HEIGHT
} from '@shared/pdf/pdf-layout.constantes';
import { drawHeader, drawSectionTitle, drawSeparator, formatValue } from '@shared/pdf/pdf-primitives.helpers';

import {
  MAX_COLS_PER_TABLE,
  MAX_TABLES_PER_PAGE,
  TABLE_CELL_PADDING_X,
  TABLE_ROW_HEIGHT,
  TABLE_TEXT_BASELINE_OFFSET,
  TABLE_VERTICAL_GAP
} from './pdf-table.constantes';
import { MetricDescriptor, PdfResultSection, PdfTableModel } from './pdf-table.interfaces';

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

/** Computes the rendered height (mm) of a single table row, wrapping label + value cells. */
function computeRowHeight(
  doc: jsPDF,
  row: { label: string; values: string[] },
  labelColWidth: number,
  valueColWidth: number
): number {
  const labelLines = wrapCell(doc, row.label, labelColWidth);
  const valueLines = row.values.map((value) => wrapCell(doc, value, valueColWidth));
  const maxLines = Math.max(labelLines.length, ...valueLines.map((lines) => lines.length), 1);
  return maxLines * TABLE_ROW_HEIGHT;
}

/**
 * Computes the total rendered height (mm) of a table without drawing it.
 * Takes the same `pageWidth` as `drawTable` so both derive the column widths identically.
 */
export function computeTableHeight(doc: jsPDF, table: PdfTableModel, pageWidth: number, labelColWidth: number): number {
  const contentWidth = pageWidth - PAGE_MARGIN.left - PAGE_MARGIN.right;
  const valueColWidth = (contentWidth - labelColWidth) / MAX_COLS_PER_TABLE;
  return table.rows.reduce((total, row) => total + computeRowHeight(doc, row, labelColWidth, valueColWidth), 0);
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
    const rowHeight = computeRowHeight(doc, row, labelColWidth, valueColWidth);
    const labelLines = wrapCell(doc, row.label, labelColWidth);
    const valueLines = row.values.map((value) => wrapCell(doc, value, valueColWidth));

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

/**
 * Renders a list of titled result sections as one continuous flow on landscape pages: sections
 * and their table chunks stack directly below each other, only starting a new page when the
 * remaining vertical space genuinely runs out (unlike `drawResultTablesSection`, which always
 * starts a fresh page per call).
 */
export function drawResultTablesFlow(
  doc: jsPDF,
  date: string,
  reportTitle: string,
  sections: PdfResultSection[],
  labelColWidth: number
): void {
  const contentWidth = LANDSCAPE_PAGE.width - PAGE_MARGIN.left - PAGE_MARGIN.right;
  const pageBottom = LANDSCAPE_PAGE.height - PAGE_MARGIN.bottom;
  let y = 0;

  const startNewPage = (): number => {
    doc.addPage('a4', 'landscape');
    return drawHeader(doc, date, reportTitle, LANDSCAPE_PAGE.width);
  };

  for (const section of sections) {
    if (section.tables.length === 0) {
      continue;
    }

    // Reserve space for the title, its first table AND the separator closing the section, so the
    // title is never drawn alone at the bottom of a page with its first table pushed away.
    const firstTableHeight = computeTableHeight(doc, section.tables[0], LANDSCAPE_PAGE.width, labelColWidth);
    const requiredForSectionStart = SECTION_TITLE_HEIGHT + firstTableHeight + SEPARATOR_HEIGHT;

    if (y === 0 || y + requiredForSectionStart > pageBottom) {
      y = startNewPage();
    } else {
      y += TABLE_VERTICAL_GAP;
    }
    y = drawSectionTitle(doc, section.title, y);

    section.tables.forEach((table, index) => {
      if (index > 0) {
        const tableHeight = computeTableHeight(doc, table, LANDSCAPE_PAGE.width, labelColWidth);
        y += TABLE_VERTICAL_GAP;
        if (y + tableHeight > pageBottom) {
          y = startNewPage();
          y = drawSectionTitle(doc, section.title, y);
        }
      }
      y = drawTable(doc, table, y, LANDSCAPE_PAGE.width, labelColWidth);
    });

    // A separator marks the end of a category, not the end of each table: a category split into
    // several chunks (more than MAX_COLS_PER_TABLE columns) stays visually grouped.
    y = drawSeparator(doc, y, contentWidth);
  }
}
