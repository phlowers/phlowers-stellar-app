import { createTestMeasureData } from '@features/studio/field-measuring/presentation/helpers';
import {
  applyTangentAimingSupportDefaults,
  buildCantonSupportOptions,
  calculateTangentAimingSupportMock,
  createTangentAimingSupportForm,
  getDefaultLeftSupport,
  getDisplayedInputFields,
  isTangentAimingSupportDataValid,
  resetNonDisplayedParameterFields,
  syncDisplayedControls,
  toTangentAimingSupportInputs
} from './tangent-aiming-support.helpers';

describe('tangent-aiming-support helpers', () => {
  it('should build options for every support with a 5-character label', () => {
    expect(buildCantonSupportOptions([{ number: 'ABCDEFG' }, { number: null }])).toEqual([
      { label: 'ABCDE', value: '0' },
      { label: '-', value: '1' }
    ]);
  });

  it('should default the left support to the first support of the span', () => {
    expect(getDefaultLeftSupport([3, 4])).toBe('3');
    expect(getDefaultLeftSupport([])).toBeNull();
    expect(getDefaultLeftSupport(null)).toBeNull();
  });

  it('should list the displayed fields by calculation type', () => {
    expect(getDisplayedInputFields('parametre')).toContain('cableParameter');
    expect(getDisplayedInputFields('parametre')).not.toContain('cableTangentAngle');
    expect(getDisplayedInputFields('tangente')).toContain('cableTangentAngle');
    expect(getDisplayedInputFields('tangente')).not.toContain('cableParameter');
  });

  it('should disable only the hidden control', () => {
    const form = createTangentAimingSupportForm();
    syncDisplayedControls(form, 'parametre');
    expect(form.controls.cableTangentAngle.disabled).toBe(true);
    expect(form.controls.cableParameter.enabled).toBe(true);
    syncDisplayedControls(form, 'tangente');
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
      calculationType: 'parametre'
    });
  });

  it('should not override an already chosen left support', () => {
    const data = { ...createTestMeasureData(), tangentLeftSupport: '5' };
    expect(applyTangentAimingSupportDefaults(data, '2').tangentLeftSupport).toBe('5');
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
      expect(isTangentAimingSupportDataValid({ ...valid, cableParameter: 19 })).toBe(false);
      expect(isTangentAimingSupportDataValid({ ...valid, cableParameter: 20.5 })).toBe(false);
      expect(isTangentAimingSupportDataValid({ ...valid, tangentSpanLength: 5001 })).toBe(false);
      expect(isTangentAimingSupportDataValid({ ...valid, cableHAccDistance: 1.234 })).toBe(false);
    });

    it('should ignore the hidden field', () => {
      expect(isTangentAimingSupportDataValid({ ...valid, cableTangentAngle: 999 })).toBe(true);
      expect(isTangentAimingSupportDataValid({ ...valid, calculationType: 'tangente', cableParameter: 1 })).toBe(true);
      expect(isTangentAimingSupportDataValid({ ...valid, calculationType: 'tangente', cableTangentAngle: 999 })).toBe(
        false
      );
    });
  });

  it('should map the measure to calculation inputs', () => {
    const data = { ...createTestMeasureData(), tangentLeftSupport: '1', cableParameter: 30 };
    expect(toTangentAimingSupportInputs(data)).toMatchObject({ leftSupport: '1', parameter: 30 });
  });

  it('should return a constant mock result', async () => {
    const { result, error } = await calculateTangentAimingSupportMock(
      toTangentAimingSupportInputs(createTestMeasureData())
    );
    expect(error).toBeNull();
    expect(result?.checkValidity).toBe(true);
  });
});
