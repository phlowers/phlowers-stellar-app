/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { MetricDescriptor } from '@shared/pdf/pdf-table.interfaces';

import { HangingTableReportLabels, HangingTableResultRow } from './hanging-table-report.interfaces';

/** Hanging table metric rows (units are in the labels, so values are drawn bare). */
export const HANGING_TABLE_METRICS: MetricDescriptor<HangingTableResultRow>[] = [
  { labelKey: 'studio.conformity.temperature-label', unit: null, decimals: 0, field: 'temperature' },
  { labelKey: 'studio.hanging-table-report.hanging-parameter-label', unit: '', decimals: 1, field: 'hangingParam' },
  {
    labelKey: 'studio.hanging-table-report.horizontal-tension-label',
    unit: '',
    decimals: 1,
    field: 'horizontalTension'
  }
];

/** Transloco keys for the hanging table report's fixed labels (cartouche labels shared with the canton report). */
export const PDF_HANGING_TABLE_LABEL_KEYS: HangingTableReportLabels = {
  reportTitle: 'studio.hanging-table-report.title',
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

  hangingCalculationTitle: 'studio.hanging-table-report.hanging-calculation-title',
  baseParameter: 'common.base-parameter-label',
  baseTemperature: 'common.base-temperature-label',
  equivalentSpan: 'studio.hanging-table.equivalent-span-label',
  lowestTemperature: 'studio.hanging-table-report.lowest-temperature-label',
  computingStep: 'studio.hanging-table-report.computing-step-label',

  resultsTitle: 'studio.hanging-table-report.results-title'
};
