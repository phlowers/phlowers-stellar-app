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
//  Two-column layout: leftX = PAGE_MARGIN.left + 5
//                     rightX = PAGE_MARGIN.left + CONTENT_WIDTH / 2 + 5
// ─────────────────────────────────────────────────────────────────────────────

import jsPDF from 'jspdf';

import { VtlGuyingReportData } from './vtl-guying-report.interfaces';
import {
  APP_NAME,
  BULLET,
  CONTENT_WIDTH,
  DECIMAL_PLACES,
  FONT_SIZES,
  LINE_HEIGHT,
  PAGE_MARGIN,
  PAGE_SIZE,
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
//  Label = bold helvetica, value = normal helvetica — inline on same Y
/** Draws text with a bullet point prefix. Label is bold, value is normal. */
function drawBulletItem(doc: jsPDF, label: string, value: string, x: number, y: number): void {
  const bulletText = `${BULLET} `;
  doc.setFont('Nunito', 'bold');
  doc.setFontSize(FONT_SIZES.label);
  doc.text(bulletText + label + ' : ', x, y);
  const labelWidth = doc.getTextWidth(bulletText + label + ' : ');
  doc.setFont('Nunito', 'normal');
  doc.text(value, x + labelWidth, y);
}

// ─── SECTION 0: HEADER ────────────────────────────────────────────────────────
//  [TOP RIGHT]  App name          → FONT_SIZES.appName (constantes.ts)
//  [TOP LEFT]   Report title      → FONT_SIZES.title   (constantes.ts) — bold
//  [SEPARATOR]  Full-width line   → lineWidth 0.5 mm, gap before = 10 mm (↑ more space / ↓ less)
/** Draws the PDF header: title + app name + separator line. Returns the next Y position. */
export function drawHeader(doc: jsPDF): number {
  let y = PAGE_MARGIN.top;

  // App name (top right) — size: FONT_SIZES.appName
  doc.setFont('Nunito', 'normal');
  doc.setFontSize(FONT_SIZES.appName);
  doc.text(APP_NAME, PAGE_SIZE.width - PAGE_MARGIN.right, y, { align: 'right' });

  // Report title (top left, bold) — size: FONT_SIZES.title
  doc.setFont('Nunito', 'bold');
  doc.setFontSize(FONT_SIZES.title);
  y += LINE_HEIGHT + 2; // vertical gap between app name baseline and title baseline
  doc.text(PDF_LABELS.reportTitle, PAGE_MARGIN.left, y);

  // Main separator line — gap of 10 mm below title text (adjust here to change spacing)
  y += 10;
  doc.setLineWidth(0.5); // thicker than section separators (0.2)
  doc.line(PAGE_MARGIN.left, y, PAGE_SIZE.width - PAGE_MARGIN.right, y);
  y += LINE_HEIGHT;

  return y;
}

// ─── SECTION FOOTER ───────────────────────────────────────────────────────────
//  [BOTTOM RIGHT]  "Page 1 / 1"  — fixed at PAGE_SIZE.height - 10 mm (287 mm on A4)
//  Font size: FONT_SIZES.footer (constantes.ts)
/** Draws the page footer (page number). */
export function drawFooter(doc: jsPDF): void {
  doc.setFont('Nunito', 'normal');
  doc.setFontSize(FONT_SIZES.footer);
  doc.text(PDF_LABELS.pageFooter, PAGE_SIZE.width - PAGE_MARGIN.right, PAGE_SIZE.height - 10, { align: 'right' });
}

// ─── SECTION 1: ÉTUDE ET CANTON ───────────────────────────────────────────────
//  Two-column layout: left column  = [PAGE_MARGIN.left+5 .. CONTENT_WIDTH/2]
//                     right column = [CONTENT_WIDTH/2+5 .. page right margin]
//  Row layout:
//    Row 1 — Auteur (left)  |  Date (right)
//    Row 2 — Etude (left, wraps if too long)  |  Canton (right, aligned on line 1)
//    Row 3 — Description de l'étude (left, indented 8 mm, wraps)
//    Row 4 — Commentaire du canton  (left, indented 8 mm, wraps)
//    Row 5 — Cas de charge (left)  |  Description du cas de charge (right, wraps)
//  Bottom: full-width separator line (lineWidth 0.2)
/** Draws the "Étude et canton" section. Returns the next Y position. */
export function drawStudySection(doc: jsPDF, data: VtlGuyingReportData, startY: number): number {
  let y = startY;
  const leftX = PAGE_MARGIN.left + 5; // left column X origin
  const rightX = PAGE_MARGIN.left + CONTENT_WIDTH / 2 + 5; // right column X origin

  // Section title (underlined)
  doc.setFont('Nunito', 'bold');
  doc.setFontSize(FONT_SIZES.sectionTitle);
  doc.text(PDF_LABELS.studySectionTitle, leftX, y);
  const titleWidth = doc.getTextWidth(PDF_LABELS.studySectionTitle);
  doc.setLineWidth(0.3);
  doc.line(leftX, y + 1, leftX + titleWidth, y + 1);
  y += LINE_HEIGHT + 2;

  // Row 1: Auteur / Date
  drawBulletItem(doc, PDF_LABELS.author, data.author || '-', leftX, y);
  drawBulletItem(doc, PDF_LABELS.date, data.date || '-', rightX, y);
  y += LINE_HEIGHT;

  // Row 2: Étude (wraps if long) / Canton aligned on first line
  const studyBulletLabel = `${BULLET} ${PDF_LABELS.study} : `;
  doc.setFont('Nunito', 'bold');
  doc.setFontSize(FONT_SIZES.label);
  doc.text(studyBulletLabel, leftX, y);
  const studyLabelW = doc.getTextWidth(studyBulletLabel);
  doc.setFont('Nunito', 'normal');
  const studyTitleLines = doc.splitTextToSize(data.studyTitle || '-', CONTENT_WIDTH / 2 - studyLabelW - 5);
  doc.text(studyTitleLines, leftX + studyLabelW, y);
  drawBulletItem(doc, PDF_LABELS.section, data.sectionName || '-', rightX, y);
  y += Math.max(studyTitleLines.length, 1) * LINE_HEIGHT;

  // Row 3: Description de l'étude
  drawBulletItem(doc, PDF_LABELS.studyDescription, '', leftX, y);
  y += LINE_HEIGHT - 1;
  doc.setFont('Nunito', 'normal');
  doc.setFontSize(FONT_SIZES.value);
  const descLines = doc.splitTextToSize(data.studyDescription || '-', CONTENT_WIDTH / 2 - 15);
  doc.text(descLines, leftX + 8, y);
  // Right column: Description du cas de charge is in row 5
  y += descLines.length * (LINE_HEIGHT - 1);

  // Row 4: Commentaire du canton
  drawBulletItem(doc, PDF_LABELS.sectionComment, '', leftX, y);
  y += LINE_HEIGHT - 1;
  doc.setFont('Nunito', 'normal');
  doc.setFontSize(FONT_SIZES.value);
  const commentLines = doc.splitTextToSize(data.sectionComment || '-', CONTENT_WIDTH / 2 - 15);
  doc.text(commentLines, leftX + 8, y);
  y += commentLines.length * (LINE_HEIGHT - 1);

  // Row 5: Cas de charge / Description du cas de charge
  drawBulletItem(doc, PDF_LABELS.chargeName, data.chargeName || '-', leftX, y);
  drawBulletItem(doc, PDF_LABELS.chargeDescription, '', rightX, y);
  y += LINE_HEIGHT - 1;
  doc.setFont('Nunito', 'normal');
  doc.setFontSize(FONT_SIZES.value);
  const chargeDescLines = doc.splitTextToSize(data.chargeDescription || '-', CONTENT_WIDTH / 2 - 15);
  doc.text(chargeDescLines, rightX + 8, y);
  y += Math.max(chargeDescLines.length * (LINE_HEIGHT - 1), LINE_HEIGHT);

  // Separator line
  doc.setLineWidth(0.2);
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
  const leftX = PAGE_MARGIN.left + 5;
  const rightX = PAGE_MARGIN.left + CONTENT_WIDTH / 2 + 5;

  // Section title (underlined)
  doc.setFont('Nunito', 'bold');
  doc.setFontSize(FONT_SIZES.sectionTitle);
  doc.text(PDF_LABELS.vtlWithoutGuyingTitle, leftX, y);
  const titleWidth = doc.getTextWidth(PDF_LABELS.vtlWithoutGuyingTitle);
  doc.setLineWidth(0.3);
  doc.line(leftX, y + 1, leftX + titleWidth, y + 1);
  y += LINE_HEIGHT + 2;

  // Charge V
  drawBulletItem(doc, PDF_LABELS.chargeV, formatValue(data.vtlChargeV, UNITS.daN), leftX, y);
  // Résultante (right column)
  drawBulletItem(doc, PDF_LABELS.resultant, formatValue(data.vtlResultant, UNITS.daN), rightX, y);
  y += LINE_HEIGHT;

  // Charge H
  drawBulletItem(doc, PDF_LABELS.chargeH, formatValue(data.vtlChargeH, UNITS.daN), leftX, y);
  y += LINE_HEIGHT;

  // Charge L
  drawBulletItem(doc, PDF_LABELS.chargeL, formatValue(data.vtlChargeL, UNITS.daN), leftX, y);
  y += LINE_HEIGHT + 2;

  // Separator
  doc.setLineWidth(0.2);
  doc.line(PAGE_MARGIN.left, y, PAGE_SIZE.width - PAGE_MARGIN.right, y);
  y += LINE_HEIGHT;

  return y;
}

// ─── SECTION 3: HAUBANAGE ─────────────────────────────────────────────────────
//  Three-column layout (all three start at paramsStartY):
//    Left   (leftX=20mm)      — Portée haubanée, Support de référence, Type de support
//    Center (imgX=72mm)       — Diagram image (imgWidth=55mm, imgHeight=45mm)
//    Right  (rightColX=135mm) — Altitude, Distance horizontale, Avec poulie
//  Diagram border: DIAGRAM_PADDING=3mm white space between image edge and border rect
//    Source file : public/img/guying-help.png  (must have white/transparent background)
//    To resize: change imgWidth / imgHeight  |  To reposition: adjust imgX / rightColX
//  Bottom: full-width separator line (lineWidth 0.2)
/** Draws the "Haubanage" section with parameters and diagram image. Returns the next Y position. */
export function drawGuyingSection(doc: jsPDF, data: VtlGuyingReportData, startY: number): number {
  let y = startY;
  const leftX = PAGE_MARGIN.left + 5;

  // Section title (underlined)
  doc.setFont('Nunito', 'bold');
  doc.setFontSize(FONT_SIZES.sectionTitle);
  doc.text(PDF_LABELS.guyingTitle, leftX, y);
  const titleWidth = doc.getTextWidth(PDF_LABELS.guyingTitle);
  doc.setLineWidth(0.3);
  doc.line(leftX, y + 1, leftX + titleWidth, y + 1);
  y += LINE_HEIGHT + 2;

  const paramsStartY = y;

  // ── Left column params (leftX = 20mm) ───────────────────────────────────────
  let leftY = paramsStartY;
  drawBulletItem(doc, PDF_LABELS.guyingSpan, data.guyingSpan || '-', leftX, leftY);
  leftY += LINE_HEIGHT;
  drawBulletItem(doc, PDF_LABELS.referenceSupport, data.referenceSupport || '-', leftX, leftY);
  leftY += LINE_HEIGHT;
  drawBulletItem(doc, PDF_LABELS.supportType, data.supportType || '-', leftX, leftY);
  leftY += LINE_HEIGHT;

  // ── Center column: diagram image (starts at paramsStartY) ───────────────────
  //   To resize: change imgWidth / imgHeight (in mm)
  //   To reposition: adjust imgX (left text must end before imgX − DIAGRAM_PADDING)
  //                  and rightColX must be > imgX + imgWidth + DIAGRAM_PADDING + gap
  const imgX = 72; // mm — center column start (left text ends ~65mm max)
  const imgWidth = 55; // mm — diagram width
  const imgHeight = 45; // mm — diagram height
  const DIAGRAM_PADDING = 3; // mm — white space between image edge and border rect
  let imgEndY = paramsStartY;
  if (data.diagramImageBase64) {
    doc.addImage(data.diagramImageBase64, 'PNG', imgX, paramsStartY, imgWidth, imgHeight);
    doc.setDrawColor(0);
    doc.setLineWidth(0.3);
    doc.rect(
      imgX - DIAGRAM_PADDING,
      paramsStartY - DIAGRAM_PADDING,
      imgWidth + 2 * DIAGRAM_PADDING,
      imgHeight + 2 * DIAGRAM_PADDING
    );
    imgEndY = paramsStartY + imgHeight + DIAGRAM_PADDING;
  }

  // ── Right column params (rightColX = 135mm, after diagram border ends at ~130mm) ──
  const rightColX = 135; // mm — imgX + imgWidth + DIAGRAM_PADDING + 5mm gap = 72+55+3+5
  let rightY = paramsStartY;
  drawBulletItem(doc, PDF_LABELS.altitude, formatValue(data.altitude, UNITS.meters), rightColX, rightY);
  rightY += LINE_HEIGHT;
  drawBulletItem(
    doc,
    PDF_LABELS.horizontalDistance,
    formatValue(data.horizontalDistance, UNITS.meters),
    rightColX,
    rightY
  );
  rightY += LINE_HEIGHT;
  const pulleyValue = data.hasPulley ? PDF_LABELS.yes : PDF_LABELS.no;
  drawBulletItem(doc, PDF_LABELS.hasPulley, pulleyValue, rightColX, rightY);
  rightY += LINE_HEIGHT;

  y = Math.max(leftY, imgEndY, rightY) + LINE_HEIGHT;

  // Separator
  doc.setLineWidth(0.2);
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
  const leftX = PAGE_MARGIN.left + 5;
  const rightX = PAGE_MARGIN.left + CONTENT_WIDTH / 2 + 5;

  // Section title (underlined)
  doc.setFont('Nunito', 'bold');
  doc.setFontSize(FONT_SIZES.sectionTitle);
  doc.text(PDF_LABELS.vtlWithGuyingTitle, leftX, y);
  const titleWidth = doc.getTextWidth(PDF_LABELS.vtlWithGuyingTitle);
  doc.setLineWidth(0.3);
  doc.line(leftX, y + 1, leftX + titleWidth, y + 1);
  y += LINE_HEIGHT + 2;

  // Explanatory text (italic)
  doc.setFont('Nunito', 'italic');
  doc.setFontSize(FONT_SIZES.value);
  const explanation1Lines = doc.splitTextToSize(PDF_LABELS.vtlWithGuyingExplanation1, CONTENT_WIDTH - 10);
  doc.text(explanation1Lines, leftX, y);
  y += explanation1Lines.length * (LINE_HEIGHT - 1) + 2;

  const explanation2Lines = doc.splitTextToSize(PDF_LABELS.vtlWithGuyingExplanation2, CONTENT_WIDTH - 10);
  doc.text(explanation2Lines, leftX, y);
  y += explanation2Lines.length * (LINE_HEIGHT - 1) + LINE_HEIGHT;

  // Results - left column
  drawBulletItem(doc, PDF_LABELS.tensionInGuy, formatValue(data.tensionInGuy, UNITS.daN), leftX, y);
  drawBulletItem(doc, PDF_LABELS.chargeVUnderConsole, formatValue(data.chargeVUnderConsole, UNITS.daN), rightX, y);
  y += LINE_HEIGHT;

  drawBulletItem(doc, PDF_LABELS.guyAngle, formatValue(data.guyAngle, UNITS.degrees), leftX, y);
  drawBulletItem(doc, PDF_LABELS.chargeHUnderConsole, formatValue(data.chargeHUnderConsole, UNITS.daN), rightX, y);
  y += LINE_HEIGHT;

  // Charge L (si poulie) - only on right
  drawBulletItem(doc, PDF_LABELS.chargeLIfPulley, formatValue(data.chargeLIfPulley, UNITS.daN), rightX, y);
  y += LINE_HEIGHT + 2;

  // Comment
  drawBulletItem(doc, PDF_LABELS.comment, '', leftX, y);
  y += LINE_HEIGHT - 1;
  doc.setFont('Nunito', 'normal');
  doc.setFontSize(FONT_SIZES.value);
  const commentLines = doc.splitTextToSize(data.comment || '-', CONTENT_WIDTH - 15);
  doc.text(commentLines, leftX + 8, y);
  y += commentLines.length * (LINE_HEIGHT - 1) + LINE_HEIGHT;

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
