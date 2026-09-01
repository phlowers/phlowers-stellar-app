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
import { PAGE_SIZE } from '@shared/pdf/pdf-layout.constantes';
import { drawFooter, drawHeader } from '@shared/pdf/pdf-primitives.helpers';

import { LANDSCAPE_PAGE, PDF_LABEL_KEYS, SPAN_METRICS, SUPPORT_METRICS } from './canton-state-report.constantes';
import {
  buildTables,
  computeLabelColWidth,
  drawCantonStateSection,
  drawCartoucheSection,
  drawResultTablesSection
} from './canton-state-report.helpers';
import { CantonReportLabels, CantonStateReportData } from './canton-state-report.interfaces';

/** Service responsible for generating the canton state PDF report. */
@Injectable({ providedIn: 'root' })
export class CantonStateReportService extends PdfBaseService {
  private readonly notificationService = inject(NotificationService);
  private readonly translocoService = inject(TranslocoService);

  /** Resolves all fixed PDF report labels via TranslocoService at report-generation time. */
  private buildLabels(): CantonReportLabels {
    const entries = Object.entries(PDF_LABEL_KEYS) as [keyof CantonReportLabels, string][];
    return entries.reduce((labels, [field, key]) => {
      labels[field] = this.translocoService.translate(key);
      return labels;
    }, {} as CantonReportLabels);
  }

  /** Draws a footer on every page, using portrait dimensions for page 1 and landscape for the rest. */
  private addPageFooters(doc: jsPDF, labels: CantonReportLabels): void {
    const totalPages = doc.getNumberOfPages();
    for (let pageNumber = 1; pageNumber <= totalPages; pageNumber += 1) {
      doc.setPage(pageNumber);
      const isLandscape = pageNumber > 1;
      const width = isLandscape ? LANDSCAPE_PAGE.width : PAGE_SIZE.width;
      const height = isLandscape ? LANDSCAPE_PAGE.height : PAGE_SIZE.height;
      drawFooter(doc, `${labels.pageLabel} ${pageNumber} / ${totalPages}`, width, height);
    }
  }

  /** Sanitizes a filename fragment by replacing characters that are illegal on common filesystems. */
  private sanitize(value: string): string {
    return value.replace(/[/\\:*?"<>|]/g, '-');
  }

  /** Generates and downloads the canton state PDF report. */
  async generateReport(data: CantonStateReportData): Promise<void> {
    try {
      const doc = await this.createDoc();
      const labels = this.buildLabels();
      const translate = (key: string): string => this.translocoService.translate(key);

      // Page 1 — portrait: header, cartouche, canton state
      let y = drawHeader(doc, data.date || '-', labels.reportTitle);
      y = drawCartoucheSection(doc, data, labels, y);
      drawCantonStateSection(doc, data, labels, y);

      // Following pages — landscape: span then support result tables, sharing one label column width
      const spanTables = buildTables(data.spans, SPAN_METRICS, translate);
      const supportTables = buildTables(data.supports, SUPPORT_METRICS, translate);
      const labelColWidth = computeLabelColWidth(doc, [...spanTables, ...supportTables]);

      drawResultTablesSection(doc, data.date || '-', labels.reportTitle, labels.spansTitle, spanTables, labelColWidth);
      drawResultTablesSection(
        doc,
        data.date || '-',
        labels.reportTitle,
        labels.supportsTitle,
        supportTables,
        labelColWidth
      );

      this.addPageFooters(doc, labels);

      const filename = `Rapport Etat de canton_${this.sanitize(data.cantonName)}_${this.sanitize(
        data.chargeName
      )}_${this.sanitize(data.date)}.pdf`;
      doc.save(filename);

      this.notificationService.success(
        this.translocoService.translate('studio.canton-state-report.report-generated-success')
      );
    } catch (error) {
      this.logger.error('Failed to generate canton state report', error);
      this.notificationService.error(
        this.translocoService.translate('studio.canton-state-report.report-generation-failed')
      );
    }
  }
}
