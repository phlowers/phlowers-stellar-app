import { createTestMeasureData } from '@features/studio/field-measuring/presentation/helpers';
import { syncDisplayedControls } from '../tangent-aiming-common/tangent-aiming-common.helpers';
import {
  applyTangentAimingSupportDefaults,
  createTangentAimingSupportForm,
  getDisplayedInputFields,
  invalidateTangentAimingSupportResult,
  isTangentAimingSupportDataValid,
  resetNonDisplayedParameterFields,
  toTangentAimingSupportInputs,
  toTangentAimingTaskInputs
} from './tangent-aiming-support.helpers';

describe('tangent-aiming-support helpers', () => {
  it('should list the displayed fields by calculation type', () => {
    expect(getDisplayedInputFields('parametre')).toContain('cableParameter');
    expect(getDisplayedInputFields('parametre')).not.toContain('cableTangentAngle');
    expect(getDisplayedInputFields('tangente')).toContain('cableTangentAngle');
    expect(getDisplayedInputFields('tangente')).not.toContain('cableParameter');
  });

  it('should disable only the hidden control', () => {
    const form = createTangentAimingSupportForm();
    syncDisplayedControls(form, getDisplayedInputFields('parametre'));
    expect(form.controls.cableTangentAngle.disabled).toBe(true);
    expect(form.controls.cableParameter.enabled).toBe(true);
    syncDisplayedControls(form, getDisplayedInputFields('tangente'));
    expect(form.controls.cableTangentAngle.enabled).toBe(true);
    expect(form.controls.cableParameter.disabled).toBe(true);
  });

  it('should fill empty fields with defaults and keep existing values', () => {
    const data = { ...createTestMeasureData(), cableHAccDistance: 7, cableParameter: undefined as unknown as null };
    const result = applyTangentAimingSupportDefaults(data, '2');
    expect(result).toMatchObject({
      tangentLeftSupport: '2',
      tangentSpanLength: 0,
      cableHAccDistance: 7,
      cableVerticalAccAngle: 0,
      cableParameter: 20,
      cableTangentAngle: 0,
      calculationType: 'tangente'
    });
  });

  it('should force the tangente calculation type, the only one supported', () => {
    const data = { ...createTestMeasureData(), calculationType: 'parametre' as const, cableParameter: 1500 };
    expect(applyTangentAimingSupportDefaults(data, '0')).toMatchObject({
      calculationType: 'tangente',
      cableParameter: 1500
    });
  });

  it('should not override an already chosen left support', () => {
    const data = { ...createTestMeasureData(), tangentLeftSupport: '5' };
    expect(applyTangentAimingSupportDefaults(data, '2').tangentLeftSupport).toBe('5');
  });

  it('should clear the support result and automatic 15°C result without changing other outputs', () => {
    const data = createTestMeasureData({ updateMode15C: 'auto' });
    const withOutputs = {
      ...data,
      outputs: {
        ...data.outputs,
        tangentAimingSupport: { parameter: 1, uncertainty: 1, criterion: 1, checkValidity: true },
        parameter15C: { parameter15CMinusUncertainty: 1, parameter15C: 2, parameter15CPlusUncertainty: 3 },
        papoto: { parameter: 4, uncertainty: 5 }
      }
    };

    const result = invalidateTangentAimingSupportResult(withOutputs);

    expect(result.outputs.tangentAimingSupport).toBeNull();
    expect(result.outputs.parameter15C).toBeNull();
    expect(result.outputs.papoto).toEqual({ parameter: 4, uncertainty: 5 });
  });

  it('should keep a manual 15°C result when clearing the support result', () => {
    const data = createTestMeasureData({ updateMode15C: 'manual' });
    const parameter15C = { parameter15CMinusUncertainty: 1, parameter15C: 2, parameter15CPlusUncertainty: 3 };
    const withOutputs = {
      ...data,
      outputs: {
        ...data.outputs,
        tangentAimingSupport: { parameter: 1, uncertainty: 1, criterion: 1, checkValidity: true },
        parameter15C
      }
    };

    const result = invalidateTangentAimingSupportResult(withOutputs);

    expect(result.outputs.tangentAimingSupport).toBeNull();
    expect(result.outputs.parameter15C).toBe(parameter15C);
  });

  it('should reset only the hidden numeric field', () => {
    const base = { ...createTestMeasureData(), cableParameter: 100, cableTangentAngle: 5 };
    expect(resetNonDisplayedParameterFields({ ...base, calculationType: 'parametre' })).toMatchObject({
      cableParameter: 100,
      cableTangentAngle: null
    });
    expect(resetNonDisplayedParameterFields({ ...base, calculationType: 'tangente' })).toMatchObject({
      cableParameter: null,
      cableTangentAngle: 5
    });
  });

  describe('isTangentAimingSupportDataValid', () => {
    const valid = applyTangentAimingSupportDefaults(createTestMeasureData(), '0');

    it('should accept the defaults', () => {
      expect(isTangentAimingSupportDataValid(valid)).toBe(true);
    });

    it('should reject missing data', () => {
      expect(isTangentAimingSupportDataValid(createTestMeasureData())).toBe(false);
    });

    it('should reject out-of-bound or too precise values', () => {
      expect(isTangentAimingSupportDataValid({ ...valid, cableTangentAngle: 201 })).toBe(false);
      expect(isTangentAimingSupportDataValid({ ...valid, cableTangentAngle: 1.234 })).toBe(false);
      expect(isTangentAimingSupportDataValid({ ...valid, calculationType: 'parametre', cableParameter: 19 })).toBe(
        false
      );
      expect(isTangentAimingSupportDataValid({ ...valid, calculationType: 'parametre', cableParameter: 20.5 })).toBe(
        false
      );
      expect(isTangentAimingSupportDataValid({ ...valid, tangentSpanLength: 5001 })).toBe(false);
      expect(isTangentAimingSupportDataValid({ ...valid, cableHAccDistance: 1.234 })).toBe(false);
    });

    it('should ignore the hidden field', () => {
      expect(isTangentAimingSupportDataValid({ ...valid, cableParameter: 1 })).toBe(true);
      expect(isTangentAimingSupportDataValid({ ...valid, cableTangentAngle: 999 })).toBe(false);
      expect(isTangentAimingSupportDataValid({ ...valid, calculationType: 'parametre', cableTangentAngle: 999 })).toBe(
        true
      );
    });
  });

  it('should map the measure to calculation inputs', () => {
    const data = { ...createTestMeasureData(), tangentLeftSupport: '1', cableParameter: 30 };
    expect(toTangentAimingSupportInputs(data)).toMatchObject({ leftSupport: '1', parameter: 30 });
  });

  it('should map the measure to the tangent aiming task inputs (sighting device below the left support)', () => {
    const inputs = toTangentAimingSupportInputs({
      ...createTestMeasureData(),
      tangentSpanLength: 400,
      cableHAccDistance: 10,
      cableVerticalAccAngle: 98.4,
      cableTangentAngle: 100
    });
    expect(toTangentAimingTaskInputs(inputs)).toEqual({
      angleToCableTangent: 100,
      angleToLeftSupport: 0,
      angleToRightSupport: 98.4,
      spanLength: 400,
      inputHeight: 10,
      distance: 0
    });
  });
});
