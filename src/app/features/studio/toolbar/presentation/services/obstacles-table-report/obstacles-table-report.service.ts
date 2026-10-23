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
import { buildReportLabels, drawPageFooters, generatePdfReport } from '@shared/pdf/pdf-primitives.helpers';
import { buildTables, computeLabelColWidth, drawResultTablesFlow } from '@shared/pdf/pdf-table.helpers';

import {
  OBSTACLES_TABLE_METRICS,
  OBSTACLES_TABLES_VERTICAL_GAP,
  PDF_OBSTACLES_TABLE_LABEL_KEYS
} from './obstacles-table-report.constantes';
import { buildObstaclesReportFilename, drawObstaclesReportPage1 } from './obstacles-table-report.helpers';
import { ObstaclesTableReportData, ObstaclesTableReportLabels } from './obstacles-table-report.interfaces';

// Service responsible for generating the obstacles table PDF report
@Injectable({ providedIn: 'root' })
export class ObstaclesTableReportService extends PdfBaseService {
  private readonly notificationService = inject(NotificationService);
  private readonly translocoService = inject(TranslocoService);

  // Generates and downloads the obstacles table PDF report
  async generateReport(data: ObstaclesTableReportData): Promise<void> {
    const translate = (key: string): string => this.translocoService.translate(key);

    await generatePdfReport({
      logger: this.logger,
      notificationService: this.notificationService,
      translate,
      errorLogMessage: 'Failed to generate obstacles table report',
      successKey: 'common.report-generated-successfully-label',
      errorKey: 'common.failed-to-generate-report',
      build: async () => {
        const doc = await this.createDoc();
        const labels = buildReportLabels<ObstaclesTableReportLabels>(translate, PDF_OBSTACLES_TABLE_LABEL_KEYS);

        // Page 1 — portrait: header and study & canton cartouche
        drawObstaclesReportPage1(doc, data, labels);

        // Following pages — landscape: the obstacle points, at most 5 per table, under a compact header
        const tables = buildTables(data.rows, OBSTACLES_TABLE_METRICS, translate);
        const labelColWidth = computeLabelColWidth(doc, tables);

        drawResultTablesFlow(
          doc,
          data.date || '-',
          labels.reportTitle,
          [{ title: labels.obstaclesTitle, tables }],
          labelColWidth,
          { compactHeader: true, tableGap: OBSTACLES_TABLES_VERTICAL_GAP }
        );

        drawPageFooters(doc, labels.pageLabel, true);

        return { doc, filename: buildObstaclesReportFilename(labels.reportTitle, data) };
      }
    });
  }
}
