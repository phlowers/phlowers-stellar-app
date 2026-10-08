/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { PDF_UNITS } from '@shared/pdf/pdf-layout.constantes';
import { MetricDescriptor } from '@shared/pdf/pdf-table.interfaces';

import { CantonReportLabels, CantonSupportRow } from './section-data-report.interfaces';

/**
 * Per-support metric rows for the supports list tables (transposed: one row per metric,
 * one column per support). Mirrors the "Liste des supports" mockup order.
 */
export const SUPPORT_METRICS: MetricDescriptor<CantonSupportRow>[] = [
  { labelKey: 'common.support-no-label', unit: null, decimals: 0, field: 'supportNumber' },
  {
    labelKey: 'studio.section-report.attachment-height',
    unit: PDF_UNITS.meters,
    decimals: 2,
    field: 'attachmentHeight'
  },
  { labelKey: 'common.line-angle-label', unit: PDF_UNITS.grad, decimals: 0, field: 'spanAngle' },
  { labelKey: 'common.chain-name-label', unit: null, decimals: 0, field: 'chainName' },
  { labelKey: 'common.chain-length-label', unit: PDF_UNITS.meters, decimals: 2, field: 'chainLength' },
  { labelKey: 'common.chain-weight-label', unit: PDF_UNITS.kilograms, decimals: 0, field: 'chainWeight' },
  { labelKey: 'common.support-name-full-label', unit: null, decimals: 0, field: 'supportName' },
  { labelKey: 'common.attachment-set-label', unit: null, decimals: 0, field: 'attachmentSet' },
  { labelKey: 'common.arm-length-label', unit: PDF_UNITS.meters, decimals: 2, field: 'armLength' },
  { labelKey: 'studio.section-report.chain-v', unit: null, decimals: 0, field: 'chainV' },
  { labelKey: 'common.counter-weight-label', unit: PDF_UNITS.kilograms, decimals: 0, field: 'counterWeight' },
  {
    labelKey: 'studio.section-report.support-foot-altitude',
    unit: PDF_UNITS.meters,
    decimals: 2,
    field: 'supportFootAltitude'
  },
  { labelKey: 'studio.section-report.attachment-position', unit: null, decimals: 0, field: 'attachmentPosition' },
  { labelKey: 'studio.section-report.tower-model', unit: null, decimals: 0, field: 'towerModel' }
];

/** Transloco translation keys for the report's fixed labels. */
export const PDF_LABEL_KEYS: CantonReportLabels = {
  reportTitle: 'studio.section-report.title',
  studyCantonTitle: 'common.study-and-section-label',
  cantonTitle: 'common.section-label',
  initialConditionTitle: 'common.initial-condition-label',
  supportsTitle: 'studio.section-report.supports-title',
  pageLabel: 'common.page-label',

  author: 'common.author-label',
  study: 'common.study-label',
  studyDescription: 'common.description-label',
  canton: 'common.section-label',
  comment: 'common.comment-label',
  initialCondition: 'common.initial-condition-label',
  chargeName: 'common.load-name-label',
  chargeDescription: 'common.load-description-label',

  type: 'common.section-type-label',
  cableName: 'common.cable-name-label',
  maintenanceCenter: 'studio.section-report.maintenance-center-label',
  lit: 'studio.section-report.lit-label',
  supportsCount: 'studio.section-report.supports-count-label',
  supportsDescription: 'common.description-label',
  phaseNumber: 'common.electric-phase-number-label',
  cablesAmount: 'studio.section-report.cables-amount-label',
  maintenanceTeam: 'common.eel-label',
  branch: 'common.branch-label',

  baseParameter: 'common.base-parameter-label',
  cablePretension: 'common.cable-pretension-label',
  maxWindPressure: 'common.max-wind-pressure-label',
  baseTemperature: 'common.base-temperature-label',
  minTemperature: 'common.min-temperature-label',
  maxFrostWidth: 'studio.section-report.max-frost-width-label'
};
