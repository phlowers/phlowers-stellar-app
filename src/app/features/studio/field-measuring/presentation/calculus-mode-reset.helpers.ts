import { omit } from 'lodash';
import { FieldMeasure } from '@features/studio/field-measuring/domain/types';
import { TANGENT_AIMING_SUPPORT_FIELD_RULES as RULES } from './components/calculus-setting/tangent-aiming-support/tangent-aiming-support.constantes';
import { TANGENT_AIMING_EXTERIOR_FIELD_RULES as EXTERIOR_RULES } from './components/calculus-setting/tangent-aiming-exterior/tangent-aiming-exterior.constantes';
import { TANGENT_AIMING_INTERIOR_FIELD_RULES as INTERIOR_RULES } from '@features/studio/field-measuring/presentation/components/calculus-setting/tangent-aiming-interior/tangent-aiming-interior.constantes';
import { applyTangentAimingSupportDefaults } from './components/calculus-setting/tangent-aiming-support/tangent-aiming-support.helpers';
import { applyTangentAimingExteriorDefaults } from './components/calculus-setting/tangent-aiming-exterior/tangent-aiming-exterior.helpers';
import { applyTangentAimingInteriorDefaults } from './components/calculus-setting/tangent-aiming-interior/tangent-aiming-interior.helpers';
import { clearAutoParameter15C, PAPOTO_INPUT_DEFAULTS, PEP_INPUT_DEFAULTS } from './helpers';
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

/**
 * Projection of a measure used to detect unsaved changes: selecting a calculus mode is a choice, not an edit, so the
 * selected method, the defaults the selection fills in and the stale automatic 15°C result it clears are neutralized.
 * @param measureData - The measure to project
 * @param defaultLeftSupport - Default left support of the tangent aiming modes
 * @returns The measure as it compares, whatever the selected calculus mode
 */
export const toUnsavedChangesComparable = (
  measureData: FieldMeasure,
  defaultLeftSupport: string | null
): Omit<FieldMeasure, 'calculationMethod'> => {
  return omit(
    clearAutoParameter15C(
      applyTangentAimingInteriorDefaults(
        applyTangentAimingExteriorDefaults(
          applyTangentAimingSupportDefaults(measureData, defaultLeftSupport),
          defaultLeftSupport
        ),
        defaultLeftSupport
      )
    ),
    'calculationMethod'
  );
};
