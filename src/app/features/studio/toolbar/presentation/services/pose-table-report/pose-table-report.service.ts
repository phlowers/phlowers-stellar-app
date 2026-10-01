/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { inject, Injectable } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';

import { NotificationService } from '@core/services/notification/notification.service';
import { PdfBaseService } from '@shared/pdf/pdf-base.service';
import { PAGE_SIZE } from '@shared/pdf/pdf-layout.constantes';
import {
  buildReportLabels,
  drawPageFooters,
  drawSectionTitle,
  generatePdfReport,
  sanitizeFilenamePart
} from '@shared/pdf/pdf-primitives.helpers';
import { buildTables, computeLabelColWidth, drawTable } from '@shared/pdf/pdf-table.helpers';

import { PDF_POSE_TABLE_LABEL_KEYS, POSE_TABLE_METRICS } from './pose-table-report.constantes';
import { buildPoseTableRows, drawPoseTableReportPage1 } from './pose-table-report.helpers';
import { PoseTableReportData, PoseTableReportLabels } from './pose-table-report.interfaces';

/** Service responsible for generating the pose table PDF report. */
@Injectable({ providedIn: 'root' })
export class PoseTableReportService extends PdfBaseService {
  private readonly notificationService = inject(NotificationService);
  private readonly translocoService = inject(TranslocoService);

  /** Generates and downloads the pose table PDF report. */
  async generateReport(data: PoseTableReportData): Promise<void> {
    const translate = (key: string): string => this.translocoService.translate(key);

    await generatePdfReport({
      logger: this.logger,
      notificationService: this.notificationService,
      translate,
      errorLogMessage: 'Failed to generate pose table report',
      successKey: 'studio.pose-table-report.report-generated-success',
      errorKey: 'studio.pose-table-report.report-generation-failed',
      build: async () => {
        const doc = await this.createDoc();
        const labels = buildReportLabels<PoseTableReportLabels>(translate, PDF_POSE_TABLE_LABEL_KEYS);

        const y = drawPoseTableReportPage1(doc, data, labels);

        // Single portrait page: every temperature on one row, below the context sections
        const rows = buildPoseTableRows(data.results);
        const [table] = buildTables(rows, POSE_TABLE_METRICS, translate, Math.max(rows.length, 1));
        if (table) {
          const labelColWidth = computeLabelColWidth(doc, [table]);
          drawTable(doc, table, drawSectionTitle(doc, labels.resultsTitle, y), PAGE_SIZE.width, labelColWidth);
        }

        drawPageFooters(doc, labels.pageLabel);

        const filename = `${sanitizeFilenamePart(labels.reportTitle)}_${sanitizeFilenamePart(
          data.cantonName
        )}_${sanitizeFilenamePart(data.icName)}_${sanitizeFilenamePart(data.date)}.pdf`;

        return { doc, filename };
      }
    });
  }
}
