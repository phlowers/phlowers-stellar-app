/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { inject, Injectable } from '@angular/core';
import type jsPDF from 'jspdf';

import { NotificationService } from '@core/services/notification/notification.service';
import { TranslocoService } from '@jsverse/transloco';

import { PdfBaseService } from '@shared/pdf/pdf-base.service';
import { drawFooter, drawHeader, loadImageAsBase64 } from '@shared/pdf/pdf-primitives.helpers';

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

  /** Resolves all PDF report labels via TranslocoService at report-generation time. */
  private buildLabels(): PdfLabels {
    const entries = Object.entries(PDF_LABEL_KEYS) as [keyof PdfLabels, string][];
    return entries.reduce((labels, [field, key]) => {
      labels[field] = this.translocoService.translate(key);
      return labels;
    }, {} as PdfLabels);
  }

  private addPageFooters(doc: jsPDF, labels: PdfLabels): void {
    const totalPages = doc.getNumberOfPages();

    for (let pageNumber = 1; pageNumber <= totalPages; pageNumber += 1) {
      doc.setPage(pageNumber);
      drawFooter(doc, `${labels.pageLabel} ${pageNumber} / ${totalPages}`);
    }
  }

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
    try {
      const doc = await this.createDoc();
      const labels = this.buildLabels();

      let y = drawHeader(doc, data.date ?? '-', labels.reportTitle);
      y = drawStudySection(doc, data, labels, y);
      y = drawVtlWithoutGuyingSection(doc, data, labels, y);
      y = drawGuyingSection(doc, data, labels, y);
      drawVtlWithGuyingSection(doc, data, labels, y);
      this.addPageFooters(doc, labels);

      const safeDate = data.date.replace(/[/\\:*?"<>|]/g, '-');
      const filename = `rapport-vhl-haubanage-${safeDate}.pdf`;
      doc.save(filename);

      this.notificationService.success(
        this.translocoService.translate('studio.vtl-guying-report.report-generated-success')
      );
    } catch (error) {
      this.logger.error('Failed to generate VHL & Guying report', error);
      this.notificationService.error(
        this.translocoService.translate('studio.vtl-guying-report.report-generation-failed')
      );
    }
  }
}
