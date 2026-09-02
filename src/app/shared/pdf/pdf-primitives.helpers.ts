/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import jsPDF from 'jspdf';

import {
  APP_NAME,
  BULLET,
  DECIMAL_PLACES,
  FONT_SIZES,
  LINE_HEIGHT,
  LINE_WIDTH_THIN,
  PAGE_MARGIN,
  PAGE_SIZE
} from '@shared/pdf/pdf-layout.constantes';

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
    chunks.push(String.fromCharCode(...chunk));
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

/** Formats a numeric value to fixed decimals with unit, or returns "-" if null/undefined. */
export function formatValue(
  value: number | null | undefined,
  unit: string,
  decimals: number = DECIMAL_PLACES
): string {
  if (value === null || value === undefined) {
    return '-';
  }
  return `${value.toFixed(decimals)} ${unit}`;
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

/**
 * Draws a bullet item where the value can wrap to multiple lines.
 * Returns the total height consumed (number of lines × LINE_HEIGHT).
 */
export function drawWrappingBulletItem(
  doc: jsPDF,
  label: string,
  value: string,
  x: number,
  y: number,
  maxWidth: number
): number {
  const bulletText = `${BULLET} `;
  doc.setFont('Nunito', 'bold');
  doc.setFontSize(FONT_SIZES.label);
  const fullLabel = bulletText + label + ' : ';
  doc.text(fullLabel, x, y);
  const labelWidth = doc.getTextWidth(fullLabel);
  doc.setFont('Nunito', 'normal');
  doc.setFontSize(FONT_SIZES.value);
  const availableWidth = maxWidth - labelWidth;
  const lines = doc.splitTextToSize(value || '-', availableWidth);
  doc.text(lines, x + labelWidth, y);
  return Math.max(lines.length, 1) * LINE_HEIGHT;
}

/**
 * Draws the PDF header: title + app name + date + separator line. Returns the next Y position.
 * `pageWidth` defaults to the portrait A4 width; pass the landscape width (297) for landscape pages.
 */
export function drawHeader(doc: jsPDF, date: string, reportTitle: string, pageWidth: number = PAGE_SIZE.width): number {
  let y = PAGE_MARGIN.top;

  // App name (top right) — size: FONT_SIZES.appName, bold
  doc.setFont('Nunito', 'bold');
  doc.setFontSize(FONT_SIZES.appName);
  doc.text(APP_NAME, pageWidth - PAGE_MARGIN.right, y, { align: 'right' });
  y += 2;

  // Report title (top left, bold) — size: FONT_SIZES.title
  doc.setFont('Nunito', 'bold');
  doc.setFontSize(FONT_SIZES.title);
  y += LINE_HEIGHT; // vertical gap between app name baseline and title baseline
  doc.text(reportTitle, PAGE_MARGIN.left, y);

  // Date (top right, same line as title) — size: FONT_SIZES.title
  doc.text(date, pageWidth - PAGE_MARGIN.right, y, { align: 'right' });

  // Main separator line — gap of 3 mm below title text
  y += 3;
  doc.setLineWidth(LINE_WIDTH_THIN);
  doc.line(PAGE_MARGIN.left, y, pageWidth - PAGE_MARGIN.right, y);
  y += LINE_HEIGHT;

  return y;
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
