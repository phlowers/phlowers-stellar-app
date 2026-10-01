/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { MetricDescriptor } from '@shared/pdf/pdf-table.interfaces';

import { PoseTableReportLabels, PoseTableResultRow } from './pose-table-report.interfaces';

/** Pose table metric rows (units are in the labels, so values are drawn bare). */
export const POSE_TABLE_METRICS: MetricDescriptor<PoseTableResultRow>[] = [
  { labelKey: 'studio.conformity.temperature-label', unit: null, decimals: 0, field: 'temperature' },
  { labelKey: 'studio.pose-table-report.pose-parameter-label', unit: '', decimals: 1, field: 'poseParam' },
  { labelKey: 'studio.pose-table-report.horizontal-tension-label', unit: '', decimals: 1, field: 'horizontalTension' }
];

/** Transloco keys for the pose table report's fixed labels (cartouche labels shared with the canton report). */
export const PDF_POSE_TABLE_LABEL_KEYS: PoseTableReportLabels = {
  reportTitle: 'studio.pose-table-report.title',
  pageLabel: 'studio.pose-table-report.page-label',

  cartoucheTitle: 'studio.canton-report.study-canton-title',
  author: 'studio.canton-report.author-label',
  study: 'studio.canton-report.study-label',
  studyDescription: 'studio.canton-report.study-description-label',
  canton: 'studio.canton-report.canton-label',
  cantonComment: 'studio.canton-report.comment-label',
  initialCondition: 'studio.canton-report.initial-condition-label',
  chargeName: 'studio.canton-report.charge-name-label',
  chargeDescription: 'shared.new-charge-modal.description-label',

  poseCalculationTitle: 'studio.pose-table-report.pose-calculation-title',
  baseParameter: 'shared.initial-condition-modal.base-parameter',
  baseTemperature: 'shared.initial-condition-modal.base-temperature',
  equivalentSpan: 'studio.pose-table.equivalent-span-label',
  lowestTemperature: 'studio.pose-table-report.lowest-temperature-label',
  computingStep: 'studio.pose-table-report.computing-step-label',

  resultsTitle: 'studio.pose-table-report.results-title'
};
