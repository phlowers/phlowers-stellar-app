/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import jsPDF from 'jspdf';

/** Nunito font variants in base64 format. */
export interface PdfFonts {
  regular: string;
  bold: string;
  italic: string;
}

/** Contract for a PDF section that can draw itself and return the next Y position. */
export interface PdfSection {
  draw(doc: jsPDF, startY: number): number;
}

/** A single bullet line of a metadata section: bold label + value, optionally wrapping to several lines. */
export interface PdfBulletItem {
  label: string;
  value: string;
  /** When true, the value wraps across multiple lines (drawWrappingBulletItem); otherwise a single line. */
  wrap?: boolean;
}

/** Fields common to every PDF report's label set, resolved via Transloco at generation time. */
export interface BaseReportLabels {
  reportTitle: string;
  author: string;
  study: string;
  studyDescription: string;
  chargeName: string;
  chargeDescription: string;
  pageLabel: string;
}
