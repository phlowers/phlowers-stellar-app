/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { ObstacleTableRow } from '@features/studio/toolbar/presentation/components/obstacles-table/obstacles-table.interfaces';
import { BaseReportLabels } from '@shared/pdf/pdf-report.interfaces';

// Data required to generate the obstacles table PDF report
export interface ObstaclesTableReportData {
  // Report generation date (localized string, used for the header and the filename)
  date: string;
  // Report generation time as HH:mm (used for the filename)
  time: string;

  // Study & canton cartouche
  author: string;
  studyTitle: string;
  studyDescription: string;
  cantonName: string;
  cantonComment: string;
  icName: string;
  chargeName: string;
  chargeDescription: string;

  // Obstacle points of the table, in the order displayed (selected span, or every span of the canton),
  // one column of the result tables each
  rows: ObstacleTableRow[];
}

// Translated obstacles table report labels, resolved at report-generation time via TranslocoService
export interface ObstaclesTableReportLabels extends BaseReportLabels {
  cartoucheTitle: string;
  canton: string;
  cantonComment: string;
  initialCondition: string;

  obstaclesTitle: string;
}
