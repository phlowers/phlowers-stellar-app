/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { SectionReportLabels, SpanReportRow, SupportReportRow } from './section-state-report.interfaces';

/** Landscape A4 page dimensions (mm) used for the result tables. */
export const LANDSCAPE_PAGE = { width: 297, height: 210 } as const;

/** Maximum number of value columns (spans/supports) per table. */
export const MAX_COLS_PER_TABLE = 5;

/** Maximum number of tables stacked vertically on a single landscape page. */
export const MAX_TABLES_PER_PAGE = 2;

/** Height (mm) of a single-line table row. */
export const TABLE_ROW_HEIGHT = 5.5;

/** Horizontal padding (mm) inside a table cell. */
export const TABLE_CELL_PADDING_X = 1.5;

/** Baseline offset (mm) of the text from the top of a table row. */
export const TABLE_TEXT_BASELINE_OFFSET = 3.8;

/** Vertical gap (mm) between two stacked tables on the same page. */
export const TABLE_VERTICAL_GAP = 6;

/** Unit labels reused across metrics. */
export const UNITS = {
  meters: 'm',
  daN: 'daN',
  degrees: '°',
  grad: 'gr',
  percent: '%'
} as const;

/**
 * Descriptor for one metric row of a result table.
 * `unit` is `null` for the (string) identifier row (span/support number).
 * `decimals` is the number of decimal places to render (unused/0 when `unit` is `null`).
 */
export interface MetricDescriptor<T> {
  labelKey: string;
  unit: string | null;
  decimals: number;
  field: keyof T;
}

/**
 * Per-span metric rows (transposed table: one row per metric, one column per span).
 *
 * ponytail: field→output_parameters index mapping assumes each span array is indexed by span
 * position. The engine's `tension_sup`/`tension_inf`/`T_h` are documented "at each support" in
 * types.ts but the US places them in the span table — validate against real engine output.
 */
export const SPAN_METRICS: MetricDescriptor<SpanReportRow>[] = [
  { labelKey: 'studio.section-state-report.span-number', unit: null, decimals: 0, field: 'spanNumber' },
  { labelKey: 'studio.section-state-report.span-length', unit: UNITS.meters, decimals: 2, field: 'spanLength' },
  { labelKey: 'studio.section-state-report.elevation', unit: UNITS.meters, decimals: 2, field: 'elevation' },
  { labelKey: 'studio.section-state-report.parameter', unit: UNITS.meters, decimals: 0, field: 'parameter' },
  {
    labelKey: 'studio.section-state-report.horizontal-tension',
    unit: UNITS.daN,
    decimals: 1,
    field: 'horizontalTension'
  },
  { labelKey: 'studio.section-state-report.tension-sup', unit: UNITS.daN, decimals: 1, field: 'tensionSup' },
  { labelKey: 'studio.section-state-report.tension-inf', unit: UNITS.daN, decimals: 1, field: 'tensionInf' },
  { labelKey: 'studio.section-state-report.sag-f1', unit: UNITS.meters, decimals: 2, field: 'sagF1' },
  { labelKey: 'studio.section-state-report.sag-f2', unit: UNITS.meters, decimals: 2, field: 'sagF2' },
  {
    labelKey: 'studio.section-state-report.horizontal-distance',
    unit: UNITS.meters,
    decimals: 2,
    field: 'horizontalDistance'
  },
  { labelKey: 'studio.section-state-report.natural-length', unit: UNITS.meters, decimals: 2, field: 'naturalLength' },
  { labelKey: 'studio.section-state-report.arc-length', unit: UNITS.meters, decimals: 2, field: 'arcLength' },
  { labelKey: 'studio.section-state-report.slope-left', unit: UNITS.degrees, decimals: 1, field: 'slopeLeft' },
  { labelKey: 'studio.section-state-report.slope-right', unit: UNITS.degrees, decimals: 1, field: 'slopeRight' },
  {
    labelKey: 'studio.section-state-report.utilization-rate',
    unit: UNITS.percent,
    decimals: 1,
    field: 'utilizationRate'
  }
];

/** Per-support metric rows (transposed table: one row per metric, one column per support). */
export const SUPPORT_METRICS: MetricDescriptor<SupportReportRow>[] = [
  { labelKey: 'studio.section-state-report.support-number', unit: null, decimals: 0, field: 'supportNumber' },
  { labelKey: 'studio.section-state-report.v-chain', unit: UNITS.daN, decimals: 1, field: 'vChain' },
  { labelKey: 'studio.section-state-report.h-chain', unit: UNITS.daN, decimals: 1, field: 'hChain' },
  { labelKey: 'studio.section-state-report.l-chain', unit: UNITS.daN, decimals: 1, field: 'lChain' },
  { labelKey: 'studio.section-state-report.r-chain', unit: UNITS.daN, decimals: 1, field: 'rChain' },
  { labelKey: 'studio.section-state-report.line-angle', unit: UNITS.grad, decimals: 1, field: 'lineAngle' },
  { labelKey: 'studio.section-state-report.v-console', unit: UNITS.daN, decimals: 1, field: 'vConsole' },
  { labelKey: 'studio.section-state-report.h-console', unit: UNITS.daN, decimals: 1, field: 'hConsole' },
  { labelKey: 'studio.section-state-report.l-console', unit: UNITS.daN, decimals: 1, field: 'lConsole' },
  { labelKey: 'studio.section-state-report.r-console', unit: UNITS.daN, decimals: 1, field: 'rConsole' },
  { labelKey: 'studio.section-state-report.foot-altitude', unit: UNITS.meters, decimals: 2, field: 'footAltitude' },
  { labelKey: 'studio.section-state-report.displacement-x', unit: UNITS.meters, decimals: 2, field: 'displacementX' },
  { labelKey: 'studio.section-state-report.displacement-y', unit: UNITS.meters, decimals: 2, field: 'displacementY' },
  { labelKey: 'studio.section-state-report.displacement-z', unit: UNITS.meters, decimals: 2, field: 'displacementZ' },
  { labelKey: 'studio.section-state-report.load-angle', unit: UNITS.degrees, decimals: 1, field: 'loadAngle' }
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
