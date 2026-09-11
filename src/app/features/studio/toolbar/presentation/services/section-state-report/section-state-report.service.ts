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
  sanitizeFilenamePart
} from '@shared/pdf/pdf-primitives.helpers';
import { buildTables, computeLabelColWidth, drawResultTablesSection } from '@shared/pdf/pdf-table.helpers';

import { PDF_LABEL_KEYS, SPAN_METRICS, SUPPORT_METRICS } from './section-state-report.constantes';
import { drawCartoucheSection, drawSectionStateSection } from './section-state-report.helpers';
import { SectionReportLabels, SectionStateReportData } from './section-state-report.interfaces';

/** Service responsible for generating the section state PDF report. */
@Injectable({ providedIn: 'root' })
export class SectionStateReportService extends PdfBaseService {
  private readonly notificationService = inject(NotificationService);
  private readonly translocoService = inject(TranslocoService);

  /** Generates and downloads the section state PDF report. */
  async generateReport(data: SectionStateReportData): Promise<void> {
    const translate = (key: string): string => this.translocoService.translate(key);

    await generatePdfReport({
      logger: this.logger,
      notificationService: this.notificationService,
      translate,
      errorLogMessage: 'Failed to generate section state report',
      successKey: 'studio.section-state-report.report-generated-success',
      errorKey: 'studio.section-state-report.report-generation-failed',
      build: async () => {
        const doc = await this.createDoc();
        const labels = buildReportLabels<SectionReportLabels>(translate, PDF_LABEL_KEYS);

        // Page 1 — portrait: header, cartouche, section state
        let y = drawHeader(doc, data.date || '-', labels.reportTitle);
        y = drawCartoucheSection(doc, data, labels, y);
        drawSectionStateSection(doc, data, labels, y);

        // Following pages — landscape: span then support result tables, sharing one label column width
        const spanTables = buildTables(data.spans, SPAN_METRICS, translate);
        const supportTables = buildTables(data.supports, SUPPORT_METRICS, translate);
        const labelColWidth = computeLabelColWidth(doc, [...spanTables, ...supportTables]);

        drawResultTablesSection(
          doc,
          data.date || '-',
          labels.reportTitle,
          labels.spansTitle,
          spanTables,
          labelColWidth
        );
        drawResultTablesSection(
          doc,
          data.date || '-',
          labels.reportTitle,
          labels.supportsTitle,
          supportTables,
          labelColWidth
        );

        drawPageFooters(doc, labels.pageLabel, true);

        const filename = `${sanitizeFilenamePart(labels.reportTitle)}_${sanitizeFilenamePart(
          data.sectionName
        )}_${sanitizeFilenamePart(data.chargeName)}_${sanitizeFilenamePart(data.date)}.pdf`;

        return { doc, filename };
      }
    });
  }
}
