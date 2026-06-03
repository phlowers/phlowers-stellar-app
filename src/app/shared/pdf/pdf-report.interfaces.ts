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
