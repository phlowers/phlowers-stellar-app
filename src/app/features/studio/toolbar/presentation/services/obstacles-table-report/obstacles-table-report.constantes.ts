/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { ObstacleTableRow } from '@features/studio/toolbar/presentation/components/obstacles-table/obstacles-table.interfaces';
import { PDF_UNITS } from '@shared/pdf/pdf-layout.constantes';
import { MetricDescriptor } from '@shared/pdf/pdf-table.interfaces';

import { ObstaclesTableReportLabels } from './obstacles-table-report.interfaces';

// Obstacle point metric rows (transposed table: one row per metric, one column per obstacle point)
export const OBSTACLES_TABLE_METRICS: MetricDescriptor<ObstacleTableRow>[] = [
  { labelKey: 'studio.obstacles-table.obstacle-name-column-label', unit: null, decimals: 0, field: 'obstacleName' },
  { labelKey: 'studio.obstacles-table.obstacle-type-column-label', unit: null, decimals: 0, field: 'obstacleType' },
  { labelKey: 'common.span-label', unit: null, decimals: 0, field: 'spanLabel' },
  { labelKey: 'common.reference-support-label', unit: null, decimals: 0, field: 'referenceSupportLabel' },
  {
    labelKey: 'studio.obstacles-table.altitude-type-column-label',
    unit: null,
    decimals: 0,
    field: 'altitudeTypeLabel'
  },
  {
    labelKey: 'studio.shared.lateral-distance-type-label',
    unit: null,
    decimals: 0,
    field: 'lateralDistanceTypeLabel'
  },
  { labelKey: 'studio.obstacles-table.point-column-label', unit: '', decimals: 0, field: 'pointNumber' },
  {
    labelKey: 'studio.obstacles-table.altitude-column-label',
    unit: PDF_UNITS.meters,
    decimals: 2,
    field: 'altitude'
  },
  {
    labelKey: 'studio.obstacles-table.ref-support-distance-column-label',
    unit: PDF_UNITS.meters,
    decimals: 2,
    field: 'distanceToRefSupport'
  },
  {
    labelKey: 'studio.obstacles-table.line-axis-distance-column-label',
    unit: PDF_UNITS.meters,
    decimals: 2,
    field: 'distanceToLineAxis'
  },
  { labelKey: 'studio.shared.oblique', unit: PDF_UNITS.meters, decimals: 2, field: 'oblique' },
  { labelKey: 'studio.shared.vertical', unit: PDF_UNITS.meters, decimals: 2, field: 'vertical' },
  { labelKey: 'studio.shared.horizontal', unit: PDF_UNITS.meters, decimals: 2, field: 'horizontal' }
];

// Vertical gap (mm) between the two tables stacked on a page. The compact header of the landscape pages leaves
// room for more than the default gap while keeping two 5-point tables per page
export const OBSTACLES_TABLES_VERTICAL_GAP = 12;

// Transloco keys for the obstacles table report's fixed labels (cartouche labels shared with the canton reports)
export const PDF_OBSTACLES_TABLE_LABEL_KEYS: ObstaclesTableReportLabels = {
  reportTitle: 'studio.obstacles-report.title',
  pageLabel: 'common.page-label',

  cartoucheTitle: 'common.study-and-section-label',
  author: 'common.author-label',
  study: 'common.study-label',
  studyDescription: 'common.description-label',
  canton: 'common.section-label',
  cantonComment: 'common.comment-label',
  initialCondition: 'common.initial-condition-label',
  chargeName: 'common.load-name-label',
  chargeDescription: 'common.load-description-label',

  obstaclesTitle: 'studio.obstacles-report.obstacles-title'
};
