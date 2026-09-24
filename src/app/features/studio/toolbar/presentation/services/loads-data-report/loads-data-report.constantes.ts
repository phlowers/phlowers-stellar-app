/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { PDF_UNITS } from '@shared/pdf/pdf-layout.constantes';
import { MetricDescriptor } from '@shared/pdf/pdf-table.interfaces';

import {
  CableModifReportRow,
  ChainReportFields,
  LoadsReportLabels,
  SpanLoadReportRow,
  SpanManipReportRow,
  SupportManipReportRow
} from './loads-data-report.interfaces';

/** Chain metric rows shared by the support and span manipulation tables. */
const CHAIN_METRICS: MetricDescriptor<ChainReportFields>[] = [
  { labelKey: 'common.chain-name-label', unit: null, decimals: 0, field: 'chainName' },
  {
    labelKey: 'common.chain-length-label',
    unit: PDF_UNITS.meters,
    decimals: 2,
    field: 'chainLength'
  },
  {
    labelKey: 'common.chain-weight-label',
    unit: PDF_UNITS.kilograms,
    decimals: 0,
    field: 'chainWeight'
  },
  {
    labelKey: 'loads.cable-span-manip.chain-surface-label',
    unit: PDF_UNITS.squareMeters,
    decimals: 2,
    field: 'chainSurface'
  },
  {
    labelKey: 'common.counter-weight-label',
    unit: PDF_UNITS.kilograms,
    decimals: 0,
    field: 'counterWeight'
  }
];

/** Loads and markings metric rows (transposed table: one row per metric, one column per load). */
export const LOADS_METRICS: MetricDescriptor<SpanLoadReportRow>[] = [
  { labelKey: 'common.span-label', unit: null, decimals: 0, field: 'spanLabel' },
  { labelKey: 'common.reference-support-label', unit: null, decimals: 0, field: 'referenceSupport' },
  { labelKey: 'loads.load-marking.load-type-label', unit: null, decimals: 0, field: 'type' },
  {
    labelKey: 'studio.loads-table.distance-to-ref-support-label',
    unit: PDF_UNITS.meters,
    decimals: 2,
    field: 'loadPosition'
  },
  { labelKey: 'loads.load-marking.load-label', unit: PDF_UNITS.daN, decimals: 1, field: 'loadWeight' }
];

/** Cable modification metric rows (transposed table: one row per metric, one column per modification). */
export const CABLE_MODIF_METRICS: MetricDescriptor<CableModifReportRow>[] = [
  { labelKey: 'common.span-label', unit: null, decimals: 0, field: 'spanLabel' },
  { labelKey: 'common.reference-support-label', unit: null, decimals: 0, field: 'referenceSupport' },
  { labelKey: 'loads.cable-length-change.cable-length-mod-label', unit: null, decimals: 0, field: 'modificationType' },
  {
    labelKey: 'studio.loads-table.distance-to-ref-support-label',
    unit: PDF_UNITS.meters,
    decimals: 2,
    field: 'distanceSupportRef'
  },
  {
    labelKey: 'studio.loads-report.modified-length-label',
    unit: PDF_UNITS.meters,
    decimals: 2,
    field: 'modifiedLengthCable'
  }
];

/** Support manipulation metric rows (transposed table: one row per metric, one column per manipulation). */
export const SUPPORT_MANIP_METRICS: MetricDescriptor<SupportManipReportRow>[] = [
  { labelKey: 'studio.loads-table.index-label', unit: null, decimals: 0, field: 'displayIndex' },
  { labelKey: 'studio.loads-report.support-label', unit: null, decimals: 0, field: 'supportLabel' },
  { labelKey: 'loads.cable-support-manip.manipulation-type-label', unit: null, decimals: 0, field: 'type' },
  {
    labelKey: 'loads.cable-support-manip.vert-displacement-cable-label',
    unit: PDF_UNITS.meters,
    decimals: 2,
    field: 'vertDisplacement'
  },
  { labelKey: 'loads.cable-span-manip.anchoring-label', unit: null, decimals: 0, field: 'anchoring' },
  {
    labelKey: 'loads.cable-support-manip.lateral-distance-label',
    unit: PDF_UNITS.meters,
    decimals: 2,
    field: 'lateralDistance'
  },
  {
    labelKey: 'loads.cable-support-manip.rope-length-label',
    unit: PDF_UNITS.meters,
    decimals: 2,
    field: 'ropeLength'
  },
  {
    labelKey: 'loads.cable-support-manip.shifting-clamp-length-label',
    unit: PDF_UNITS.meters,
    decimals: 2,
    field: 'shiftingClampLength'
  },
  ...CHAIN_METRICS
];

/** Span manipulation metric rows (transposed table: one row per metric, one column per manipulation). */
export const SPAN_MANIP_METRICS: MetricDescriptor<SpanManipReportRow>[] = [
  { labelKey: 'common.span-label', unit: null, decimals: 0, field: 'spanLabel' },
  { labelKey: 'common.reference-support-label', unit: null, decimals: 0, field: 'referenceSupport' },
  {
    labelKey: 'studio.loads-table.distance-to-ref-support-label',
    unit: PDF_UNITS.meters,
    decimals: 2,
    field: 'distanceToRefSupport'
  },
  { labelKey: 'loads.cable-span-manip.cable-manip-type-label', unit: null, decimals: 0, field: 'cableManipType' },
  {
    labelKey: 'loads.cable-span-manip.cable-manip-method-label',
    unit: null,
    decimals: 0,
    field: 'cableManipMethod'
  },
  {
    labelKey: 'loads.cable-span-manip.longitudinal-distance-label',
    unit: PDF_UNITS.meters,
    decimals: 2,
    field: 'longitudinalDistance'
  },
  {
    labelKey: 'loads.cable-span-manip.lateral-distance-label',
    unit: PDF_UNITS.meters,
    decimals: 2,
    field: 'lateralDistance'
  },
  { labelKey: 'common.altitude-label', unit: PDF_UNITS.meters, decimals: 2, field: 'altitude' },
  { labelKey: 'loads.cable-span-manip.anchoring-label', unit: null, decimals: 0, field: 'anchoring' },
  {
    labelKey: 'loads.cable-span-manip.sling-length-label',
    unit: PDF_UNITS.meters,
    decimals: 2,
    field: 'slingLength'
  },
  ...CHAIN_METRICS
];

/** Transloco translation keys for the loads report's fixed labels. */
export const PDF_LOADS_LABEL_KEYS: LoadsReportLabels = {
  reportTitle: 'studio.loads-report.title',
  cartoucheTitle: 'common.study-and-section-label',
  climateTitle: 'studio.studio-page.climate-condition-label',
  loadsTitle: 'studio.studio-page.load-marking-label',
  cableModifTitle: 'studio.studio-page.cable-length-change-label',
  supportManipTitle: 'studio.studio-page.cable-manip-support-label',
  spanManipTitle: 'studio.studio-page.cable-manip-span-label',
  pageLabel: 'common.page-label',

  author: 'common.author-label',
  study: 'common.study-label',
  studyDescription: 'common.description-label',
  chargeName: 'common.load-name-label',
  chargeDescription: 'common.load-description-label',
  canton: 'common.section-label',
  cantonComment: 'common.comment-label',
  initialCondition: 'common.initial-condition-label',
  personnelPresence: 'common.personnel-presence-label',
  yes: 'common.yes',
  no: 'common.no',

  // Climate bullets — reuse the existing loads.climate.* form labels
  windPressure: 'loads.climate.wind-pressure-label',
  cableTemperature: 'loads.climate.cable-temperature-label',
  iceIndicator: 'common.ice-indicator-label',
  symmetric: 'common.symmetric',
  disSymmetric: 'common.dis-symmetric',
  iceThickness: 'loads.climate.ice-thickness-label',
  frontierSupport: 'loads.climate.frontier-support-label',
  iceThicknessBefore: 'common.ice-thickness-before-support-frontier',
  iceThicknessAfter: 'common.ice-thickness-after-support-frontier'
};
