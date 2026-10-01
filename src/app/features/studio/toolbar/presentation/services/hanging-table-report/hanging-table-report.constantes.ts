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
  pageLabel: 'studio.hanging-table-report.page-label',

  cartoucheTitle: 'studio.canton-report.study-canton-title',
  author: 'studio.canton-report.author-label',
  study: 'studio.canton-report.study-label',
  studyDescription: 'studio.canton-report.study-description-label',
  canton: 'studio.canton-report.canton-label',
  cantonComment: 'studio.canton-report.comment-label',
  initialCondition: 'studio.canton-report.initial-condition-label',
  chargeName: 'studio.canton-report.charge-name-label',
  chargeDescription: 'shared.new-charge-modal.description-label',

  hangingCalculationTitle: 'studio.hanging-table-report.hanging-calculation-title',
  baseParameter: 'shared.initial-condition-modal.base-parameter',
  baseTemperature: 'shared.initial-condition-modal.base-temperature',
  equivalentSpan: 'studio.hanging-table.equivalent-span-label',
  lowestTemperature: 'studio.hanging-table-report.lowest-temperature-label',
  computingStep: 'studio.hanging-table-report.computing-step-label',

  resultsTitle: 'studio.hanging-table-report.results-title'
};
