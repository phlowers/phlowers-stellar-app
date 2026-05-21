/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { inject, Injectable } from '@angular/core';
import jsPDF from 'jspdf';

import { LoggerService } from '@core/services/logger/logger.service';
import { NotificationService } from '@core/services/notification/notification.service';

import { VtlGuyingReportData } from './vtl-guying-report.interfaces';
import {
  drawFooter,
  drawGuyingSection,
  drawHeader,
  drawStudySection,
  drawVtlWithGuyingSection,
  drawVtlWithoutGuyingSection,
  loadFileAsBase64,
  loadImageAsBase64,
  registerNunitoFont
} from './vtl-guying-report.helpers';

/** Service responsible for generating the VHL & Guying PDF report. */
@Injectable({ providedIn: 'root' })
export class VtlGuyingReportService {
  private readonly logger = inject(LoggerService);
  private readonly notificationService = inject(NotificationService);

  private diagramImageCache: string | null = null;
  private nunitoFontsCache: { regular: string; bold: string; italic: string } | null = null;

  /** Pre-loads the diagram image and caches it for future report generation. */
  async preloadDiagramImage(): Promise<void> {
    if (this.diagramImageCache) {
      return;
    }
    try {
      this.diagramImageCache = await loadImageAsBase64('img/VHL-Haubanage-Suspension-Droite.png');
    } catch (error) {
      this.logger.error('Failed to preload guying diagram image', error);
    }
  }

  /** Returns the cached diagram image base64 string, loading it if necessary. */
  async getDiagramImageBase64(): Promise<string> {
    if (!this.diagramImageCache) {
      await this.preloadDiagramImage();
    }
    return this.diagramImageCache ?? '';
  }

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

  /** Generates and downloads the VHL & Guying PDF report. */
  async generateReport(data: VtlGuyingReportData): Promise<void> {
    try {
      if (!this.nunitoFontsCache) {
        await this.preloadFonts();
      }
      const doc = new jsPDF('p', 'mm', 'a4');
      if (this.nunitoFontsCache) {
        registerNunitoFont(
          doc,
          this.nunitoFontsCache.regular,
          this.nunitoFontsCache.bold,
          this.nunitoFontsCache.italic
        );
      }

      let y = drawHeader(doc);
      y = drawStudySection(doc, data, y);
      y = drawVtlWithoutGuyingSection(doc, data, y);
      y = drawGuyingSection(doc, data, y);
      drawVtlWithGuyingSection(doc, data, y);
      drawFooter(doc);

      const filename = `rapport-vhl-haubanage-${data.date}.pdf`;
      doc.save(filename);

      this.notificationService.success($localize`Report generated successfully`);
    } catch (error) {
      this.logger.error('Failed to generate VHL & Guying report', error);
      this.notificationService.error($localize`Failed to generate report`);
    }
  }
}
