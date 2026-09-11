/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { PDF_UNITS } from '@shared/pdf/pdf-layout.constantes';
import { MetricDescriptor } from '@shared/pdf/pdf-table.interfaces';

import { SectionReportLabels, SpanReportRow, SupportReportRow } from './section-state-report.interfaces';

/**
 * Per-span metric rows (transposed table: one row per metric, one column per span).
 *
 * ponytail: field→output_parameters index mapping assumes each span array is indexed by span
 * position. The engine's `tension_sup`/`tension_inf`/`T_h` are documented "at each support" in
 * types.ts but the US places them in the span table — validate against real engine output.
 */
export const SPAN_METRICS: MetricDescriptor<SpanReportRow>[] = [
  { labelKey: 'studio.section-state-report.span-number', unit: null, decimals: 0, field: 'spanNumber' },
  { labelKey: 'studio.section-state-report.span-length', unit: PDF_UNITS.meters, decimals: 2, field: 'spanLength' },
  { labelKey: 'studio.section-state-report.elevation', unit: PDF_UNITS.meters, decimals: 2, field: 'elevation' },
  { labelKey: 'studio.section-state-report.parameter', unit: PDF_UNITS.meters, decimals: 0, field: 'parameter' },
  {
    labelKey: 'studio.section-state-report.horizontal-tension',
    unit: PDF_UNITS.daN,
    decimals: 1,
    field: 'horizontalTension'
  },
  { labelKey: 'studio.section-state-report.tension-sup', unit: PDF_UNITS.daN, decimals: 1, field: 'tensionSup' },
  { labelKey: 'studio.section-state-report.tension-inf', unit: PDF_UNITS.daN, decimals: 1, field: 'tensionInf' },
  { labelKey: 'studio.section-state-report.sag-f1', unit: PDF_UNITS.meters, decimals: 2, field: 'sagF1' },
  { labelKey: 'studio.section-state-report.sag-f2', unit: PDF_UNITS.meters, decimals: 2, field: 'sagF2' },
  {
    labelKey: 'studio.section-state-report.horizontal-distance',
    unit: PDF_UNITS.meters,
    decimals: 2,
    field: 'horizontalDistance'
  },
  {
    labelKey: 'studio.section-state-report.natural-length',
    unit: PDF_UNITS.meters,
    decimals: 2,
    field: 'naturalLength'
  },
  { labelKey: 'studio.section-state-report.arc-length', unit: PDF_UNITS.meters, decimals: 2, field: 'arcLength' },
  { labelKey: 'studio.section-state-report.slope-left', unit: PDF_UNITS.degrees, decimals: 1, field: 'slopeLeft' },
  { labelKey: 'studio.section-state-report.slope-right', unit: PDF_UNITS.degrees, decimals: 1, field: 'slopeRight' },
  {
    labelKey: 'studio.section-state-report.utilization-rate',
    unit: PDF_UNITS.percent,
    decimals: 1,
    field: 'utilizationRate'
  }
];

/** Per-support metric rows (transposed table: one row per metric, one column per support). */
export const SUPPORT_METRICS: MetricDescriptor<SupportReportRow>[] = [
  { labelKey: 'studio.section-state-report.support-number', unit: null, decimals: 0, field: 'supportNumber' },
  { labelKey: 'studio.section-state-report.v-chain', unit: PDF_UNITS.daN, decimals: 1, field: 'vChain' },
  { labelKey: 'studio.section-state-report.h-chain', unit: PDF_UNITS.daN, decimals: 1, field: 'hChain' },
  { labelKey: 'studio.section-state-report.l-chain', unit: PDF_UNITS.daN, decimals: 1, field: 'lChain' },
  { labelKey: 'studio.section-state-report.r-chain', unit: PDF_UNITS.daN, decimals: 1, field: 'rChain' },
  { labelKey: 'studio.section-state-report.line-angle', unit: PDF_UNITS.grad, decimals: 1, field: 'lineAngle' },
  { labelKey: 'studio.section-state-report.v-console', unit: PDF_UNITS.daN, decimals: 1, field: 'vConsole' },
  { labelKey: 'studio.section-state-report.h-console', unit: PDF_UNITS.daN, decimals: 1, field: 'hConsole' },
  { labelKey: 'studio.section-state-report.l-console', unit: PDF_UNITS.daN, decimals: 1, field: 'lConsole' },
  { labelKey: 'studio.section-state-report.r-console', unit: PDF_UNITS.daN, decimals: 1, field: 'rConsole' },
  {
    labelKey: 'studio.section-state-report.foot-altitude',
    unit: PDF_UNITS.meters,
    decimals: 2,
    field: 'footAltitude'
  },
  {
    labelKey: 'studio.section-state-report.displacement-x',
    unit: PDF_UNITS.meters,
    decimals: 2,
    field: 'displacementX'
  },
  {
    labelKey: 'studio.section-state-report.displacement-y',
    unit: PDF_UNITS.meters,
    decimals: 2,
    field: 'displacementY'
  },
  {
    labelKey: 'studio.section-state-report.displacement-z',
    unit: PDF_UNITS.meters,
    decimals: 2,
    field: 'displacementZ'
  },
  { labelKey: 'studio.section-state-report.load-angle', unit: PDF_UNITS.degrees, decimals: 1, field: 'loadAngle' }
];

/** Transloco translation keys for the report's fixed labels. */
export const PDF_LABEL_KEYS: SectionReportLabels = {
  reportTitle: 'studio.section-state-report.title',
  cartoucheTitle: 'studio.section-state-report.cartouche-title',
  author: 'studio.section-state-report.author-label',
  study: 'studio.section-state-report.study-label',
  studyDescription: 'studio.section-state-report.description-label',
  section: 'studio.section-state-report.section-label',
  sectionComment: 'studio.section-state-report.comment-label',
  initialCondition: 'studio.section-state-report.initial-condition-label',
  chargeName: 'studio.section-state-report.charge-name-label',
  chargeDescription: 'studio.section-state-report.charge-description-label',
  sectionStateTitle: 'studio.section-state-report.section-state-title',
  maxParameter: 'studio.section-state-report.max-parameter-label',
  maxStressRate: 'studio.section-state-report.max-stress-rate-label',
  spansTitle: 'studio.section-state-report.spans-title',
  supportsTitle: 'studio.section-state-report.supports-title',
  pageLabel: 'studio.section-state-report.page-label'
};
