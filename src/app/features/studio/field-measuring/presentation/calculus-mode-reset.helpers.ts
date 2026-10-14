import { FieldMeasure } from '@features/studio/field-measuring/domain/types';
import { applyTangentAimingSupportDefaults } from './components/calculus-setting/tangent-aiming-support/tangent-aiming-support.helpers';
import { PAPOTO_INPUT_DEFAULTS, PEP_INPUT_DEFAULTS } from './helpers';
import { CalculusModeResetContext } from './calculus-mode-reset.interfaces';

type CalculationMethod = FieldMeasure['calculationMethod'];

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
  'tangente-aiming': (data, context) =>
    applyTangentAimingSupportDefaults(
      {
        ...data,
        tangentLeftSupport: null,
        tangentSpanLength: null,
        cableHAccDistance: null,
        cableVerticalAccAngle: null,
        cableParameter: null,
        cableTangentAngle: null,
        calculationType: 'parametre',
        outputs: { ...data.outputs, tangentAimingSupport: null }
      },
      context.defaultTangentLeftSupport
    ),
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
