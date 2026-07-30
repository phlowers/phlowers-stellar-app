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
    absolute: transloco.translate('studio.shared.altitude-type-absolute'),
    relative: transloco.translate('studio.shared.altitude-type-relative'),
    relative_cable: transloco.translate('studio.shared.altitude-type-relative-cable')
  };
}

/**
 * Built as a function (rather than a module-level constant) because the labels depend on
 * `TranslocoService`, which requires an Angular injection context and cannot be used at module
 * scope.
 */
export function getLateralDistanceTypeLabels(transloco: TranslocoService): Record<string, string> {
  return {
    SPAN_AXIS: transloco.translate('studio.shared.span-axis-option')
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
      label: transloco.translate('studio.conformity.cable-altitude-label'),
      overhangKey: 'overhangCableAltitude',
      lateralKey: 'lateralCableAltitude',
      unit: 'm'
    },
    {
      label: transloco.translate('studio.conformity.cable-line-axis-distance-label'),
      overhangKey: 'overhangCableLineAxisDistance',
      lateralKey: 'lateralCableLineAxisDistance',
      unit: 'm'
    },
    {
      label: transloco.translate('studio.conformity.distance-to-comply-label'),
      overhangKey: 'overhangDistanceToComply',
      lateralKey: 'lateralDistanceToComply',
      unit: 'm'
    },
    {
      label: transloco.translate('studio.conformity.compliance-altitude-label'),
      overhangKey: 'overhangComplianceAltitude',
      lateralKey: null,
      unit: 'm'
    },
    {
      label: transloco.translate('studio.conformity.compliance-line-axis-distance-label'),
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
      label: transloco.translate('studio.conformity.temperature-label'),
      overhangKey: 'overhangTemperature',
      lateralKey: 'lateralTemperature',
      unit: '°C'
    },
    {
      label: transloco.translate('studio.conformity.wind-pressure-label'),
      overhangKey: 'overhangWindPressure',
      lateralKey: 'lateralWindPressure',
      unit: 'Pa'
    },
    {
      label: transloco.translate('studio.conformity.minimal-distance-label'),
      overhangKey: 'overhangMinimalDistance',
      lateralKey: 'lateralMinimalDistance',
      unit: 'm'
    }
  ];
}
