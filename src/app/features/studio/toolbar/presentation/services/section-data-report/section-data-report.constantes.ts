/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { MetricDescriptor } from '../section-state-report/section-state-report.constantes';
import { CantonReportLabels, CantonSupportRow } from './section-data-report.interfaces';

/** Unit labels used across the canton data report metrics. */
export const CANTON_UNITS = {
  meters: 'm',
  grad: 'gr',
  kilograms: 'kg',
  pascal: 'Pa',
  celsius: '°C',
  cra: '%CRA',
  centimeters: 'cm'
} as const;

/**
 * Per-support metric rows for the supports list tables (transposed: one row per metric,
 * one column per support). Mirrors the "Liste des supports" mockup order.
 */
export const SUPPORT_METRICS: MetricDescriptor<CantonSupportRow>[] = [
  { labelKey: 'studio.canton-report.support-number', unit: null, decimals: 0, field: 'supportNumber' },
  { labelKey: 'studio.canton-report.attachment-height', unit: CANTON_UNITS.meters, decimals: 2, field: 'attachmentHeight' },
  { labelKey: 'studio.canton-report.span-angle', unit: CANTON_UNITS.grad, decimals: 0, field: 'spanAngle' },
  { labelKey: 'studio.canton-report.chain-name', unit: null, decimals: 0, field: 'chainName' },
  { labelKey: 'studio.canton-report.chain-length', unit: CANTON_UNITS.meters, decimals: 2, field: 'chainLength' },
  { labelKey: 'studio.canton-report.chain-weight', unit: CANTON_UNITS.kilograms, decimals: 0, field: 'chainWeight' },
  { labelKey: 'studio.canton-report.support-name', unit: null, decimals: 0, field: 'supportName' },
  { labelKey: 'studio.canton-report.attachment-set', unit: null, decimals: 0, field: 'attachmentSet' },
  { labelKey: 'studio.canton-report.arm-length', unit: CANTON_UNITS.meters, decimals: 2, field: 'armLength' },
  { labelKey: 'studio.canton-report.chain-v', unit: null, decimals: 0, field: 'chainV' },
  { labelKey: 'studio.canton-report.counter-weight', unit: CANTON_UNITS.kilograms, decimals: 0, field: 'counterWeight' },
  {
    labelKey: 'studio.canton-report.support-foot-altitude',
    unit: CANTON_UNITS.meters,
    decimals: 2,
    field: 'supportFootAltitude'
  },
  { labelKey: 'studio.canton-report.attachment-position', unit: null, decimals: 0, field: 'attachmentPosition' },
  { labelKey: 'studio.canton-report.tower-model', unit: null, decimals: 0, field: 'towerModel' }
];

/** Transloco translation keys for the report's fixed labels. */
export const PDF_LABEL_KEYS: CantonReportLabels = {
  reportTitle: 'studio.canton-report.title',
  studyCantonTitle: 'studio.canton-report.study-canton-title',
  cantonTitle: 'studio.canton-report.canton-title',
  initialConditionTitle: 'studio.canton-report.initial-condition-title',
  supportsTitle: 'studio.canton-report.supports-title',
  pageLabel: 'studio.canton-report.page-label',

  author: 'studio.canton-report.author-label',
  study: 'studio.canton-report.study-label',
  studyDescription: 'studio.canton-report.study-description-label',
  canton: 'studio.canton-report.canton-label',
  comment: 'studio.canton-report.comment-label',
  initialCondition: 'studio.canton-report.initial-condition-label',
  chargeName: 'studio.canton-report.charge-name-label',
  chargeDescription: 'studio.canton-report.charge-description-label',

  type: 'studio.canton-report.type-label',
  cableName: 'studio.canton-report.cable-name-label',
  maintenanceCenter: 'studio.canton-report.maintenance-center-label',
  lit: 'studio.canton-report.lit-label',
  supportsCount: 'studio.canton-report.supports-count-label',
  supportsDescription: 'studio.canton-report.supports-description-label',
  phaseNumber: 'studio.canton-report.phase-number-label',
  cablesAmount: 'studio.canton-report.cables-amount-label',
  maintenanceTeam: 'studio.canton-report.maintenance-team-label',
  branch: 'studio.canton-report.branch-label',

  baseParameter: 'studio.canton-report.base-parameter-label',
  cablePretension: 'studio.canton-report.cable-pretension-label',
  maxWindPressure: 'studio.canton-report.max-wind-pressure-label',
  baseTemperature: 'studio.canton-report.base-temperature-label',
  minTemperature: 'studio.canton-report.min-temperature-label',
  maxFrostWidth: 'studio.canton-report.max-frost-width-label'
};
