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
  drawStudyCartoucheSection,
  generatePdfReport
} from '@shared/pdf/pdf-primitives.helpers';

import { PDF_LABEL_KEYS } from './field-measure-report.constantes';
import { buildFieldMeasureReportFilename, drawFieldMeasureSection } from './field-measure-report.helpers';
import { FieldMeasureReportData, FieldMeasureReportLabels } from './field-measure-report.interfaces';

/** Service responsible for generating the field measure PDF report. */
@Injectable({ providedIn: 'root' })
export class FieldMeasureReportService extends PdfBaseService {
  private readonly notificationService = inject(NotificationService);
  private readonly translocoService = inject(TranslocoService);

  /** Generates and downloads the field measure PDF report. */
  async generateReport(data: FieldMeasureReportData): Promise<void> {
    const translate = (key: string): string => this.translocoService.translate(key);

    await generatePdfReport({
      logger: this.logger,
      notificationService: this.notificationService,
      translate,
      errorLogMessage: 'Failed to generate field measure report',
      successKey: 'common.report-generated-successfully-label',
      errorKey: 'common.failed-to-generate-report',
      build: async () => {
        const doc = await this.createDoc();
        const labels = buildReportLabels<FieldMeasureReportLabels>(translate, PDF_LABEL_KEYS);

        let y = drawHeader(doc, data.date, labels.reportTitle);
        y = drawStudyCartoucheSection(doc, labels.studyCantonTitle, labels, data.cartouche, y);
        for (const section of data.sections) {
          y = drawFieldMeasureSection(doc, section, y);
        }
        drawPageFooters(doc, labels.pageLabel);

        return { doc, filename: buildFieldMeasureReportFilename(labels.reportTitle, data) };
      }
    });
  }
}
