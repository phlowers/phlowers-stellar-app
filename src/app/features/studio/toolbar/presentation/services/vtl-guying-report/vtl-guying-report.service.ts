/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { inject, Injectable } from '@angular/core';
import jsPDF from 'jspdf';

import { LoggerService } from '@core/services/logger/logger.service';
import { NotificationService } from '@core/services/notification/notification.service';

import { VtlGuyingReportData } from './vtl-guying-report.interfaces';
import {
  drawFooter,
  drawGuyingSection,
  drawHeader,
  drawStudySection,
  drawVtlWithGuyingSection,
  drawVtlWithoutGuyingSection,
  loadImageAsBase64
} from './vtl-guying-report.helpers';

/** Service responsible for generating the VHL & Guying PDF report. */
@Injectable({ providedIn: 'root' })
export class VtlGuyingReportService {
  private readonly logger = inject(LoggerService);
  private readonly notificationService = inject(NotificationService);

  private diagramImageCache: string | null = null;

  /** Pre-loads the diagram image and caches it for future report generation. */
  async preloadDiagramImage(): Promise<void> {
    if (this.diagramImageCache) {
      return;
    }
    try {
      this.diagramImageCache = await loadImageAsBase64('img/guying-help.png');
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

  /** Generates and downloads the VHL & Guying PDF report. */
  generateReport(data: VtlGuyingReportData): void {
    try {
      const doc = new jsPDF('p', 'mm', 'a4');

      let y = drawHeader(doc);
      y = drawStudySection(doc, data, y);
      y = drawVtlWithoutGuyingSection(doc, data, y);
      y = drawGuyingSection(doc, data, y);
      drawVtlWithGuyingSection(doc, data, y);
      drawFooter(doc);

      const filename = `rapport-vhl-haubanage-${data.date}.pdf`;
      doc.save(filename);

      this.notificationService.success($localize`Report generated successfully`);
    } catch (error) {
      this.logger.error('Failed to generate VHL & Guying report', error);
      this.notificationService.error($localize`Failed to generate report`);
    }
  }
}
