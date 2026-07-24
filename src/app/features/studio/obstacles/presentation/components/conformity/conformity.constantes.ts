import { TranslocoService } from '@jsverse/transloco';
import { ResultRow } from './conformity.model';

export const CONFORMITY_BOUNDS = {
  repartitionTemperature: { step: 0.01, min: 0, max: 250 },
  lateralDistanceTemperature: { step: 0.01, min: 0, max: 250 }
} as const;

/**
 * Built as a function (rather than a module-level constant) because the labels depend on
 * `TranslocoService`, which requires an Angular injection context and cannot be used at module
 * scope.
 */
export function getAltitudeTypeLabels(transloco: TranslocoService): Record<string, string> {
  return {
    absolute: transloco.translate('studio.shared.altitudeTypeAbsolute'),
    relative: transloco.translate('studio.shared.altitudeTypeRelative'),
    relative_cable: transloco.translate('studio.shared.altitudeTypeRelativeCable')
  };
}

/**
 * Built as a function (rather than a module-level constant) because the labels depend on
 * `TranslocoService`, which requires an Angular injection context and cannot be used at module
 * scope.
 */
export function getLateralDistanceTypeLabels(transloco: TranslocoService): Record<string, string> {
  return {
    SPAN_AXIS: transloco.translate('studio.shared.spanAxisOption')
  };
}

/**
 * Built as a function (rather than a module-level constant) because the labels depend on
 * `TranslocoService`, which requires an Angular injection context and cannot be used at module
 * scope.
 */
export function getConformityCommonRows(transloco: TranslocoService): ResultRow[] {
  return [
    {
      label: transloco.translate('studio.conformity.cableAltitudeLabel'),
      overhangKey: 'overhangCableAltitude',
      lateralKey: 'lateralCableAltitude',
      unit: 'm'
    },
    {
      label: transloco.translate('studio.conformity.cableLineAxisDistanceLabel'),
      overhangKey: 'overhangCableLineAxisDistance',
      lateralKey: 'lateralCableLineAxisDistance',
      unit: 'm'
    },
    {
      label: transloco.translate('studio.conformity.distanceToComplyLabel'),
      overhangKey: 'overhangDistanceToComply',
      lateralKey: 'lateralDistanceToComply',
      unit: 'm'
    },
    {
      label: transloco.translate('studio.conformity.complianceAltitudeLabel'),
      overhangKey: 'overhangComplianceAltitude',
      lateralKey: null,
      unit: 'm'
    },
    {
      label: transloco.translate('studio.conformity.complianceLineAxisDistanceLabel'),
      overhangKey: null,
      lateralKey: 'lateralComplianceLineAxisDistance',
      unit: 'm'
    }
  ];
}

/**
 * Built as a function (rather than a module-level constant) because the labels depend on
 * `TranslocoService`, which requires an Angular injection context and cannot be used at module
 * scope.
 */
export function getConformityCableTrackRows(transloco: TranslocoService): ResultRow[] {
  return [
    {
      label: transloco.translate('studio.conformity.temperatureLabel'),
      overhangKey: 'overhangTemperature',
      lateralKey: 'lateralTemperature',
      unit: '°C'
    },
    {
      label: transloco.translate('studio.conformity.windPressureLabel'),
      overhangKey: 'overhangWindPressure',
      lateralKey: 'lateralWindPressure',
      unit: 'Pa'
    },
    {
      label: transloco.translate('studio.conformity.minimalDistanceLabel'),
      overhangKey: 'overhangMinimalDistance',
      lateralKey: 'lateralMinimalDistance',
      unit: 'm'
    }
  ];
}
