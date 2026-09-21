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
import {
  buildReportLabels,
  drawPageFooters,
  generatePdfReport,
  sanitizeFilenamePart
} from '@shared/pdf/pdf-primitives.helpers';
import { buildTables, computeLabelColWidth, drawResultTablesFlow } from '@shared/pdf/pdf-table.helpers';
import { PdfResultSection, PdfTableModel } from '@shared/pdf/pdf-table.interfaces';

import { CABLE_MODIF_METRICS, LOADS_METRICS, PDF_LOADS_LABEL_KEYS, SPAN_MANIP_METRICS, SUPPORT_MANIP_METRICS } from './loads-data-report.constantes';
import { drawLoadsReportPage1 } from './loads-data-report.helpers';
import { LoadsReportData, LoadsReportLabels } from './loads-data-report.interfaces';

/**
 * Service responsible for generating the loads table PDF report.
 *
 * @remarks
 * Generates a PDF report displaying all load cases, climate conditions, and
 * associated manipulations for a given study section.
 *
 * @example
 * ```typescript
 * await this.loadsReportService.generateReport({
 *   date: new Date().toLocaleString(),
 *   chargeName: 'Load Case 1',
 *   chargeDescription: 'Test case',
 *   personnelPresence: true,
 *   climate: { ... },
 *   spanLoads: [ ... ],
 *   cableModifications: [ ... ],
 *   supportManipulations: [ ... ],
 *   spanManipulations: [ ... ]
 * });
 * ```
 *
 * @category Services
 */
@Injectable({ providedIn: 'root' })
export class LoadsReportService extends PdfBaseService {
  private readonly notificationService = inject(NotificationService);
  private readonly translocoService = inject(TranslocoService);

  /**
   * Generates and downloads the loads table PDF report.
   *
   * @param data — Structured data for the loads report
   * @returns Promise that resolves when the report has been generated and offered for download
   */
  async generateReport(data: LoadsReportData): Promise<void> {
    const translate = (key: string): string => this.translocoService.translate(key);

    await generatePdfReport({
      logger: this.logger,
      notificationService: this.notificationService,
      translate,
      errorLogMessage: 'Failed to generate loads table report',
      successKey: 'studio.loads-report.report-generated-success',
      errorKey: 'studio.loads-report.report-generation-failed',
      build: async () => {
        const doc = await this.createDoc();
        const labels = buildReportLabels<LoadsReportLabels>(translate, PDF_LOADS_LABEL_KEYS);
        const date = data.date || '-';

        // Page 1 — portrait: header, study & canton cartouche, climate + personnel presence
        drawLoadsReportPage1(doc, data, labels);

        // Following pages — landscape: one result table section per non-empty data set,
        // sharing one label column width across all of them
        const loadsTables = buildTables(data.spanLoads, LOADS_METRICS, translate);
        const cableModifTables = buildTables(data.cableModifications, CABLE_MODIF_METRICS, translate);
        const supportManipTables = buildTables(data.supportManipulations, SUPPORT_MANIP_METRICS, translate);
        const spanManipTables = buildTables(data.spanManipulations, SPAN_MANIP_METRICS, translate);

        const allTables: PdfTableModel[] = [
          ...loadsTables,
          ...cableModifTables,
          ...supportManipTables,
          ...spanManipTables
        ];
        const labelColWidth = computeLabelColWidth(doc, allTables);

        const sections: PdfResultSection[] = [
          { title: labels.loadsTitle, tables: loadsTables },
          { title: labels.cableModifTitle, tables: cableModifTables },
          { title: labels.supportManipTitle, tables: supportManipTables },
          { title: labels.spanManipTitle, tables: spanManipTables }
        ].filter((section) => section.tables.length > 0);

        drawResultTablesFlow(doc, date, labels.reportTitle, sections, labelColWidth);

        drawPageFooters(doc, labels.pageLabel, true);

        const filename = `${sanitizeFilenamePart(labels.reportTitle)}_${sanitizeFilenamePart(
          data.cantonName
        )}_${sanitizeFilenamePart(data.chargeName)}_${sanitizeFilenamePart(data.date)}.pdf`;

        return { doc, filename };
      }
    });
  }
}

