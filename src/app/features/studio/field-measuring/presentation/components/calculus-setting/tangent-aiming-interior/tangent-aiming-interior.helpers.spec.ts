import { createTestMeasureData } from '@features/studio/field-measuring/presentation/helpers';
import {
  applyTangentAimingInteriorDefaults,
  calculateTangentAimingInteriorMock,
  createTangentAimingInteriorForm,
  invalidateTangentAimingInteriorResult,
  isTangentAimingInteriorDataValid,
  toTangentAimingInteriorInputs
} from './tangent-aiming-interior.helpers';
import { TANGENT_AIMING_INTERIOR_FIELD_RULES } from './tangent-aiming-interior.constantes';
import { TANGENT_AIMING_SUPPORT_FIELD_RULES } from '../tangent-aiming-support/tangent-aiming-support.constantes';

describe('tangent-aiming-interior helpers', () => {
  it('should create an invalid form with every control empty', () => {
    const form = createTangentAimingInteriorForm();
    expect(form.valid).toBe(false);
    expect(Object.values(form.getRawValue()).every((value) => value === null)).toBe(true);
  });

  it('should reuse the support rules except for the horizontal distance (RG.VIS-INT.DIS-HSG.1)', () => {
    expect(TANGENT_AIMING_INTERIOR_FIELD_RULES.verticalAccAngleLeft).toBe(
      TANGENT_AIMING_INTERIOR_FIELD_RULES.verticalAccAngleRight
    );
    expect(TANGENT_AIMING_INTERIOR_FIELD_RULES.parameter).toBe(TANGENT_AIMING_SUPPORT_FIELD_RULES.cableParameter);
    expect(TANGENT_AIMING_INTERIOR_FIELD_RULES.hAccDistance).toEqual({ min: 0, max: 5000, decimals: 2, default: 0 });
    expect(TANGENT_AIMING_SUPPORT_FIELD_RULES.cableHAccDistance.max).toBe(1000);
  });

  it('should accept a horizontal distance up to 5000 and reject more', () => {
    const form = createTangentAimingInteriorForm();
    form.controls.hAccDistance.setValue(5000);
    expect(form.controls.hAccDistance.valid).toBe(true);
    form.controls.hAccDistance.setValue(5000.01);
    expect(form.controls.hAccDistance.valid).toBe(false);
  });

  it('should be valid once every control is filled', () => {
    const form = createTangentAimingInteriorForm();
    form.patchValue({
      leftSupport: '0',
      spanLength: 100,
      hAccDistance: 10,
      verticalAccAngleLeft: 5,
      verticalAccAngleRight: 6,
      parameter: 1000
    });
    expect(form.valid).toBe(true);
  });

  describe('measure helpers', () => {
    it('should fill empty fields with defaults and keep existing values', () => {
      const data = {
        ...createTestMeasureData(),
        interiorHAccDistance: 7,
        interiorParameter: undefined as unknown as null
      };
      expect(applyTangentAimingInteriorDefaults(data, '2')).toMatchObject({
        interiorLeftSupport: '2',
        interiorSpanLength: 0,
        interiorHAccDistance: 7,
        interiorVerticalAccAngleLeft: 0,
        interiorVerticalAccAngleRight: 0,
        interiorParameter: 20
      });
    });

    it('should not override an already chosen left support', () => {
      const data = { ...createTestMeasureData(), interiorLeftSupport: '1' };
      expect(applyTangentAimingInteriorDefaults(data, '2').interiorLeftSupport).toBe('1');
    });

    it('should not touch the support or exterior fields', () => {
      const data = { ...createTestMeasureData(), cableHAccDistance: 3, exteriorLeftSupport: '4' };
      expect(applyTangentAimingInteriorDefaults(data, '2')).toMatchObject({
        cableHAccDistance: 3,
        exteriorLeftSupport: '4'
      });
    });

    it('should be valid only when every field is filled and in range', () => {
      const data = applyTangentAimingInteriorDefaults(createTestMeasureData(), '0');
      expect(isTangentAimingInteriorDataValid(data)).toBe(true);
      expect(isTangentAimingInteriorDataValid({ ...data, interiorLeftSupport: null })).toBe(false);
      expect(isTangentAimingInteriorDataValid({ ...data, interiorParameter: null })).toBe(false);
      expect(isTangentAimingInteriorDataValid({ ...data, interiorParameter: 19 })).toBe(false);
      expect(isTangentAimingInteriorDataValid({ ...data, interiorHAccDistance: 5000 })).toBe(true);
      expect(isTangentAimingInteriorDataValid({ ...data, interiorHAccDistance: 5001 })).toBe(false);
    });

    it('should clear the interior result and the automatic 15°C result', () => {
      const data = applyTangentAimingInteriorDefaults(createTestMeasureData({ updateMode15C: 'auto' }), '0');
      const withOutputs = {
        ...data,
        outputs: {
          ...data.outputs,
          tangentAimingInterior: { parameter: 1, uncertainty: 1, criterion: 1, checkValidity: true },
          parameter15C: { parameter15CMinusUncertainty: 1, parameter15C: 2, parameter15CPlusUncertainty: 3 }
        }
      };
      const result = invalidateTangentAimingInteriorResult(withOutputs);
      expect(result.outputs.tangentAimingInterior).toBeNull();
      expect(result.outputs.parameter15C).toBeNull();
    });

    it('should build the calculation inputs and return the mocked result', async () => {
      const data = applyTangentAimingInteriorDefaults(createTestMeasureData(), '3');
      const inputs = toTangentAimingInteriorInputs(data);
      expect(inputs).toEqual({
        leftSupport: '3',
        spanLength: 0,
        hAccDistance: 0,
        verticalAccAngleLeft: 0,
        verticalAccAngleRight: 0,
        parameter: 20
      });
      expect(await calculateTangentAimingInteriorMock(inputs)).toEqual({
        result: { parameter: 1000, uncertainty: 1.5, criterion: 1, checkValidity: true },
        error: null
      });
    });
  });
});
