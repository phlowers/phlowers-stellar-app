/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { CantonReportLabels, SpanReportRow, SupportReportRow } from './canton-state-report.interfaces';

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
  grad: 'grad',
  percent: '%'
} as const;

/**
 * Descriptor for one metric row of a result table.
 * `unit` is `null` for the (string) identifier row (span/support number).
 */
export interface MetricDescriptor<T> {
  labelKey: string;
  unit: string | null;
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
  { labelKey: 'studio.canton-state-report.span-number', unit: null, field: 'spanNumber' },
  { labelKey: 'studio.canton-state-report.span-length', unit: UNITS.meters, field: 'spanLength' },
  { labelKey: 'studio.canton-state-report.elevation', unit: UNITS.meters, field: 'elevation' },
  { labelKey: 'studio.canton-state-report.parameter', unit: UNITS.meters, field: 'parameter' },
  { labelKey: 'studio.canton-state-report.horizontal-tension', unit: UNITS.daN, field: 'horizontalTension' },
  { labelKey: 'studio.canton-state-report.tension-sup', unit: UNITS.daN, field: 'tensionSup' },
  { labelKey: 'studio.canton-state-report.tension-inf', unit: UNITS.daN, field: 'tensionInf' },
  { labelKey: 'studio.canton-state-report.sag-f1', unit: UNITS.meters, field: 'sagF1' },
  { labelKey: 'studio.canton-state-report.sag-f2', unit: UNITS.meters, field: 'sagF2' },
  { labelKey: 'studio.canton-state-report.horizontal-distance', unit: UNITS.meters, field: 'horizontalDistance' },
  { labelKey: 'studio.canton-state-report.natural-length', unit: UNITS.meters, field: 'naturalLength' },
  { labelKey: 'studio.canton-state-report.arc-length', unit: UNITS.meters, field: 'arcLength' },
  { labelKey: 'studio.canton-state-report.slope-left', unit: UNITS.degrees, field: 'slopeLeft' },
  { labelKey: 'studio.canton-state-report.slope-right', unit: UNITS.degrees, field: 'slopeRight' },
  { labelKey: 'studio.canton-state-report.utilization-rate', unit: UNITS.percent, field: 'utilizationRate' }
];

/** Per-support metric rows (transposed table: one row per metric, one column per support). */
export const SUPPORT_METRICS: MetricDescriptor<SupportReportRow>[] = [
  { labelKey: 'studio.canton-state-report.support-number', unit: null, field: 'supportNumber' },
  { labelKey: 'studio.canton-state-report.v-chain', unit: UNITS.daN, field: 'vChain' },
  { labelKey: 'studio.canton-state-report.h-chain', unit: UNITS.daN, field: 'hChain' },
  { labelKey: 'studio.canton-state-report.l-chain', unit: UNITS.daN, field: 'lChain' },
  { labelKey: 'studio.canton-state-report.r-chain', unit: UNITS.daN, field: 'rChain' },
  { labelKey: 'studio.canton-state-report.line-angle', unit: UNITS.grad, field: 'lineAngle' },
  { labelKey: 'studio.canton-state-report.v-console', unit: UNITS.daN, field: 'vConsole' },
  { labelKey: 'studio.canton-state-report.h-console', unit: UNITS.daN, field: 'hConsole' },
  { labelKey: 'studio.canton-state-report.l-console', unit: UNITS.daN, field: 'lConsole' },
  { labelKey: 'studio.canton-state-report.r-console', unit: UNITS.daN, field: 'rConsole' },
  { labelKey: 'studio.canton-state-report.foot-altitude', unit: UNITS.meters, field: 'footAltitude' },
  { labelKey: 'studio.canton-state-report.displacement-x', unit: UNITS.meters, field: 'displacementX' },
  { labelKey: 'studio.canton-state-report.displacement-y', unit: UNITS.meters, field: 'displacementY' },
  { labelKey: 'studio.canton-state-report.displacement-z', unit: UNITS.meters, field: 'displacementZ' },
  { labelKey: 'studio.canton-state-report.load-angle', unit: UNITS.degrees, field: 'loadAngle' }
];

/** Transloco translation keys for the report's fixed labels. */
export const PDF_LABEL_KEYS: CantonReportLabels = {
  reportTitle: 'studio.canton-state-report.title',
  cartoucheTitle: 'studio.canton-state-report.cartouche-title',
  author: 'studio.canton-state-report.author-label',
  study: 'studio.canton-state-report.study-label',
  studyDescription: 'studio.canton-state-report.description-label',
  canton: 'studio.canton-state-report.canton-label',
  cantonComment: 'studio.canton-state-report.comment-label',
  initialCondition: 'studio.canton-state-report.initial-condition-label',
  chargeName: 'studio.canton-state-report.charge-name-label',
  chargeDescription: 'studio.canton-state-report.charge-description-label',
  cantonStateTitle: 'studio.canton-state-report.canton-state-title',
  maxParameter: 'studio.canton-state-report.max-parameter-label',
  maxStressRate: 'studio.canton-state-report.max-stress-rate-label',
  spansTitle: 'studio.canton-state-report.spans-title',
  supportsTitle: 'studio.canton-state-report.supports-title',
  pageLabel: 'studio.canton-state-report.page-label'
};
