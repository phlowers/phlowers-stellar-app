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
import { buildReportLabels, drawPageFooters, generatePdfReport, sanitizeFilenamePart } from '@shared/pdf/pdf-primitives.helpers';
import { buildTables, computeLabelColWidth, drawResultTablesSection } from '@shared/pdf/pdf-table.helpers';

import { PDF_LABEL_KEYS, SUPPORT_METRICS } from './section-data-report.constantes';
import { drawCantonReportPage1 } from './section-data-report.helpers';
import { CantonReportData, CantonReportLabels } from './section-data-report.interfaces';

/** Service responsible for generating the canton data PDF report. */
@Injectable({ providedIn: 'root' })
export class SectionDataReportService extends PdfBaseService {
  private readonly notificationService = inject(NotificationService);
  private readonly translocoService = inject(TranslocoService);

  /** Generates and downloads the canton data PDF report. */
  async generateReport(data: CantonReportData): Promise<void> {
    const translate = (key: string): string => this.translocoService.translate(key);

    await generatePdfReport({
      logger: this.logger,
      notificationService: this.notificationService,
      translate,
      errorLogMessage: 'Failed to generate canton data report',
      successKey: 'studio.canton-report.report-generated-success',
      errorKey: 'studio.canton-report.report-generation-failed',
      build: async () => {
        const doc = await this.createDoc();
        const labels = buildReportLabels<CantonReportLabels>(translate, PDF_LABEL_KEYS);

        // Page 1 — portrait: header, study & canton, canton, initial condition
        drawCantonReportPage1(doc, data, labels);

        // Following pages — landscape: supports list tables
        const supportTables = buildTables(data.supports, SUPPORT_METRICS, translate);
        const labelColWidth = computeLabelColWidth(doc, supportTables);
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
          data.cantonName
        )}_${sanitizeFilenamePart(data.icName)}_${sanitizeFilenamePart(data.date)}.pdf`;

        return { doc, filename };
      }
    });
  }
}
