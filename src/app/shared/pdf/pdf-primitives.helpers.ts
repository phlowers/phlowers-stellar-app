/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import jsPDF from 'jspdf';

import { LoggerService } from '@core/services/logger/logger.service';
import { NotificationService } from '@core/services/notification/notification.service';

import {
  APP_NAME,
  BULLET,
  CONTENT_BOTTOM,
  CONTENT_WIDTH,
  DECIMAL_PLACES,
  FONT_SIZES,
  LINE_HEIGHT,
  LINE_WIDTH_THIN,
  PAGE_MARGIN,
  PAGE_SIZE,
  PARAGRAPH_INDENT,
  SECTION_TITLE_HEIGHT,
  SEPARATOR_MARGIN_Y,
  VALUE_LINE_SPACING
} from '@shared/pdf/pdf-layout.constantes';
import { PdfBulletItem, StudyCartoucheData, StudyCartoucheLabels } from '@shared/pdf/pdf-report.interfaces';

/**
 * Chunk size used when converting binary data to a latin1 string before base64 encoding.
 * Keeping it well under the JS engine argument-count limit avoids `RangeError: Maximum call stack size exceeded`
 * while remaining large enough to keep the number of `String.fromCharCode` calls (and intermediate strings) low.
 */
const BASE64_CHUNK_SIZE = 0x8000;

/** Loads a file from a URL and returns its raw base64 encoding (no data URL prefix). */
export async function loadFileAsBase64(url: string): Promise<string> {
  const response = await globalThis.fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP error ${response.status} loading file: ${url}`);
  }
  const buffer = await response.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  const chunks: string[] = [];
  for (let offset = 0; offset < bytes.length; offset += BASE64_CHUNK_SIZE) {
    const chunk = bytes.subarray(offset, offset + BASE64_CHUNK_SIZE);
    chunks.push(String.fromCodePoint(...chunk));
  }
  return globalThis.btoa(chunks.join(''));
}

/** Loads an image from a URL and returns it as a base64 data URL. */
export async function loadImageAsBase64(url: string): Promise<string> {
  const response = await globalThis.fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP error ${response.status} loading image: ${url}`);
  }
  const blob = await response.blob();
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/** Registers Nunito font variants (normal, bold, italic) in a jsPDF document. */
export function registerNunitoFont(doc: jsPDF, regularB64: string, boldB64: string, italicB64: string): void {
  doc.addFileToVFS('Nunito-Regular.ttf', regularB64);
  doc.addFont('Nunito-Regular.ttf', 'Nunito', 'normal');
  doc.addFileToVFS('Nunito-Bold.ttf', boldB64);
  doc.addFont('Nunito-Bold.ttf', 'Nunito', 'bold');
  doc.addFileToVFS('Nunito-Italic.ttf', italicB64);
  doc.addFont('Nunito-Italic.ttf', 'Nunito', 'italic');
}

/** Formats a numeric value to fixed decimals with unit (omitted when empty), or returns "-" if null/undefined. */
export function formatValue(value: number | null | undefined, unit: string, decimals: number = DECIMAL_PLACES): string {
  if (value === null || value === undefined) {
    return '-';
  }
  const formatted = value.toFixed(decimals);
  return unit ? `${formatted} ${unit}` : formatted;
}

/** Draws text with a bullet point prefix. Label is bold, value is normal (or bold when boldValue is true). */
export function drawBulletItem(
  doc: jsPDF,
  label: string,
  value: string,
  x: number,
  y: number,
  boldValue = false
): void {
  const bulletText = `${BULLET} `;
  doc.setFont('Nunito', 'bold');
  doc.setFontSize(FONT_SIZES.label);
  doc.text(bulletText + label + ' : ', x, y);
  const labelWidth = doc.getTextWidth(bulletText + label + ' : ');
  doc.setFont('Nunito', boldValue ? 'bold' : 'normal');
  doc.text(value, x + labelWidth, y);
}

// Starts a new portrait page under the compact header. Returns the Y where its content starts
function startPortraitPage(doc: jsPDF): number {
  doc.addPage('a4', 'portrait');
  return drawCompactHeader(doc);
}

// Returns `y` when the content reaching `height` mm below the baseline `y` stays above the bottom margin,
// otherwise the Y of a new portrait page
function ensurePortraitSpace(doc: jsPDF, y: number, height = 0): number {
  return y + height <= CONTENT_BOTTOM ? y : startPortraitPage(doc);
}

// Number of value lines jsPDF can draw from the baseline `y` before passing the bottom margin
function fittingValueLineCount(y: number): number {
  return Math.floor((CONTENT_BOTTOM - y) / VALUE_LINE_SPACING) + 1;
}

/**
 * Draws a bullet item where the value can wrap to multiple lines. The item starts on a new portrait page when its
 * first line would pass the bottom margin, and the value lines passing it continue on a new portrait page, aligned
 * under the value. Returns the Y of the next item, one LINE_HEIGHT below the last line.
 */
export function drawWrappingBulletItem(
  doc: jsPDF,
  label: string,
  value: string,
  x: number,
  startY: number,
  maxWidth: number
): number {
  let y = ensurePortraitSpace(doc, startY);
  const bulletText = `${BULLET} `;
  doc.setFont('Nunito', 'bold');
  doc.setFontSize(FONT_SIZES.label);
  const fullLabel = bulletText + label + ' : ';
  doc.text(fullLabel, x, y);
  const labelWidth = doc.getTextWidth(fullLabel);
  doc.setFont('Nunito', 'normal');
  doc.setFontSize(FONT_SIZES.value);
  const availableWidth = maxWidth - labelWidth;
  const lines: string[] = doc.splitTextToSize(value || '-', availableWidth);

  let pageLines = lines.slice(0, fittingValueLineCount(y));
  let drawnLineCount = pageLines.length;
  doc.text(pageLines, x + labelWidth, y);
  while (drawnLineCount < lines.length) {
    y = startPortraitPage(doc);
    // The header leaves its own font set
    doc.setFont('Nunito', 'normal');
    doc.setFontSize(FONT_SIZES.value);
    pageLines = lines.slice(drawnLineCount, drawnLineCount + fittingValueLineCount(y));
    drawnLineCount += pageLines.length;
    doc.text(pageLines, x + labelWidth, y);
  }
  return y + (Math.max(pageLines.length, 1) - 1) * VALUE_LINE_SPACING + LINE_HEIGHT;
}

/** Draws an underlined section title at the page margin. Returns the next Y position. */
export function drawSectionTitle(doc: jsPDF, title: string, startY: number): number {
  doc.setFont('Nunito', 'bold');
  doc.setFontSize(FONT_SIZES.sectionTitle);
  doc.text(title, PAGE_MARGIN.left, startY);
  const titleWidth = doc.getTextWidth(title);
  doc.setLineWidth(LINE_WIDTH_THIN);
  doc.line(PAGE_MARGIN.left, startY + 1, PAGE_MARGIN.left + titleWidth, startY + 1);
  return startY + SECTION_TITLE_HEIGHT;
}

/**
 * Draws a single-column list of metadata bullets from `startY`. Wrapping items advance below their
 * last line; non-wrapping items advance by one LINE_HEIGHT. Items reaching the bottom margin continue
 * on a new portrait page. Returns the Y below the last item.
 */
export function drawBulletList(
  doc: jsPDF,
  items: PdfBulletItem[],
  startY: number,
  leftX: number,
  wrapWidth: number
): number {
  let y = startY;
  for (const item of items) {
    if (item.wrap) {
      y = drawWrappingBulletItem(doc, item.label, item.value, leftX, y, wrapWidth);
    } else {
      y = ensurePortraitSpace(doc, y);
      drawBulletItem(doc, item.label, item.value, leftX, y);
      y += LINE_HEIGHT;
    }
  }
  return y;
}

// App name (top right of the page) — size: FONT_SIZES.appName, bold
function drawHeaderAppName(doc: jsPDF, pageWidth: number): void {
  doc.setFont('Nunito', 'bold');
  doc.setFontSize(FONT_SIZES.appName);
  doc.text(APP_NAME, pageWidth - PAGE_MARGIN.right, PAGE_MARGIN.top, { align: 'right' });
}

// Main header separator line, 3 mm below the baseline of the last header text. Returns the next Y position
function drawHeaderSeparator(doc: jsPDF, textY: number, pageWidth: number): number {
  const y = textY + 3;
  doc.setLineWidth(LINE_WIDTH_THIN);
  doc.line(PAGE_MARGIN.left, y, pageWidth - PAGE_MARGIN.right, y);
  return y + LINE_HEIGHT;
}

/**
 * Draws the PDF header: title + app name + date + separator line. Returns the next Y position.
 * `pageWidth` defaults to the portrait A4 width; pass the landscape width (297) for landscape pages.
 */
export function drawHeader(doc: jsPDF, date: string, reportTitle: string, pageWidth: number = PAGE_SIZE.width): number {
  let y = PAGE_MARGIN.top;

  drawHeaderAppName(doc, pageWidth);
  y += 2;

  // Report title (top left, bold) — size: FONT_SIZES.title
  doc.setFont('Nunito', 'bold');
  doc.setFontSize(FONT_SIZES.title);
  y += LINE_HEIGHT; // vertical gap between app name baseline and title baseline
  doc.text(reportTitle, PAGE_MARGIN.left, y);

  // Date (top right, same line as title) — size: FONT_SIZES.title
  doc.text(date, pageWidth - PAGE_MARGIN.right, y, { align: 'right' });

  return drawHeaderSeparator(doc, y, pageWidth);
}

/**
 * Draws the compact PDF header of the pages following the first one: app name + separator line,
 * without the report title and date. Returns the next Y position.
 * `pageWidth` defaults to the portrait A4 width; pass the landscape width (297) for landscape pages.
 */
export function drawCompactHeader(doc: jsPDF, pageWidth: number = PAGE_SIZE.width): number {
  drawHeaderAppName(doc, pageWidth);
  return drawHeaderSeparator(doc, PAGE_MARGIN.top, pageWidth);
}

/**
 * Draws the page footer (page number). `pageWidth`/`pageHeight` default to portrait A4 dimensions;
 * pass the landscape dimensions (297 × 210) for landscape pages.
 */
export function drawFooter(
  doc: jsPDF,
  pageFooter: string,
  pageWidth: number = PAGE_SIZE.width,
  pageHeight: number = PAGE_SIZE.height
): void {
  doc.setFont('Nunito', 'bold');
  doc.setFontSize(FONT_SIZES.footer);
  doc.text(pageFooter, pageWidth - PAGE_MARGIN.right, pageHeight - 8, { align: 'right' });
}

/**
 * Draws a horizontal separator line spanning `width` (defaults to the portrait content width),
 * inset by `SEPARATOR_MARGIN_Y` from the content drawn above and below it so sections are clearly
 * separated. Returns the next Y position.
 */
export function drawSeparator(doc: jsPDF, y: number, width: number = CONTENT_WIDTH): number {
  const lineY = y + SEPARATOR_MARGIN_Y;
  doc.setLineWidth(LINE_WIDTH_THIN);
  doc.line(PAGE_MARGIN.left, lineY, PAGE_MARGIN.left + width, lineY);
  return lineY + SEPARATOR_MARGIN_Y;
}

// Closes a portrait section with a separator, except when its line would pass the bottom margin: the section title
// that follows then starts a new page, which sets the section apart. Returns the next Y position
function drawSectionEndSeparator(doc: jsPDF, y: number): number {
  return y + SEPARATOR_MARGIN_Y > CONTENT_BOTTOM ? y : drawSeparator(doc, y);
}

/**
 * Draws a titled single-column bullet section (title + wrapped bullet list + separator).
 * Shared by every report whose page 1 renders one metadata block in a single column.
 * The title moves to a new portrait page with the first item when they do not both fit.
 * Returns the next Y position (below the separator).
 */
export function drawTitledBulletSection(doc: jsPDF, title: string, items: PdfBulletItem[], startY: number): number {
  const y = drawSectionTitle(doc, title, ensurePortraitSpace(doc, startY, SECTION_TITLE_HEIGHT));
  const leftX = PAGE_MARGIN.left + PARAGRAPH_INDENT;
  const wrapWidth = CONTENT_WIDTH - PARAGRAPH_INDENT;
  return drawSectionEndSeparator(doc, drawBulletList(doc, items, y, leftX, wrapWidth));
}

/** Draws the study & canton metadata cartouche (1 column, all values wrapping). Returns the next Y. */
export function drawStudyCartoucheSection(
  doc: jsPDF,
  title: string,
  labels: StudyCartoucheLabels,
  data: StudyCartoucheData,
  startY: number
): number {
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
  return drawTitledBulletSection(doc, title, items, startY);
}

/**
 * Draws two columns of bullet items side by side, each column advancing independently.
 * Returns the Y position below the taller column.
 */
export function drawTwoColumnBullets(
  doc: jsPDF,
  left: PdfBulletItem[],
  right: PdfBulletItem[],
  startY: number
): number {
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

/**
 * Draws a section title and two independent bullet columns below it, moved together to a new portrait
 * page when the last row of the taller column would pass the bottom margin.
 * Returns the Y position below the taller column.
 */
export function drawTitledTwoColumnBullets(
  doc: jsPDF,
  title: string,
  left: PdfBulletItem[],
  right: PdfBulletItem[],
  startY: number
): number {
  const lastRowOffset = SECTION_TITLE_HEIGHT + (Math.max(left.length, right.length, 1) - 1) * LINE_HEIGHT;
  const y = drawSectionTitle(doc, title, ensurePortraitSpace(doc, startY, lastRowOffset));
  return drawTwoColumnBullets(doc, left, right, y);
}

/**
 * Draws a titled two-column bullet section (title + two independent bullet columns + separator),
 * kept on one page. Returns the next Y position (below the separator).
 */
export function drawTwoColumnBulletSection(
  doc: jsPDF,
  title: string,
  left: PdfBulletItem[],
  right: PdfBulletItem[],
  startY: number
): number {
  return drawSectionEndSeparator(doc, drawTitledTwoColumnBullets(doc, title, left, right, startY));
}

/**
 * Draws a footer with the page number on every page of the document, placed for the page's own
 * orientation: portrait pages (metadata continuing past page 1) and landscape pages (result tables)
 * can follow each other.
 */
export function drawPageFooters(doc: jsPDF, pageLabel: string): void {
  const totalPages = doc.getNumberOfPages();
  for (let pageNumber = 1; pageNumber <= totalPages; pageNumber += 1) {
    doc.setPage(pageNumber);
    // The page size follows the current page
    const { pageSize } = doc.internal;
    drawFooter(doc, `${pageLabel} ${pageNumber} / ${totalPages}`, pageSize.getWidth(), pageSize.getHeight());
  }
}

/** Resolves a report's fixed labels via Transloco, preserving the label struct's type. */
export function buildReportLabels<T>(translate: (key: string) => string, keys: { [K in keyof T]: string }): T {
  const entries = Object.entries(keys) as [keyof T, string][];
  return entries.reduce((labels, [field, key]) => {
    labels[field] = translate(key) as T[keyof T];
    return labels;
  }, {} as T);
}

/**
 * Runs a PDF report `build` callback, saves the resulting document and notifies success;
 * on failure, logs the error and notifies the user instead. Shared by all PDF report services
 * to avoid duplicating the try/catch/notify boilerplate around report generation.
 */
export async function generatePdfReport(options: {
  logger: LoggerService;
  notificationService: NotificationService;
  translate: (key: string) => string;
  errorLogMessage: string;
  successKey: string;
  errorKey: string;
  build: () => Promise<{ doc: jsPDF; filename: string }>;
}): Promise<void> {
  try {
    const { doc, filename } = await options.build();
    doc.save(filename);
    options.notificationService.success(options.translate(options.successKey));
  } catch (error) {
    options.logger.error(options.errorLogMessage, error);
    options.notificationService.error(options.translate(options.errorKey));
  }
}
