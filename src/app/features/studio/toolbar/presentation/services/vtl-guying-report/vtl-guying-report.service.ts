/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { inject, Injectable } from '@angular/core';

import { NotificationService } from '@core/services/notification/notification.service';

import { PdfBaseService } from '@shared/pdf/pdf-base.service';
import { drawFooter, drawHeader, loadImageAsBase64 } from '@shared/pdf/pdf-primitives.helpers';

import { PDF_LABELS } from './vtl-guying-report.constantes';
import {
  drawGuyingSection,
  drawStudySection,
  drawVtlWithGuyingSection,
  drawVtlWithoutGuyingSection
} from './vtl-guying-report.helpers';
import { VtlGuyingReportData } from './vtl-guying-report.interfaces';

/** Service responsible for generating the VHL & Guying PDF report. */
@Injectable({ providedIn: 'root' })
export class VtlGuyingReportService extends PdfBaseService {
  private readonly notificationService = inject(NotificationService);

  private diagramImageCache: string | null = null;

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
  // Inherited from PdfBaseService: preloadFonts()

  /** Generates and downloads the VHL & Guying PDF report. */
  async generateReport(data: VtlGuyingReportData): Promise<void> {
    try {
      const doc = await this.createDoc();

      let y = drawHeader(doc, data.date ?? '-', PDF_LABELS.reportTitle);
      y = drawStudySection(doc, data, y);
      y = drawVtlWithoutGuyingSection(doc, data, y);
      y = drawGuyingSection(doc, data, y);
      drawVtlWithGuyingSection(doc, data, y);
      drawFooter(doc, PDF_LABELS.pageFooter);

      const filename = `rapport-vhl-haubanage-${data.date}.pdf`;
      doc.save(filename);

      this.notificationService.success($localize`Report generated successfully`);
    } catch (error) {
      this.logger.error('Failed to generate VHL & Guying report', error);
      this.notificationService.error($localize`Failed to generate report`);
    }
  }
}
