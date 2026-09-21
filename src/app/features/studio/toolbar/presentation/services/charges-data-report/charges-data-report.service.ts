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

import { PDF_CHARGES_LABEL_KEYS } from './charges-data-report.constantes';
import { drawChargesReportPage1 } from './charges-data-report.helpers';
import { ChargesReportData, ChargesReportLabels } from './charges-data-report.interfaces';

/**
 * Service responsible for generating the charges table PDF report.
 *
 * @remarks
 * Generates a PDF report displaying all load cases, climate conditions, and
 * associated manipulations for a given study section.
 *
 * @example
 * ```typescript
 * await this.chargesReportService.generateReport({
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
export class ChargesReportService extends PdfBaseService {
  private readonly notificationService = inject(NotificationService);
  private readonly translocoService = inject(TranslocoService);

  /**
   * Generates and downloads the charges table PDF report.
   *
   * @param data — Structured data for the charges report
   * @returns Promise that resolves when the report has been generated and offered for download
   */
  async generateReport(data: ChargesReportData): Promise<void> {
    const translate = (key: string): string => this.translocoService.translate(key);

    await generatePdfReport({
      logger: this.logger,
      notificationService: this.notificationService,
      translate,
      errorLogMessage: 'Failed to generate charges table report',
      successKey: 'studio.charges-report.report-generated-success',
      errorKey: 'studio.charges-report.report-generation-failed',
      build: async () => {
        const doc = await this.createDoc();
        const labels = buildReportLabels<ChargesReportLabels>(translate, PDF_CHARGES_LABEL_KEYS);

        // Page 1 — portrait: header, charge case, climate, loads, manipulations
        drawChargesReportPage1(doc, data, labels);

        drawPageFooters(doc, labels.pageLabel, true);

        const filename = `${sanitizeFilenamePart(labels.reportTitle)}_${sanitizeFilenamePart(
          data.chargeName
        )}_${sanitizeFilenamePart(data.date)}.pdf`;

        return { doc, filename };
      }
    });
  }
}
