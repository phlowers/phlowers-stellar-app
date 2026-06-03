/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { inject, Injectable } from '@angular/core';
import jsPDF from 'jspdf';

import { LoggerService } from '@core/services/logger/logger.service';

import { loadFileAsBase64, registerNunitoFont } from '@shared/pdf/pdf-primitives.helpers';
import { PdfFonts } from '@shared/pdf/pdf-report.interfaces';

/** Abstract base service providing shared font preloading and jsPDF document creation for PDF reports. */
@Injectable()
export abstract class PdfBaseService {
  protected readonly logger = inject(LoggerService);

  private nunitoFontsCache: PdfFonts | null = null;

  /** Pre-loads Nunito font variants and caches them for future report generation. */
  async preloadFonts(): Promise<void> {
    if (this.nunitoFontsCache) {
      return;
    }
    try {
      const [regular, bold, italic] = await Promise.all([
        loadFileAsBase64('fonts/Nunito-Regular.ttf'),
        loadFileAsBase64('fonts/Nunito-Bold.ttf'),
        loadFileAsBase64('fonts/Nunito-Italic.ttf')
      ]);
      this.nunitoFontsCache = { regular, bold, italic };
    } catch (error) {
      this.logger.error('Failed to preload Nunito fonts', error);
    }
  }

  /** Creates a jsPDF A4 portrait document with Nunito font registered (preloads fonts if needed). */
  async createDoc(): Promise<jsPDF> {
    if (!this.nunitoFontsCache) {
      await this.preloadFonts();
    }
    const doc = new jsPDF('p', 'mm', 'a4');
    if (this.nunitoFontsCache) {
      registerNunitoFont(doc, this.nunitoFontsCache.regular, this.nunitoFontsCache.bold, this.nunitoFontsCache.italic);
    }
    return doc;
  }
}
