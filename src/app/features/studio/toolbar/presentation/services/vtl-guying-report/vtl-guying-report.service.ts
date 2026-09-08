/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { inject, Injectable } from '@angular/core';

import { NotificationService } from '@core/services/notification/notification.service';
import { TranslocoService } from '@jsverse/transloco';

import { PdfBaseService } from '@shared/pdf/pdf-base.service';
import {
  buildReportLabels,
  drawHeader,
  drawPageFooters,
  generatePdfReport,
  loadImageAsBase64,
  sanitizeFilenamePart
} from '@shared/pdf/pdf-primitives.helpers';

import { PDF_LABEL_KEYS } from './vtl-guying-report.constantes';
import {
  drawGuyingSection,
  drawStudySection,
  drawVtlWithGuyingSection,
  drawVtlWithoutGuyingSection
} from './vtl-guying-report.helpers';
import { PdfLabels, VtlGuyingReportData } from './vtl-guying-report.interfaces';

/** Service responsible for generating the VHL & Guying PDF report. */
@Injectable({ providedIn: 'root' })
export class VtlGuyingReportService extends PdfBaseService {
  private readonly notificationService = inject(NotificationService);
  private readonly translocoService = inject(TranslocoService);

  private diagramImageCache: string | null = null;

  /** Pre-loads the diagram image and caches it for future report generation. */
  async preloadDiagramImage(): Promise<void> {
    if (this.diagramImageCache) {
      return;
    }
    try {
      this.diagramImageCache = await loadImageAsBase64('img/VHL-Haubanage-Suspension-Droite.webp');
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
  // Inherited from PdfBaseService: preloadFonts()

  /** Generates and downloads the VHL & Guying PDF report. */
  async generateReport(data: VtlGuyingReportData): Promise<void> {
    const translate = (key: string): string => this.translocoService.translate(key);

    await generatePdfReport({
      logger: this.logger,
      notificationService: this.notificationService,
      translate,
      errorLogMessage: 'Failed to generate VHL & Guying report',
      successKey: 'studio.vtl-guying-report.report-generated-success',
      errorKey: 'studio.vtl-guying-report.report-generation-failed',
      build: async () => {
        const doc = await this.createDoc();
        const labels = buildReportLabels<PdfLabels>(translate, PDF_LABEL_KEYS);

        let y = drawHeader(doc, data.date ?? '-', labels.reportTitle);
        y = drawStudySection(doc, data, labels, y);
        y = drawVtlWithoutGuyingSection(doc, data, labels, y);
        y = drawGuyingSection(doc, data, labels, y);
        drawVtlWithGuyingSection(doc, data, labels, y);
        drawPageFooters(doc, labels.pageLabel);

        const filename = `rapport-vhl-haubanage-${sanitizeFilenamePart(data.date)}.pdf`;

        return { doc, filename };
      }
    });
  }
}
