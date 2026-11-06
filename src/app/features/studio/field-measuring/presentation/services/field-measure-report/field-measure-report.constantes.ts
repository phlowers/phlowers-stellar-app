/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { FieldMeasure } from '@features/studio/field-measuring/domain/types';

import { FieldMeasureReportLabels, TangentAimingReportConfig } from './field-measure-report.interfaces';

/** Transloco translation keys for the report's fixed labels. */
export const PDF_LABEL_KEYS: FieldMeasureReportLabels = {
  reportTitle: 'field-measuring.report.title',
  studyCantonTitle: 'common.study-and-section-label',
  pageLabel: 'common.page-label',
  author: 'common.author-label',
  study: 'common.study-label',
  studyDescription: 'common.description-label',
  canton: 'common.section-label',
  comment: 'common.comment-label',
  initialCondition: 'common.initial-condition-label',
  chargeName: 'common.load-name-label',
  chargeDescription: 'common.load-description-label'
};

/** Transloco keys of the paragraph titles, one per tab of the field measuring form. */
export const SECTION_TITLE_KEYS = {
  terrainData: 'field-measuring.report.terrain-data-title',
  parameterCalculation: 'field-measuring.tabs.parameter-calculation',
  temperatureCalculation: 'field-measuring.tabs.temperature-calculation',
  parameter15C: 'field-measuring.tabs.parameter-15c'
} as const;

/** Transloco keys of the data labels. Existing form keys are reused; `field-measuring.report.*` fills the gaps. */
export const LABEL_KEYS = {
  measureName: 'field-measuring.field-datas.name-label',
  measureDate: 'field-measuring.report.measure-date',
  measureTime: 'field-measuring.report.measure-time',
  ambientTemperature: 'field-measuring.field-datas.ambient-temperature-label',
  windSpeed: 'field-measuring.shared.wind-speed-label',
  windDirection: 'field-measuring.shared.wind-direction-label',
  skyCover: 'field-measuring.shared.sky-cover-label',
  link: 'common.link-label',
  cableName: 'common.cable-name-label',
  voltage: 'field-measuring.header.voltage-label',
  cablesNumber: 'common.cable-amount-label',
  sectionType: 'common.section-type-label',
  phaseNumber: 'field-measuring.header.phase-number-label',
  span: 'common.span-label',
  longitude: 'common.longitude-label',
  latitude: 'common.latitude-label',
  altitude: 'common.altitude-label',
  azimuth: 'common.azimuth-label',
  method: 'field-measuring.report.method',
  leftSupport: 'common.left-support-label',
  measuredLength: 'field-measuring.report.measured-length',
  calculatedLength: 'field-measuring.report.calculated-length',
  measuredElevation: 'field-measuring.report.measured-elevation',
  calculatedElevation: 'field-measuring.report.calculated-elevation',
  parameter: 'common.parameter-label',
  uncertainty: 'common.uncertainty-parameter-label',
  criterion: 'common.criterion-label',
  parameter12: 'field-measuring.papoto.parameter-1-2-label',
  parameter23: 'field-measuring.papoto.parameter-2-3-label',
  parameter13: 'field-measuring.papoto.parameter-1-3-label',
  verticalDistanceLeft: 'field-measuring.report.vertical-distance-left',
  horizontalDistanceLeft: 'field-measuring.report.horizontal-distance-left',
  verticalAngleLeft: 'field-measuring.report.vertical-angle-left',
  verticalAngleRight: 'field-measuring.report.vertical-angle-right',
  calculationType: 'field-measuring.report.calculation-type',
  tangentAngle: 'common.tangent-angle-label',
  sightsLength: 'field-measuring.report.sights-length',
  sightsElevation: 'field-measuring.report.sights-elevation',
  sightX: 'field-measuring.report.sight-x',
  sightY: 'field-measuring.report.sight-y',
  transit: 'field-measuring.temperature-calculation.transit-label',
  windIncidence: 'field-measuring.report.wind-incidence',
  measuredSolarFlux: 'field-measuring.report.measured-solar-flux',
  diffuseSolarFlux: 'field-measuring.temperature-calculation.diffuse-solar-radiation-label',
  directSolarFlux: 'field-measuring.temperature-calculation.beam-solar-radiation-label',
  diffusePlusDirectSolarFlux: 'field-measuring.temperature-calculation.diffuse-plus-beam-label',
  cableTemperature: 'field-measuring.shared.cable-temperature-label',
  temperatureUncertainty: 'field-measuring.report.temperature-uncertainty',
  cableSolarFlux: 'field-measuring.temperature-calculation.solar-flux-on-cable-label',
  updateMode: 'field-measuring.parameter-calculation-15.update-mode-label',
  parameter15C: 'field-measuring.parameter-calculation-15.parameter-15c-label',
  parameter15CMinus: 'field-measuring.parameter-calculation-15.parameter-15c-minus-label',
  parameter15CPlus: 'field-measuring.parameter-calculation-15.parameter-15c-plus-label'
} as const;

/** Display value of the "Update values" choice of the 15°C tab. */
export const UPDATE_MODE_VALUE_KEYS: Record<FieldMeasure['updateMode15C'], string> = {
  auto: 'common.auto-label',
  manual: 'field-measuring.parameter-calculation-15.manual-option'
};

/** Display value of the calculation type of the tangent aiming methods. */
export const CALCULATION_TYPE_VALUE_KEYS: Record<FieldMeasure['calculationType'], string> = {
  parametre: 'common.parameter-label',
  tangente: 'common.tangent-angle-label'
};

/** Method label of each parameter calculation method (the tangent aiming ones name their sub-method). */
export const METHOD_VALUE_KEYS: Record<FieldMeasure['calculationMethod'], string> = {
  papoto: 'common.papoto-label',
  pep: 'common.pep-label',
  'tangente-aiming': 'field-measuring.calculus-setting.tangent-aiming-radio-label',
  'tangente-aiming-exterior': 'field-measuring.calculus-setting.tangent-aiming-exterior-radio-label',
  'tangente-aiming-interior': 'field-measuring.calculus-setting.tangent-aiming-interior-radio-label'
};

/** Decimal places of each displayed quantity (US.MES.RAP). */
export const DECIMALS = {
  ambientTemperature: 0,
  windSpeed: 1,
  coordinate: 7,
  altitude: 2,
  azimuth: 0,
  length: 2,
  tangentAngle: 0,
  gradAngle: 3,
  parameter: 0,
  electric: 0
} as const;

/** Factor converting km/h to m/s. */
export const KMH_TO_MS = 1 / 3.6;

/** Fields read for each tangent aiming sub-method; the interior form works like the exterior one. */
export const TANGENT_AIMING_REPORT_CONFIGS: Record<
  'tangente-aiming' | 'tangente-aiming-exterior' | 'tangente-aiming-interior',
  TangentAimingReportConfig
> = {
  'tangente-aiming': {
    leftSupport: 'tangentLeftSupport',
    spanLength: 'tangentSpanLength',
    distance: 'cableHAccDistance',
    distanceLabelKey: LABEL_KEYS.verticalDistanceLeft,
    verticalAngleLeft: null,
    verticalAngleRight: 'cableVerticalAccAngle',
    calculationType: 'calculationType',
    parameter: 'cableParameter',
    tangentAngle: 'cableTangentAngle',
    output: 'tangentAimingSupport'
  },
  'tangente-aiming-exterior': {
    leftSupport: 'exteriorLeftSupport',
    spanLength: 'exteriorSpanLength',
    distance: 'exteriorHAccDistance',
    distanceLabelKey: LABEL_KEYS.horizontalDistanceLeft,
    verticalAngleLeft: 'exteriorVerticalAccAngleLeft',
    verticalAngleRight: 'exteriorVerticalAccAngleRight',
    calculationType: 'exteriorCalculationType',
    parameter: 'exteriorParameter',
    tangentAngle: 'exteriorTangentAngle',
    output: 'tangentAimingExterior'
  },
  'tangente-aiming-interior': {
    leftSupport: 'interiorLeftSupport',
    spanLength: 'interiorSpanLength',
    distance: 'interiorHAccDistance',
    distanceLabelKey: LABEL_KEYS.horizontalDistanceLeft,
    verticalAngleLeft: 'interiorVerticalAccAngleLeft',
    verticalAngleRight: 'interiorVerticalAccAngleRight',
    calculationType: 'interiorCalculationType',
    parameter: 'interiorParameter',
    tangentAngle: 'interiorTangentAngle',
    output: 'tangentAimingInterior'
  }
};
