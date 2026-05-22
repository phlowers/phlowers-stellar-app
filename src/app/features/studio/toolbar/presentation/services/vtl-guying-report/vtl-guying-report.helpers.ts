/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

// ─── PDF LAYOUT OVERVIEW ─────────────────────────────────────────────────────
//  Page A4 portrait (210 × 297 mm) — all sizes/margins in vtl-guying-report.constantes.ts
//
//  ┌──────────────────────────────────────────┐
//  │  drawHeader()       → title + separator  │  ~33 mm
//  ├──────────────────────────────────────────┤
//  │  drawStudySection() → study metadata     │  ~50–65 mm (varies with content)
//  ├──────────────────────────────────────────┤
//  │  drawVtlWithoutGuyingSection()           │  ~30 mm
//  ├──────────────────────────────────────────┤
//  │  drawGuyingSection() → params + diagram  │  ~60 mm (3-col: left|diagram|right)
//  ├──────────────────────────────────────────┤
//  │  drawVtlWithGuyingSection() → results    │  ~65 mm
//  │  drawFooter()       → "Page 1 / 1"       │  fixed at y = 287 mm
//  └──────────────────────────────────────────┘
//
//  Two-column layout: leftX = PAGE_MARGIN.left + PARAGRAPH_INDENT
//                     rightX = PAGE_MARGIN.left + CONTENT_WIDTH / 2 + PARAGRAPH_INDENT
// ─────────────────────────────────────────────────────────────────────────────

import jsPDF from 'jspdf';

import { VtlGuyingReportData } from './vtl-guying-report.interfaces';
import {
  APP_NAME,
  BULLET,
  CONTENT_WIDTH,
  DECIMAL_PLACES,
  DIAGRAM_WIDTH,
  FONT_SIZES,
  LINE_HEIGHT,
  LINE_WIDTH_THIN,
  PAGE_MARGIN,
  PAGE_SIZE,
  PARAGRAPH_INDENT,
  PDF_LABELS,
  UNITS
} from './vtl-guying-report.constantes';

/** Loads a file from a URL and returns its raw base64 encoding (no data URL prefix). */
export async function loadFileAsBase64(url: string): Promise<string> {
  const response = await globalThis.fetch(url);
  const buffer = await response.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCodePoint(byte);
  });
  return globalThis.btoa(binary);
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
export function formatValue(value: number | null | undefined, unit: string): string {
  if (value === null || value === undefined) {
    return '-';
  }
  return `${value.toFixed(DECIMAL_PLACES)} ${unit}`;
}

// ─── PRIMITIVE: bullet item (• Label : value) ────────────────────────────────
//  Font size controlled by FONT_SIZES.label (constantes.ts)
//  Label = bold Nunito, value = normal Nunito (bold if boldValue = true) — inline on same Y
/** Draws text with a bullet point prefix. Label is bold, value is normal (or bold when boldValue is true). */
function drawBulletItem(doc: jsPDF, label: string, value: string, x: number, y: number, boldValue = false): void {
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
function drawWrappingBulletItem(
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

// ─── SECTION 0: HEADER ────────────────────────────────────────────────────────
//  [TOP RIGHT]  App name          → FONT_SIZES.appName (constantes.ts)
//  [TOP LEFT]   Report title      → FONT_SIZES.title   (constantes.ts) — bold
//  [TOP RIGHT]  Date              → same line as report title, right-aligned
//  [SEPARATOR]  Full-width line   → lineWidth 0.5 mm, gap before = 10 mm (↑ more space / ↓ less)
/** Draws the PDF header: title + app name + date + separator line. Returns the next Y position. */
export function drawHeader(doc: jsPDF, date: string): number {
  let y = PAGE_MARGIN.top;

  // App name (top right) — size: FONT_SIZES.appName, bold
  doc.setFont('Nunito', 'bold');
  doc.setFontSize(FONT_SIZES.appName);
  doc.text(APP_NAME, PAGE_SIZE.width - PAGE_MARGIN.right, y, { align: 'right' });
  y += 2;

  // Report title (top left, bold) — size: FONT_SIZES.title
  doc.setFont('Nunito', 'bold');
  doc.setFontSize(FONT_SIZES.title);
  y += LINE_HEIGHT; // vertical gap between app name baseline and title baseline
  doc.text(PDF_LABELS.reportTitle, PAGE_MARGIN.left, y);

  // Date (top right, same line as title) — size: FONT_SIZES.title
  doc.text(date, PAGE_SIZE.width - PAGE_MARGIN.right, y, { align: 'right' });

  // Main separator line — gap of 10 mm below title text (adjust here to change spacing)
  y += 3;
  doc.setLineWidth(LINE_WIDTH_THIN);
  doc.line(PAGE_MARGIN.left, y, PAGE_SIZE.width - PAGE_MARGIN.right, y);
  y += LINE_HEIGHT;

  return y;
}

// ─── SECTION FOOTER ───────────────────────────────────────────────────────────
//  [BOTTOM RIGHT]  "Page 1 / 1"  — fixed at PAGE_SIZE.height - 10 mm (287 mm on A4)
//  Font size: FONT_SIZES.footer (constantes.ts)
/** Draws the page footer (page number). */
export function drawFooter(doc: jsPDF): void {
  doc.setFont('Nunito', 'bold');
  doc.setFontSize(FONT_SIZES.footer);
  doc.text(PDF_LABELS.pageFooter, PAGE_SIZE.width - PAGE_MARGIN.right, PAGE_SIZE.height - 8, { align: 'right' });
}

// ─── SECTION 1: ÉTUDE ET CANTON ───────────────────────────────────────────────
//  Single-column layout: all items left-aligned at leftX
//  Row layout:
//    Row 1 — Auteur (left)
//    Row 2 — Etude (left, wraps full width)
//    Row 3 — Description (left, wraps full width)
//    Row 4 — Canton (left)
//    Row 5 — Commentaire (left, wraps full width)
//    Row 6 — Cas de charge (left)
//    Row 7 — Description (left, wraps full width)
//  Bottom: full-width separator line (lineWidth 0.2)
/** Draws the "Étude et canton" section. Returns the next Y position. */
export function drawStudySection(doc: jsPDF, data: VtlGuyingReportData, startY: number): number {
  let y = startY;
  const leftX = PAGE_MARGIN.left + PARAGRAPH_INDENT;
  const wrapWidth = CONTENT_WIDTH - PARAGRAPH_INDENT;

  // Section title (underlined) — at page margin, no indent
  doc.setFont('Nunito', 'bold');
  doc.setFontSize(FONT_SIZES.sectionTitle);
  doc.text(PDF_LABELS.studySectionTitle, PAGE_MARGIN.left, y);
  const titleWidth = doc.getTextWidth(PDF_LABELS.studySectionTitle);
  doc.setLineWidth(LINE_WIDTH_THIN);
  doc.line(PAGE_MARGIN.left, y + 1, PAGE_MARGIN.left + titleWidth, y + 1);
  y += LINE_HEIGHT + 2;

  // Row 1: Auteur (left)
  drawBulletItem(doc, PDF_LABELS.author, data.author || '-', leftX, y);
  y += LINE_HEIGHT;

  // Row 2: Etude (wraps full width)
  y += drawWrappingBulletItem(doc, PDF_LABELS.study, data.studyTitle || '-', leftX, y, wrapWidth);

  // Row 3: Description (wraps full width)
  y += drawWrappingBulletItem(doc, PDF_LABELS.studyDescription, data.studyDescription || '-', leftX, y, wrapWidth);

  // Row 4: Canton
  drawBulletItem(doc, PDF_LABELS.section, data.sectionName || '-', leftX, y);
  y += LINE_HEIGHT;

  // Row 5: Commentaire (wraps full width)
  y += drawWrappingBulletItem(doc, PDF_LABELS.sectionComment, data.sectionComment || '-', leftX, y, wrapWidth);

  // Row 6: Cas de charge
  drawBulletItem(doc, PDF_LABELS.chargeName, data.chargeName || '-', leftX, y);
  y += LINE_HEIGHT;

  // Row 7: Description du cas de charge (wraps full width)
  y += drawWrappingBulletItem(doc, PDF_LABELS.chargeDescription, data.chargeDescription || '-', leftX, y, wrapWidth);
  y -= 2; // tighten gap before separator

  // Separator line
  doc.setLineWidth(LINE_WIDTH_THIN);
  doc.line(PAGE_MARGIN.left, y, PAGE_SIZE.width - PAGE_MARGIN.right, y);
  y += LINE_HEIGHT;

  return y;
}

// ─── SECTION 2: VHL SANS HAUBANAGE ────────────────────────────────────────────
//  Two-column layout:
//    Left  — Charge V, Charge H, Charge L
//    Right — Résultante (same row as Charge V)
//  Bottom: full-width separator line (lineWidth 0.2)
/** Draws the "VHL sans haubanage" section. Returns the next Y position. */
export function drawVtlWithoutGuyingSection(doc: jsPDF, data: VtlGuyingReportData, startY: number): number {
  let y = startY;
  const leftX = PAGE_MARGIN.left + PARAGRAPH_INDENT;
  const rightX = PAGE_MARGIN.left + CONTENT_WIDTH / 2 + PARAGRAPH_INDENT; // aligned with right column // aligned with diagram left edge

  // Section title (underlined) — at page margin, no indent
  doc.setFont('Nunito', 'bold');
  doc.setFontSize(FONT_SIZES.sectionTitle);
  doc.text(PDF_LABELS.vtlWithoutGuyingTitle, PAGE_MARGIN.left, y);
  const titleWidth = doc.getTextWidth(PDF_LABELS.vtlWithoutGuyingTitle);
  doc.setLineWidth(LINE_WIDTH_THIN);
  doc.line(PAGE_MARGIN.left, y + 1, PAGE_MARGIN.left + titleWidth, y + 1);
  y += LINE_HEIGHT + 2;

  // Charge V
  drawBulletItem(doc, PDF_LABELS.chargeV, formatValue(data.vtlChargeV, UNITS.daN), leftX, y);
  // Résultante (right column)
  drawBulletItem(doc, PDF_LABELS.resultant, formatValue(data.vtlResultant, UNITS.daN), rightX, y, true);
  y += LINE_HEIGHT;

  // Charge H
  drawBulletItem(doc, PDF_LABELS.chargeH, formatValue(data.vtlChargeH, UNITS.daN), leftX, y);
  y += LINE_HEIGHT;

  // Charge L
  drawBulletItem(doc, PDF_LABELS.chargeL, formatValue(data.vtlChargeL, UNITS.daN), leftX, y);
  y += LINE_HEIGHT;
  y -= 2; // tighten gap before separator

  // Separator
  doc.setLineWidth(0.2);
  doc.line(PAGE_MARGIN.left, y, PAGE_SIZE.width - PAGE_MARGIN.right, y);
  y += LINE_HEIGHT;

  return y;
}

// ─── SECTION 3: HAUBANAGE ─────────────────────────────────────────────────────
//  Two-column layout:
//    Left   (leftX = PAGE_MARGIN.left + PARAGRAPH_INDENT) — Portée haubanée, Support de référence,
//                                                           Type de support, Altitude,
//                                                           Distance horizontale, Avec poulie
//    Center (imgX = page center − imgWidth/2)             — Diagram image (square, ratio 1:1)
//  Diagram border: DIAGRAM_PADDING=3mm white space between image edge and border rect
//    Source file : public/img/VHL-Haubanage-Suspension-Droite.png  (must have white/transparent background)
//    To resize: change imgWidth (imgHeight computed proportionally) — imgX updates automatically
//  Bottom: full-width separator line (lineWidth 0.2)
/** Draws the "Haubanage" section with parameters and diagram image. Returns the next Y position. */
export function drawGuyingSection(doc: jsPDF, data: VtlGuyingReportData, startY: number): number {
  let y = startY;
  const leftX = PAGE_MARGIN.left + PARAGRAPH_INDENT;

  // Section title (underlined) — at page margin, no indent
  doc.setFont('Nunito', 'bold');
  doc.setFontSize(FONT_SIZES.sectionTitle);
  doc.text(PDF_LABELS.guyingTitle, PAGE_MARGIN.left, y);
  const titleWidth = doc.getTextWidth(PDF_LABELS.guyingTitle);
  doc.setLineWidth(0.3);
  doc.line(PAGE_MARGIN.left, y + 1, PAGE_MARGIN.left + titleWidth, y + 1);
  y += LINE_HEIGHT + 2;

  const paramsStartY = y;

  // ── Left column params ───────────────────────────────────────────────────────
  let leftY = paramsStartY;
  drawBulletItem(doc, PDF_LABELS.guyingSpan, data.guyingSpan || '-', leftX, leftY);
  leftY += LINE_HEIGHT;
  drawBulletItem(doc, PDF_LABELS.referenceSupport, data.referenceSupport || '-', leftX, leftY);
  leftY += LINE_HEIGHT;
  drawBulletItem(doc, PDF_LABELS.supportType, data.supportType || '-', leftX, leftY);
  leftY += LINE_HEIGHT;
  drawBulletItem(doc, PDF_LABELS.altitude, formatValue(data.altitude, UNITS.meters), leftX, leftY);
  leftY += LINE_HEIGHT;
  drawBulletItem(doc, PDF_LABELS.horizontalDistance, formatValue(data.horizontalDistance, UNITS.meters), leftX, leftY);
  leftY += LINE_HEIGHT;
  const pulleyValue = data.hasPulley ? PDF_LABELS.yes : PDF_LABELS.no;
  drawBulletItem(doc, PDF_LABELS.hasPulley, pulleyValue, leftX, leftY);
  leftY += LINE_HEIGHT;

  // ── Center column: diagram image (starts at paramsStartY) ───────────────────
  //   To resize: change imgWidth (imgHeight = imgWidth — source image is 2248×2248 px, ratio 1:1)
  //   imgX is computed dynamically to center the image on the page
  //   TEXT_ASCENDER_MM: jsPDF text Y = baseline; image Y = top-left corner.
  //   Shift the image up by the approximate cap-height so its top aligns with the first text row.
  const imgWidth = DIAGRAM_WIDTH; // mm — diagram width (shared with Résultante column via DIAGRAM_WIDTH constant)
  const imgHeight = imgWidth; // mm — source image is square (2248×2248 px, ratio 1:1)
  const DIAGRAM_PADDING = 3; // mm — white space between image edge and border rect
  const TEXT_ASCENDER_MM = 2; // mm — approximate cap-height of FONT_SIZES.label (9 pt)
  const imgX = PAGE_MARGIN.left + CONTENT_WIDTH / 2 + PARAGRAPH_INDENT; // aligned with right column // mm — right-aligned
  const imgY = paramsStartY - TEXT_ASCENDER_MM; // align image top with text cap-height
  let imgEndY = paramsStartY;
  if (data.diagramImageBase64) {
    doc.addImage(data.diagramImageBase64, 'PNG', imgX, imgY, imgWidth, imgHeight);
    doc.setDrawColor(0);
    imgEndY = imgY + imgHeight + DIAGRAM_PADDING;
  }

  y = Math.max(leftY, imgEndY) + LINE_HEIGHT;
  y -= 4; // tighten gap before separator

  // Separator
  doc.setLineWidth(LINE_WIDTH_THIN);
  doc.line(PAGE_MARGIN.left, y, PAGE_SIZE.width - PAGE_MARGIN.right, y);
  y += LINE_HEIGHT;

  return y;
}

// ─── SECTION 4: VHL AVEC HAUBANAGE ────────────────────────────────────────────
//  Explanatory text: 2 italic paragraphs, full width (CONTENT_WIDTH - 10)
//  Results (two-column):
//    Row 1 — Tension dans le hauban (left) | Charge V sous console (right)
//    Row 2 — Angle hauban / horizon  (left) | Charge H sous console (right)
//    Row 3 — (empty left)                   | Charge L si poulie    (right)
//  Comment: label on one line, indented value on next line (wraps to CONTENT_WIDTH - 15)
//  No bottom separator — last section before footer
/** Draws the "VHL avec haubanage" section with results and comment. Returns the next Y position. */
export function drawVtlWithGuyingSection(doc: jsPDF, data: VtlGuyingReportData, startY: number): number {
  let y = startY;
  const leftX = PAGE_MARGIN.left + PARAGRAPH_INDENT;
  const rightX = PAGE_MARGIN.left + CONTENT_WIDTH / 2 + PARAGRAPH_INDENT;

  // Section title (underlined) — at page margin, no indent
  doc.setFont('Nunito', 'bold');
  doc.setFontSize(FONT_SIZES.sectionTitle);
  doc.text(PDF_LABELS.vtlWithGuyingTitle, PAGE_MARGIN.left, y);
  const titleWidth = doc.getTextWidth(PDF_LABELS.vtlWithGuyingTitle);
  doc.setLineWidth(LINE_WIDTH_THIN);
  doc.line(PAGE_MARGIN.left, y + 1, PAGE_MARGIN.left + titleWidth, y + 1);
  y += LINE_HEIGHT + 2;

  // Explanatory text (italic, with bullet — wrapped text indented past bullet)
  doc.setFont('Nunito', 'italic');
  doc.setFontSize(FONT_SIZES.value);
  const noteBullet = `${BULLET} `;
  const noteBulletW = doc.getTextWidth(noteBullet);
  const noteWrapWidth = CONTENT_WIDTH - 10 - noteBulletW;

  doc.text(noteBullet, leftX, y);
  const explanation1Lines = doc.splitTextToSize(PDF_LABELS.vtlWithGuyingExplanation1, noteWrapWidth);
  doc.text(explanation1Lines, leftX + noteBulletW, y);
  y += explanation1Lines.length * (LINE_HEIGHT + 1); // reduced gap between the two notes

  doc.text(noteBullet, leftX, y);
  const explanation2Lines = doc.splitTextToSize(PDF_LABELS.vtlWithGuyingExplanation2, noteWrapWidth);
  doc.text(explanation2Lines, leftX + noteBulletW, y);
  y += explanation2Lines.length * LINE_HEIGHT;

  // Results - left column (all result values rendered in bold per spec)
  drawBulletItem(doc, PDF_LABELS.tensionInGuy, formatValue(data.tensionInGuy, UNITS.daN), leftX, y, true);
  drawBulletItem(
    doc,
    PDF_LABELS.chargeVUnderConsole,
    formatValue(data.chargeVUnderConsole, UNITS.daN),
    rightX,
    y,
    true
  );
  y += LINE_HEIGHT;

  drawBulletItem(doc, PDF_LABELS.guyAngle, formatValue(data.guyAngle, UNITS.degrees), leftX, y, true);
  drawBulletItem(
    doc,
    PDF_LABELS.chargeHUnderConsole,
    formatValue(data.chargeHUnderConsole, UNITS.daN),
    rightX,
    y,
    true
  );
  y += LINE_HEIGHT;

  // Charge L (si poulie) - only on right, bold per spec
  drawBulletItem(doc, PDF_LABELS.chargeLIfPulley, formatValue(data.chargeLIfPulley, UNITS.daN), rightX, y, true);
  y += LINE_HEIGHT + 2;

  // Comment: label on its own line, value below indented and justified
  doc.setFont('Nunito', 'bold');
  doc.setFontSize(FONT_SIZES.label);
  doc.text(`${BULLET} ${PDF_LABELS.comment} :`, leftX, y);
  y += LINE_HEIGHT;

  doc.setFont('Nunito', 'normal');
  doc.setFontSize(FONT_SIZES.value);
  const commentIndent = leftX;
  const commentWidth = CONTENT_WIDTH - PARAGRAPH_INDENT;
  const commentLines = doc.splitTextToSize(data.comment || '-', commentWidth);
  commentLines.forEach((line: string, index: number) => {
    const isLastLine = index === commentLines.length - 1;
    doc.text(line, commentIndent, y, isLastLine ? {} : { align: 'justify', maxWidth: commentWidth });
    y += LINE_HEIGHT - 1;
  });

  return y;
}

/** Loads an image from a URL and returns it as a base64 data URL. */
export async function loadImageAsBase64(url: string): Promise<string> {
  const response = await globalThis.fetch(url);
  const blob = await response.blob();
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
