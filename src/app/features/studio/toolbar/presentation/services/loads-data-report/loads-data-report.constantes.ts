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
  LoadsReportLabels,
  SpanLoadReportRow,
  SpanManipReportRow,
  SupportManipReportRow
} from './loads-data-report.interfaces';

/** Loads and markings metric rows (transposed table: one row per metric, one column per load). */
export const LOADS_METRICS: MetricDescriptor<SpanLoadReportRow>[] = [
  { labelKey: 'loads.shared.span-label', unit: null, decimals: 0, field: 'spanLabel' },
  { labelKey: 'loads.shared.reference-support-label', unit: null, decimals: 0, field: 'referenceSupport' },
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
  { labelKey: 'loads.shared.span-label', unit: null, decimals: 0, field: 'spanLabel' },
  { labelKey: 'loads.shared.reference-support-label', unit: null, decimals: 0, field: 'referenceSupport' },
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
  { labelKey: 'loads.cable-span-manip.chain-name-label', unit: null, decimals: 0, field: 'chainName' },
  {
    labelKey: 'loads.cable-span-manip.chain-length-label',
    unit: PDF_UNITS.meters,
    decimals: 2,
    field: 'chainLength'
  },
  {
    labelKey: 'loads.cable-span-manip.chain-weight-label',
    unit: PDF_UNITS.kilograms,
    decimals: 0,
    field: 'chainWeight'
  },
  {
    labelKey: 'loads.cable-span-manip.chain-surface-label',
    unit: 'm\u00B2',
    decimals: 2,
    field: 'chainSurface'
  },
  {
    labelKey: 'loads.cable-span-manip.counter-weight-label',
    unit: PDF_UNITS.kilograms,
    decimals: 0,
    field: 'counterWeight'
  }
];

/** Span manipulation metric rows (transposed table: one row per metric, one column per manipulation). */
export const SPAN_MANIP_METRICS: MetricDescriptor<SpanManipReportRow>[] = [
  { labelKey: 'loads.shared.span-label', unit: null, decimals: 0, field: 'spanLabel' },
  { labelKey: 'loads.shared.reference-support-label', unit: null, decimals: 0, field: 'referenceSupport' },
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
  { labelKey: 'loads.cable-span-manip.altitude-label', unit: PDF_UNITS.meters, decimals: 2, field: 'altitude' },
  { labelKey: 'loads.cable-span-manip.anchoring-label', unit: null, decimals: 0, field: 'anchoring' },
  {
    labelKey: 'loads.cable-span-manip.sling-length-label',
    unit: PDF_UNITS.meters,
    decimals: 2,
    field: 'slingLength'
  },
  { labelKey: 'loads.cable-span-manip.chain-name-label', unit: null, decimals: 0, field: 'chainName' },
  {
    labelKey: 'loads.cable-span-manip.chain-length-label',
    unit: PDF_UNITS.meters,
    decimals: 2,
    field: 'chainLength'
  },
  {
    labelKey: 'loads.cable-span-manip.chain-weight-label',
    unit: PDF_UNITS.kilograms,
    decimals: 0,
    field: 'chainWeight'
  },
  {
    labelKey: 'loads.cable-span-manip.chain-surface-label',
    unit: 'm\u00B2',
    decimals: 2,
    field: 'chainSurface'
  },
  {
    labelKey: 'loads.cable-span-manip.counter-weight-label',
    unit: PDF_UNITS.kilograms,
    decimals: 0,
    field: 'counterWeight'
  }
];

/** Transloco translation keys for the loads report's fixed labels. */
export const PDF_LOADS_LABEL_KEYS: LoadsReportLabels = {
  reportTitle: 'studio.loads-report.title',
  cartoucheTitle: 'studio.loads-report.cartouche-title',
  climateTitle: 'studio.loads-report.climate-title',
  loadsTitle: 'studio.loads-report.loads-title',
  cableModifTitle: 'studio.loads-report.cable-modif-title',
  supportManipTitle: 'studio.loads-report.support-manip-title',
  spanManipTitle: 'studio.loads-report.span-manip-title',
  pageLabel: 'studio.loads-report.page-label',

  author: 'studio.loads-report.author-label',
  study: 'studio.loads-report.study-label',
  studyDescription: 'studio.loads-report.study-description-label',
  chargeName: 'studio.loads-report.charge-name-label',
  chargeDescription: 'studio.loads-report.charge-description-label',
  canton: 'studio.loads-report.canton-label',
  cantonComment: 'studio.loads-report.canton-comment-label',
  initialCondition: 'studio.loads-report.initial-condition-label',
  personnelPresence: 'studio.loads-report.personnel-presence-label',
  yes: 'common.yes',
  no: 'common.no',

  // Climate bullets — reuse the existing loads.climate.* form labels
  windPressure: 'loads.climate.wind-pressure-label',
  cableTemperature: 'loads.climate.cable-temperature-label',
  iceIndicator: 'loads.climate.ice-indicator-label',
  symmetric: 'studio.loads-table.symmetric-label',
  disSymmetric: 'studio.loads-table.dis-symmetric-label',
  iceThickness: 'loads.climate.ice-thickness-label',
  frontierSupport: 'loads.climate.frontier-support-label',
  iceThicknessBefore: 'loads.climate.ice-thickness-before-label',
  iceThicknessAfter: 'loads.climate.ice-thickness-after-label',

  // Shared column headers — reuse existing loads.* labels
  span: 'loads.shared.span-label',
  referenceSupport: 'loads.shared.reference-support-label',
  distanceToRefSupport: 'studio.loads-table.distance-to-ref-support-label',
  lateralDistance: 'loads.cable-span-manip.lateral-distance-label',
  anchoring: 'loads.cable-span-manip.anchoring-label',
  chainName: 'loads.cable-span-manip.chain-name-label',
  chainLength: 'loads.cable-span-manip.chain-length-label',
  chainWeight: 'loads.cable-span-manip.chain-weight-label',
  chainSurface: 'loads.cable-span-manip.chain-surface-label',
  counterWeight: 'loads.cable-span-manip.counter-weight-label',

  // Loads and markings table
  loadType: 'loads.load-marking.load-type-label',
  loadValue: 'loads.load-marking.load-label',

  // Cable length modifications table
  modificationType: 'studio.loads-table.modification-type-label',
  modifiedLength: 'studio.loads-report.modified-length-label',

  // Support manipulations table
  index: 'studio.loads-table.index-label',
  support: 'studio.loads-report.support-label',
  manipType: 'loads.cable-support-manip.manipulation-type-label',
  shiftingClampLength: 'loads.cable-support-manip.shifting-clamp-length-label',
  vertDisplacement: 'loads.cable-support-manip.vert-displacement-cable-label',
  ropeLength: 'loads.cable-support-manip.rope-length-label',

  // Span manipulations table
  cableManipType: 'loads.cable-span-manip.cable-manip-type-label',
  cableManipMethod: 'loads.cable-span-manip.cable-manip-method-label',
  longitudinalDistance: 'loads.cable-span-manip.longitudinal-distance-label',
  altitude: 'loads.cable-span-manip.altitude-label',
  slingLength: 'loads.cable-span-manip.sling-length-label'
};

