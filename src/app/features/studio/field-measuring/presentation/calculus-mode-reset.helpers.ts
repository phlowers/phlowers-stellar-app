import { FieldMeasure } from '@features/studio/field-measuring/domain/types';
import { TANGENT_AIMING_SUPPORT_FIELD_RULES as RULES } from './components/calculus-setting/tangent-aiming-support/tangent-aiming-support.constantes';
import { TANGENT_AIMING_EXTERIOR_FIELD_RULES as EXTERIOR_RULES } from './components/calculus-setting/tangent-aiming-exterior/tangent-aiming-exterior.constantes';
import { TANGENT_AIMING_INTERIOR_FIELD_RULES as INTERIOR_RULES } from '@features/studio/field-measuring/presentation/components/calculus-setting/tangent-aiming-interior/tangent-aiming-interior.constantes';
import { PAPOTO_INPUT_DEFAULTS, PEP_INPUT_DEFAULTS } from './helpers';
import { CalculusModeResetContext } from './calculus-mode-reset.interfaces';

type CalculationMethod = FieldMeasure['calculationMethod'];

const EXTERIOR_DEFAULTS = {
  exteriorSpanLength: EXTERIOR_RULES.spanLength.default,
  exteriorHAccDistance: EXTERIOR_RULES.hAccDistance.default,
  exteriorVerticalAccAngleLeft: EXTERIOR_RULES.verticalAccAngleLeft.default,
  exteriorVerticalAccAngleRight: EXTERIOR_RULES.verticalAccAngleRight.default,
  exteriorParameter: EXTERIOR_RULES.parameter.default,
  exteriorTangentAngle: EXTERIOR_RULES.tangentAngle.default,
  exteriorCalculationType: 'parametre' as const
};

const INTERIOR_DEFAULTS = {
  interiorSpanLength: INTERIOR_RULES.spanLength.default,
  interiorHAccDistance: INTERIOR_RULES.hAccDistance.default,
  interiorVerticalAccAngleLeft: INTERIOR_RULES.verticalAccAngleLeft.default,
  interiorVerticalAccAngleRight: INTERIOR_RULES.verticalAccAngleRight.default,
  interiorParameter: INTERIOR_RULES.parameter.default,
  interiorTangentAngle: INTERIOR_RULES.tangentAngle.default,
  interiorCalculationType: 'parametre' as const
};

/** Resets each calculus mode (inputs and outputs) to its defaults. Typed on every method so a new one requires a resetter. */
export const CALCULUS_MODE_RESETTERS: Record<
  CalculationMethod,
  (data: FieldMeasure, context: CalculusModeResetContext) => FieldMeasure
> = {
  papoto: (data) => ({
    ...data,
    ...PAPOTO_INPUT_DEFAULTS,
    outputs: { ...data.outputs, papoto: null }
  }),
  'tangente-aiming': (data, context) => ({
    ...data,
    tangentLeftSupport: context.defaultTangentLeftSupport,
    tangentSpanLength: RULES.tangentSpanLength.default,
    cableHAccDistance: RULES.cableHAccDistance.default,
    cableVerticalAccAngle: RULES.cableVerticalAccAngle.default,
    cableParameter: RULES.cableParameter.default,
    cableTangentAngle: RULES.cableTangentAngle.default,
    calculationType: 'parametre',
    outputs: { ...data.outputs, tangentAimingSupport: null }
  }),
  'tangente-aiming-exterior': (data, context) => ({
    ...data,
    ...EXTERIOR_DEFAULTS,
    exteriorLeftSupport: context.defaultTangentLeftSupport,
    outputs: { ...data.outputs, tangentAimingExterior: null }
  }),
  'tangente-aiming-interior': (data, context) => ({
    ...data,
    ...INTERIOR_DEFAULTS,
    interiorLeftSupport: context.defaultTangentLeftSupport,
    outputs: { ...data.outputs, tangentAimingInterior: null }
  }),
  pep: (data) => ({ ...data, ...PEP_INPUT_DEFAULTS })
};

/**
 * Resets every calculus mode other than the active one to its defaults.
 * @param measureData - The measure to clean
 * @param activeMethod - The active calculus mode, left untouched
 * @param context - Defaults needed by the resetters
 * @returns The measure with inactive modes reset
 */
export const resetInactiveCalculusModes = (
  measureData: FieldMeasure,
  activeMethod: CalculationMethod,
  context: CalculusModeResetContext
): FieldMeasure =>
  (Object.keys(CALCULUS_MODE_RESETTERS) as CalculationMethod[])
    .filter((method) => method !== activeMethod)
    .reduce((data, method) => CALCULUS_MODE_RESETTERS[method](data, context), measureData);
